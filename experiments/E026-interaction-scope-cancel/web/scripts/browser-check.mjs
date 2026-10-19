// Uses an already-installed local browser driver. Does not fill human fields.
import { mkdir, writeFile, appendFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
if (!process.env.E026_PLAYWRIGHT_MODULE) throw Error('Set E026_PLAYWRIGHT_MODULE to an existing playwright-core/index.mjs; this script never installs tools')
const { chromium } = await import(pathToFileURL(process.env.E026_PLAYWRIGHT_MODULE).href)
const round = process.env.E026_ROUND ?? `run-${Date.now()}`
if (!/^[a-z0-9-]{1,40}$/.test(round)) throw Error('Invalid evidence round')
const evidence = fileURLToPath(new URL(`../../evidence/${round}/`, import.meta.url))
await mkdir(evidence)
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--enable-webgl', '--use-angle=swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []; page.on('pageerror', error => errors.push(String(error)))
try {
  await page.goto('http://127.0.0.1:5178/')
  await page.click('#start')
  await page.waitForFunction(() => globalThis.e026?.controller.state === 'active', { timeout: 30000 })
  console.log('READY', await browser.version())
  for (const mode of ['say', 'greet', 'both']) for (let repeat = 1; repeat <= 3; repeat++) {
    const start = await page.evaluate(() => globalThis.e026.records.length)
    await page.click(`#${mode}`)
    await page.waitForFunction(({ start, mode }) => {
      const rows = globalThis.e026.records.slice(start)
      const sound = rows.some(r => r.kind === 'source-running')
      const motion = rows.some(r => r.kind === 'rendered-pose' && Math.abs(r.pose.p) > 0.05)
      return (mode === 'say' || mode === 'both' ? sound : true) && (mode === 'greet' || mode === 'both' ? motion : true)
    }, { start, mode }, { timeout: 20000 })
    await page.evaluate(() => { globalThis.e026.cancel(); globalThis.e026.ping() })
    await page.waitForFunction(() => ['restartable', 'quarantined'].includes(globalThis.e026.controller.state), null, { timeout: 7000 })
    const result = await page.evaluate(({ start, mode, repeat }) => ({ mode, repeat, state: globalThis.e026.controller.state, human: 'unobserved', rows: globalThis.e026.records.slice(start) }), { start, mode, repeat })
    await appendFile(evidence + 'automated-browser.jsonl', JSON.stringify(result) + '\n')
    await page.waitForFunction(start => globalThis.e026.records.slice(start).some(r => r.kind === 'robot-b-frame' && r.frame.kind === 'result'), start, { timeout: 5000 })
    await page.click('#save')
    console.log(mode, repeat, result.state)
    if (result.state !== 'restartable') throw Error(`${mode} ${repeat} quarantined`)
    await page.click('#new')
    await page.waitForFunction(() => globalThis.e026.controller.state === 'active', null, { timeout: 30000 })
  }
  await page.screenshot({ path: evidence + 'browser.png', fullPage: true })
  await writeFile(evidence + 'browser-result.json', JSON.stringify({ automated: 'completed', human: 'unobserved', overall: 'inconclusive', errors }, null, 2) + '\n')
} catch (error) {
  await page.screenshot({ path: evidence + 'browser-failure.png', fullPage: true }).catch(() => {})
  const records = await page.evaluate(() => globalThis.e026?.records ?? []).catch(() => [])
  await writeFile(evidence + 'browser-failure.json', JSON.stringify({ reason: String(error), errors, records }, null, 2) + '\n')
  throw error
} finally { await browser.close() }
