import test from 'node:test'
import assert from 'node:assert/strict'
import { Kernel, RESOURCES, type Action, type Identity } from './state.ts'
function accepted(k:Kernel,action:Action):Identity { const a=k.admit(action);
   assert.equal(a.accepted,true);
   if(!a.accepted)throw Error('admission');
   return a.identity }
test('atomic admission reserves complete appearance and output before start',()=>{const k=new Kernel('s');
   accepted(k,'say');
   assert.equal(k.snapshot().activities.output,'requested');
   assert.equal(k.admit('head.nod').accepted,false);
   assert.equal(k.admit('record').accepted,false);
   assert.equal(k.snapshot().operations.length,1)})
test('correlated start/end, uncertainty sticky, independent head and recording',()=>{const k=new Kernel('s');
   const r=accepted(k,'record'),h=accepted(k,'head.nod');
   k.observe({kind:'start',identity:r});
   assert.equal(k.snapshot().activities.recording,'active');
   k.observe({kind:'uncertain',identity:r,reason:'timeout/failure/server cancel'});
   k.observe({kind:'start',identity:r});
   assert.equal(k.snapshot().activities.recording,'unknown');
   k.observe({kind:'end',identity:h});
   assert.equal(k.snapshot().pose,'unknown');
   assert.equal(k.snapshot().motorStop,'unknown');
   assert.equal(k.admit('say').accepted,false);
   k.observe({kind:'end',identity:r});
   assert.equal(k.snapshot().activities.recording,'inactive');
   accepted(k,'say')})
for(const action of ['record','say','replay','head.nod'] as const)for(const phase of ['requested','active','unknown'] as const)test(`${action} rejects same resource and reciprocal exclusion in ${phase}`,()=>{const k=new Kernel('s');
  const id=accepted(k,action);
  if(phase!=='requested')k.observe({kind:phase==='active'?'start':'uncertain',identity:id});
   assert.equal(k.admit(action).accepted,false);
  if(action==='record')assert.equal(k.admit('say').accepted,false);
  if(action==='say'||action==='replay')assert.equal(k.admit('record').accepted,false)})
test('stale, wrong ID, duplicate and tombstone late events never clear newer work',()=>{const k=new Kernel('s'),id=accepted(k,'record');
  k.observe({kind:'end',identity:{...id,sessionEpoch:'old'}});
  k.observe({kind:'end',identity:{...id,operationId:'wrong'}});
  assert.equal(k.admit('record').accepted,false);
  k.observe({kind:'end',identity:id});
  const newer=accepted(k,'record');
  k.observe({kind:'end',identity:id});
  k.observe({kind:'start',identity:id});
  assert.equal(k.snapshot().operations.find(o=>o.identity.operationId===newer.operationId)?.state,'requested')})
test('external stock overlap is retained with policy diagnosis and separate identities',()=>{const k=new Kernel('s');
  accepted(k,'record');
   k.observe({kind:'external',identity:{sessionEpoch:'s',operationId:'external-output'},action:'say'});
  k.observe({kind:'start',identity:k.snapshot().operations[0]!.identity});
  assert.equal(k.snapshot().activities.recording,'active');
  assert.equal(k.snapshot().activities.output,'active');
  assert.match(k.snapshot().diagnostics.join(' '),/policy/);
  assert.equal(k.snapshot().operations.length,2)})
test('unattributed occupancy blocks resources and snapshots cannot mutate kernel',()=>{const k=new Kernel('s');
  k.observe({kind:'unattributed',resource:'output',reason:'unmatched source'});
  assert.equal(k.admit('record').accepted,false);
  assert.equal(k.admit('say').accepted,false);
  const view=k.snapshot();
  Reflect.set(view.activities,'output','inactive');
  assert.equal(k.snapshot().activities.output,'unknown');
   assert.deepEqual(RESOURCES['head.nod'],['head','appearance']);
  assert.deepEqual(RESOURCES.say,['output','appearance'])})
