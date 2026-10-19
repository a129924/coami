import { describe, it, expect } from 'vitest'
import { TurnSession } from './turn-session.ts'
describe('same-turn lifecycle', () => {
  it('requires natural ended AND same-turn SDK completion', () => {
    const s = new TurnSession('session'); const t = s.begin('clear')
    expect(() => s.begin('clear')).toThrow(/busy/)
    s.sdk(t, true); expect(s.state).toBe('busy')
    s.playback(t, 'ended'); expect(s.state).toBe('completed')
    expect(s.accept(t)).toBe(false)
  })
  it('invalidates stale callbacks and locks uncertain playback', () => {
    const s = new TurnSession('session'); const t = s.begin('clear')
    s.playback(t, 'started'); s.timeout(t)
    expect(s.state).toBe('unconfirmed'); expect(s.accept(t)).toBe(false)
    expect(() => s.begin('clear')).toThrow(/reload/)
    s.playback(t, 'ended'); expect(s.state).toBe('unconfirmed')
  })
  it('cannot complete on SDK success without ended evidence', () => {
    const s = new TurnSession('session'); const t = s.begin('clear')
    s.sdk({...t, run_seq: 99}, true); s.timeout(t)
    expect(s.state).toBe('failed')
    expect(s.begin('ambiguous').run_seq).toBe(2)
  })
})

import { OperationBudget } from './turn-session.ts'
it('counts accepted host attempts across reload, including pre-upload failures', () => {
  let raw: string|null=null
  const store={getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value}}
  for(let n=0;n<20;n++)new OperationBudget(store,()=> '2026-10-19').accept()
  expect(()=>new OperationBudget(store,()=> '2026-10-19').accept()).toThrow(/limit/)
  expect(()=>new OperationBudget(store,()=> '2026-10-20').accept()).toThrow(/limit/)
})
