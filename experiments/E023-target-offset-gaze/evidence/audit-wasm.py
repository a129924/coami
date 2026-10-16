import json,hashlib,math,subprocess
from pathlib import Path

SOURCE_COMMIT='7171ba976c2d40b06de7724a62d2e803ebbf0114'

def verify_sources(root,hashes):
 # Tooling has evolved; bind historical evidence to immutable implementation blobs.
 repo=root.parent.parent
 for file,expected in hashes.items():
  blob=subprocess.check_output(['git','show',f'{SOURCE_COMMIT}:experiments/E023-target-offset-gaze/{file}'],cwd=repo)
  assert hashlib.sha256(blob).hexdigest()==expected, f'recorded source mismatch: {file}'

def verify_case_ids(cases):
 expected_ids={f'TC-E2E-{i:02}' for i in range(1,16)}
 assert len(cases)==15 and {c['id'] for c in cases}==expected_ids, 'expected exactly 15 distinct cases'

def audit(root):
 r=root/'evidence/wasm-runs/WASM-2026-10-15T07-05-48-980Z'
 report=json.loads((r/'report.json').read_text())
 inputs=json.loads((r/'source-inputs.json').read_text())
 verify_case_ids(report['cases'])
 assert report['errors']==[]
 verify_sources(root,inputs['sha256'])
 rows=[]
 for case in report['cases']:
  d=json.loads((r/case['file']).read_text()); records=d['records']; traces=[]
  assert d['case']['id']==case['id'], 'case file identity mismatch'
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
 out={'audit':'PASS','run_id':report['runId'],'source_inputs_match':True,'source_commit':SOURCE_COMMIT,'source_verification':'immutable Git blobs; not current working-tree sources','browser_exceptions':0,'total_probe_frames':sum(x['probe_frames'] for x in rows),'total_sdk_calls':sum(x['controls'] for x in rows),'cases':rows}
 return out

if __name__=='__main__':
 root=Path(__file__).resolve().parent.parent
 out=audit(root)
 (root/'evidence/wasm-evidence-audit-current.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(out,ensure_ascii=False,indent=2))
