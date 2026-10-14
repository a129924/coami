import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SampleInput } from './input.ts'
import { scenarios } from './scenarios.ts'
const scenario = scenarios.find(s => s.id === 'upright')!
test('TC-MOD pull order, run identity and terminal acknowledgement never replay a sample', () => {
  const input = new SampleInput(7,scenario)
  assert.equal(input.state,'initializing')
  assert.throws(()=>input.take(0),/not active/)
  input.ready()
  for(let i=0;i<scenario.samples.length;i++) {
    const t=input.take(i*100)
    assert.equal(t.sampleId,i+1);assert.equal(t.run,7);assert.deepEqual(t.sample,scenario.samples[i])
  }
  assert.equal(input.state,'active')
  assert.throws(()=>input.take(3000),/complete/)
  assert.equal(input.state,'complete')
  assert.throws(()=>input.take(3100),/not active/)
})
test('TC-LIFECYCLE stop is terminal; fresh input cannot inherit old raw samples', () => {
  const old=new SampleInput(1,scenario);old.ready();old.take(100);old.stop('operator stop')
  assert.throws(()=>old.take(200),/not active/)
  const fresh=new SampleInput(2,scenario);fresh.ready()
  assert.equal(fresh.take(0).sampleId,1);assert.equal(fresh.take(100).run,2)
})
test('TC-LIFECYCLE native failure and interruption are errors, not normal completion', () => {
  for(const kind of ['native-failure','interrupt']) {
    const input=new SampleInput(3,scenarios.find(s=>s.kind===kind)!)
    input.ready();for(let i=0;i<4;i++) input.take(i*100)
    assert.throws(()=>input.take(500),/injected/);assert.equal(input.state,'error')
  }
})
test('TC-MOD offered data is copied and invalid clocks are rejected', () => {
  const input=new SampleInput(4,scenario);input.ready()
  const a=input.take(1);a.sample.y=0
  assert.equal(input.take(2).sample.y,scenario.samples[1]!.y)
  assert.throws(()=>input.take(NaN),/clock/)
})
