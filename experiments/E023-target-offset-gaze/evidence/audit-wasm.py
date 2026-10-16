import json,hashlib,math,subprocess
from pathlib import Path

SOURCE_COMMIT='fd49f79b24c20583a6bd9d5e9f07d14d0937b68d'
RUN_ID='WASM-2026-10-16T07-46-32-258Z'
DEPENDENCY_TREE_SHA256='ddf57ff8eeb7942c197e8c12eea145bd4fa894ff0a6fb0d40302dc5953d7159d'

def verify_sources(root,hashes,source_commit=SOURCE_COMMIT):
 # Tooling has evolved; bind historical evidence to immutable implementation blobs.
 repo=root.parent.parent
 for file,expected in hashes.items():
  blob=subprocess.check_output(['git','show',f'{source_commit}:experiments/E023-target-offset-gaze/{file}'],cwd=repo)
  assert hashlib.sha256(blob).hexdigest()==expected, f'recorded source mismatch: {file}'

def verify_build(root,report,inputs):
 build=report.get('build')
 assert build and build.get('kind')=='clean build immediately before preview', 'source-bound build manifest required'
 sources=build['sourcesSha256']; dist=build['distSha256']
 dependencies=build.get('dependencies')
 assert dependencies and dependencies.get('command')==['npm','ci','--ignore-scripts','--no-audit','--no-fund'], 'clean dependency install attestation required'
 assert dependencies['lockSha256']==sources['web/package-lock.json'], 'dependency lock mismatch'
 assert dependencies['installedTreeSha256']==DEPENDENCY_TREE_SHA256, 'dependency tree mismatch'
 assert dependencies['preparedEmptyDirectories']==['.vite-temp'], 'dependency baseline setup mismatch'

 assert sources==inputs['sha256'], 'source-inputs/build manifest mismatch'
 prefix='experiments/E023-target-offset-gaze/'
 repo=root.parent.parent
 tracked=subprocess.check_output(['git','ls-tree','-r','--name-only',SOURCE_COMMIT,'--',prefix],cwd=repo,text=True).splitlines()
 explicit={'web/package.json','web/package-lock.json','web/vite.config.ts','web/tsconfig.json','web/index.html','server/pyproject.toml','server/uv.lock'}
 required={f[len(prefix):] for f in tracked if f[len(prefix):].startswith(('web/src/','web/scripts/','mod/')) or (f[len(prefix):].startswith('server/') and f.endswith('.py'))}|explicit
 actual={f for f in sources if not f.startswith('web/generated/public/')}
 assert actual==required, 'incomplete recorded source set'
 verify_sources(root,{f:sources[f] for f in actual})
 public={f.removeprefix('web/generated/public/'):h for f,h in sources.items() if f.startswith('web/generated/public/')}
 assets={'assets/'+f:h for f,h in report['bundleSha256'].items()}
 assert public and any(f.endswith('.js') for f in assets) and any(f.endswith('.css') for f in assets) and set(dist)==set(public)|set(assets)|{'index.html'}, 'incomplete dist manifest'
 assert all(dist[f]==h for f,h in (public|assets).items()), 'bundle/public hash mismatch'
 pin=json.loads(subprocess.check_output(['git','show',f'{SOURCE_COMMIT}:{prefix}web/src/runtime-pin.json'],cwd=repo))
 assert build['vendorSourceCommit']==pin['sourceCommit']==report['provenance']['sourceCommit'], 'vendor pin mismatch'
 gitlink=subprocess.check_output(['git','rev-parse',f'{SOURCE_COMMIT}:vendor/stack-chan'],cwd=repo,text=True).strip()
 assert gitlink==pin['sourceCommit'], 'vendor gitlink mismatch'
 for file,digest in pin['hashes'].items():
  assert report['provenance']['hashes'][file]==dist['simulator/'+file]==digest, 'runtime pin mismatch'
 assert dist['coami-mod.xsa']==report['provenance']['hashes']['coami-mod.xsa'], 'MOD archive mismatch'
 provenance_bytes=(json.dumps(report['provenance'],indent=2)+'\n').encode()
 assert hashlib.sha256(provenance_bytes).hexdigest()==dist['runtime-provenance.json'], 'runtime provenance bytes mismatch'
 for file,digest in report['provenance']['sources'].items():
  if file.startswith('mod/'):
   assert sources[file]==digest, 'MOD source mismatch'
  else:
   assert file.startswith('vendor/web/'), 'unexpected vendor provenance path'
   blob=subprocess.check_output(['git','show',pin['sourceCommit']+':'+file.removeprefix('vendor/')],cwd=repo/'vendor/stack-chan')
   assert hashlib.sha256(blob).hexdigest()==digest, 'vendor source mismatch'

def verify_case_ids(cases):
 expected_ids={f'TC-E2E-{i:02}' for i in range(1,16)}
 assert len(cases)==15 and {c['id'] for c in cases}==expected_ids, 'expected exactly 15 distinct cases'

def audit(root):
 r=root/'evidence/wasm-runs'/RUN_ID
 report=json.loads((r/'report.json').read_text())
 inputs=json.loads((r/'source-inputs.json').read_text())
 verify_case_ids(report['cases'])
 assert report['errors']==[]
 verify_build(root,report,inputs)
 rows=[]
 for case in report['cases']:
  d=json.loads((r/case['file']).read_text()); records=d['records']; traces=[]
  assert d['case']['id']==case['id'] and d['result']==case['result'], 'case file identity/result mismatch'
  assert d['provenance']==report['provenance'], 'case runtime provenance mismatch'
  for x in records:
   if x['kind']=='trace' and x['text'].startswith('COAMI23|'): traces.append(json.loads(x['text'].split('|',1)[1]))
  frames=[x for x in records if x['kind']=='frame-committed']; probes=[x for x in traces if x.get('phase')=='probe']; decoded=[x for x in traces if x.get('phase')=='decoded']; returned=[x for x in traces if x.get('phase')=='returned']; decisions=[x for x in records if x['kind']=='decision-observation']; windows=[x for x in records if x['kind']=='window-observation']; init=[x for x in records if x['kind']=='initial-pose']
  assert case['probe'] and len(probes)==6 and len(init)==1 and init[0]['error_radians']<=math.pi/180
  assert not [x for x in traces if x.get('phase') in ['failed','init-failed']]
  assert len(returned)==case['sdkCalls']==case['result']['controls']
  assert len(decoded)==len(frames)==6+len(returned)
  for f in frames:
   matches=[x for x in decoded if x['seq']==f['seq']]; assert len(matches)==1 and all(abs(a-b)<1e-9 for a,b in zip(matches[0]['target'],f['expected']))
  for ret in returned:
   assert len([f for f in frames if f['seq']==ret['seq'] and not f['probe']])==1
   assert len([w for w in windows if w['command_id']==d['run_id']+':'+str(ret['seq'])])>=19
  if case['result']['state']=='成功': assert all(all(abs(v)<=.1 for v in x['offset']) for x in decisions[-3:]) and len(decisions)>=3
  else: assert case['result']['reason']=='iteration_limit' and len(returned)==20
  first,last=decisions[0],decisions[-1]
  rows.append({'id':case['id'],'state':case['result']['state'],'controls':len(returned),'probe_frames':len(probes),'initial_error_radians':init[0]['error_radians'],'first_offset':first['offset'],'last_offset':last['offset'],'decision_observations':len(decisions),'window_observations':len(windows),'max_quaternion_delta_from_initial':max(abs(a-b) for x in decisions for a,b in zip(x['quaternion'],first['quaternion']))})
 assert report['state']==('成功' if all(c['state']=='成功' for c in rows) else '失敗'), 'suite result mismatch'
 out={'audit':'PASS','run_id':report['runId'],'source_inputs_match':True,'source_commit':SOURCE_COMMIT,'source_verification':'clean-build manifest bound to immutable Git source blobs and recorded complete dist hashes','build_manifest_match':True,'dependency_tree_verified':True,'dependency_tree_sha256':DEPENDENCY_TREE_SHA256,'browser_exceptions':0,'total_probe_frames':sum(x['probe_frames'] for x in rows),'total_sdk_calls':sum(x['controls'] for x in rows),'cases':rows}
 return out

if __name__=='__main__':
 root=Path(__file__).resolve().parent.parent
 out=audit(root)
 (root/'evidence/wasm-evidence-audit-current.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(out,ensure_ascii=False,indent=2))
