import { mkdir, appendFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
if (!process.env.E026_PLAYWRIGHT_MODULE) throw Error('Existing E026_PLAYWRIGHT_MODULE required')
const { chromium } = await import(pathToFileURL(process.env.E026_PLAYWRIGHT_MODULE).href)
const run = process.env.E026_SCENARIO_ROUND ?? `scenarios-${Date.now()}`
if (!/^[a-z0-9-]{1,60}$/.test(run)) throw Error('Invalid scenario run name')
const evidence = fileURLToPath(new URL(`../../evidence/${run}/`, import.meta.url)); await mkdir(evidence)
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--enable-webgl', '--use-angle=swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
try {
  await page.goto('http://127.0.0.1:5178/'); await page.click('#start')
  await page.waitForFunction(() => globalThis.e026?.controller.state === 'active', null, { timeout: 30000 })
  for (const mode of ['cancel-before-action', 'duplicate-late', 'natural-before-cancel', 'robot-first']) for (let repeat = 1; repeat <= 3; repeat++) {
    const start = await page.evaluate(() => globalThis.e026.records.length)
    const old = await page.evaluate(() => globalThis.e026.token)
    if (mode !== 'cancel-before-action') {
      await page.evaluate(mode => globalThis.e026.run(mode === 'duplicate-late' ? 'greet' : 'say', mode === 'natural-before-cancel', mode === 'robot-first' ? 'cleanup_hold' : 'blocked'), mode)
      await page.waitForFunction(({ start, mode }) => {
        const rows = globalThis.e026.records.slice(start)
        if (mode === 'natural-before-cancel') return ['say', 'greet'].every(op => rows.some(r => r.kind === 'mod-trace' && r.record.kind === 'settled' && r.record.op === op && r.record.success))
        return rows.some(r => mode === 'duplicate-late' ? r.kind === 'rendered-pose' && Math.abs(r.pose.p) > 0.05 : r.kind === 'source-running')
      }, { start, mode }, { timeout: 20000 })
    }
    const operation = await page.evaluate(mode => {
      const api = globalThis.e026, old = api.token, operation = api.cancel()
      if (mode === 'cancel-before-action') api.run('say')
      if (mode === 'duplicate-late') {
        if (api.cancel() !== operation) throw Error('Duplicate cancellation replaced operation')
        api.controller.serverAck({ ...operation, cancelId: 'foreign' }, true)
        if (api.controller.apply(old, () => { throw Error('Stale callback executed') })) throw Error('Stale effect admitted')
      }
      api.ping(); return operation
    }, mode)
    if (mode === 'robot-first') {
      await page.waitForFunction(start => globalThis.e026.records.slice(start).some(r => r.kind === 'robot-cleaned'), start, { timeout: 1500 })
      const state = await page.evaluate(() => globalThis.e026.controller.state)
      if (state !== 'cancelling') throw Error('Barrier opened before held Server cleanup')
      await page.evaluate(() => globalThis.e026.send({ kind: 'release', key: `cleanup:A:${globalThis.e026.workId}` }))
    }
    await page.waitForFunction(() => ['restartable', 'quarantined'].includes(globalThis.e026.controller.state), null, { timeout: 7000 })
    const result = await page.evaluate(({ start, mode, repeat }) => ({ mode, repeat, state: globalThis.e026.controller.state, human: 'unobserved', rows: globalThis.e026.records.slice(start) }), { start, mode, repeat })
    await appendFile(evidence + 'runs.jsonl', JSON.stringify(result) + '\n')
    if (result.state !== 'restartable') throw Error(`${mode} quarantined`)
    if (mode === 'cancel-before-action' && result.rows.some(r => r.kind === 'mod-trace' && r.record.kind === 'started')) throw Error('Cancelled work started')
    console.log(mode, repeat, result.state)
    await page.click('#save'); await page.click('#new')
    await page.waitForFunction(() => globalThis.e026.controller.state === 'active', null, { timeout: 30000 })
    const after = await page.evaluate(() => globalThis.e026.records.length)
    await page.evaluate(({ old, operation }) => {
      const api = globalThis.e026
      api.controller.serverAck(operation, true)
      if (api.controller.apply(old, () => { throw Error('Old callback changed fresh Scope') })) throw Error('Stale effect admitted')
      api.send({ kind: 'work', token: old, id: 'late-old-command', mode: 'quick' })
    }, { old, operation })
    await page.waitForFunction(after => globalThis.e026.records.slice(after).some(r => r.kind === 'server-frame' && r.frame.kind === 'rejected' && r.frame.detail === 'stale-scope'), after)
    if (await page.evaluate(() => globalThis.e026.controller.state) !== 'active') throw Error('Old operation changed fresh state')
  }
  await writeFile(evidence + 'server-records.json', JSON.stringify(await page.evaluate(async () => (await fetch('/fixture/records')).json())) + '\n')
  await writeFile(evidence + 'result.json', JSON.stringify({ automated: 'completed', cases: 12, human: 'unobserved', overall: 'inconclusive' }, null, 2) + '\n')
} catch (error) {
  await writeFile(evidence + 'failure.json', JSON.stringify({ error: String(error), records: await page.evaluate(() => globalThis.e026?.records ?? []).catch(() => []) }, null, 2) + '\n')
  throw error
} finally { await browser.close() }
