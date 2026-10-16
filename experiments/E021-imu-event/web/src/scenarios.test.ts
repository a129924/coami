import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MotionRecognizer } from '../../../../vendor/stack-chan/firmware/host/modules/input/imu-motion.ts'
import { scenarios, U } from './scenarios.ts'
for (const scenario of scenarios.filter(s => s.kind === 'normal' || s.kind === 'cooldown')) {
  test(`TC-SAMPLES ${scenario.id}: pinned recognizer receives raw samples`, () => {
    const r = new MotionRecognizer()
    const actual: {motion: string; index: number}[] = []
    scenario.samples.forEach((accelerometer, index) => {
      const event = r.update({accelerometer}, (index + 1) * 100)
      if (event) actual.push({motion:event.type, index:index+1})
    })
    assert.deepEqual(actual, scenario.expected)
  })
}
test('TC-THRESHOLD exact acceleration delta 1.2 and cooldown 1499/1500 use SDK defaults', () => {
  const r = new MotionRecognizer()
  r.update({accelerometer:{x:0,y:0,z:0}}, 0)
  for(let i=1;i<=9;i++) assert.equal(r.update({accelerometer:{x:0,y:i%2 ? 1.2:0,z:0}},i),undefined)
  assert.equal(r.update({accelerometer:{x:0,y:0,z:0}},10)?.type,'shake')
  for(let i=1;i<=9;i++) assert.equal(r.update({accelerometer:{x:0,y:i%2 ? 1.2:0,z:0}},10+i),undefined)
  assert.equal(r.update({accelerometer:{x:0,y:0,z:0}},1509),undefined)
  assert.equal(r.update({accelerometer:{x:0,y:1.2,z:0}},1510)?.type,'shake')
})
test('TC-THRESHOLD exact posture 0.75 is inclusive; gyroscope shake stays disabled', () => {
  const r = new MotionRecognizer(), v={x:.75,y:0,z:Math.sqrt(1-.75**2)}
  assert.equal(r.update({accelerometer:v},0),undefined)
  assert.equal(r.update({accelerometer:v},100),undefined)
  assert.equal(r.update({accelerometer:v},200)?.type,'fallenLeft')
  const gyro = new MotionRecognizer()
  for(let i=0;i<20;i++) assert.equal(gyro.update({accelerometer:U,gyroscope:{x:100,y:0,z:0}},i*100),undefined)
})
