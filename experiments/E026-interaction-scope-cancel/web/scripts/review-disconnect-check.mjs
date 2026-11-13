// Bounded PR regression fixture. Owns its browser and local servers; never fills human confirmation.
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
if (!process.env.E026_PLAYWRIGHT_MODULE) throw Error('Existing E026_PLAYWRIGHT_MODULE required')
const { chromium } = await import(pathToFileURL(process.env.E026_PLAYWRIGHT_MODULE).href)
const web = fileURLToPath(new URL('../', import.meta.url)), serverDir = fileURLToPath(new URL('../../server/', import.meta.url))
const attempt = process.env.E026_REVIEW_RUN ?? `disconnect-${Date.now()}`
if (!/^[a-z0-9-]{1,60}$/.test(attempt)) throw Error('Invalid run name')
await mkdir(fileURLToPath(new URL('../../evidence/pr-comment-review-20261113/', import.meta.url)), { recursive: true })
const out = fileURLToPath(new URL(`../../evidence/pr-comment-review-20261113/${attempt}/`, import.meta.url))
await mkdir(out) // Existing evidence must never be overwritten.
for (const url of ['http://127.0.0.1:5178/', 'http://127.0.0.1:8766/fixture/records']) {
  let running = false
  try { running = (await fetch(url)).ok } catch {}
  if (running) throw Error(`Existing fixture must be stopped first: ${url}`)
}
function launch(command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
  const entry = { child, log: '' }
  child.stdout.on('data', d => { entry.log += d }); child.stderr.on('data', d => { entry.log += d })
  return entry
}
async function stop(entry) {
  if (entry.child.exitCode !== null || entry.child.signalCode !== null) return
  const done = once(entry.child, 'exit'); entry.child.kill('SIGINT')
  const timer = setTimeout(() => entry.child.kill('SIGKILL'), 8000)
  try { await done } finally { clearTimeout(timer) }
}
async function ready(url, child) {
  const deadline = Date.now() + 10000
  while (true) {
    try { if ((await fetch(url)).ok) return } catch {}
    if (Date.now() > deadline || child.exitCode !== null) throw Error(`Fixture startup failed: ${url}`)
    await new Promise(resolve => setTimeout(resolve, 25))
  }
}
const vite = launch(process.execPath, [web + 'node_modules/vite/bin/vite.js', '--host', '127.0.0.1'], web)
let browser
const metrics = []
try {
  await ready('http://127.0.0.1:5178/', vite.child)
  browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--enable-webgl', '--use-angle=swiftshader'] })
  for (const mode of ['say', 'greet']) for (let repeat = 1; repeat <= 3; repeat++) {
    const server = launch(serverDir + '.venv/bin/python', ['-m', 'uvicorn', 'app:app', '--host', '127.0.0.1', '--port', '8766'], serverDir)
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), page = await context.newPage()
    try {
      await ready('http://127.0.0.1:8766/fixture/records', server.child)
      await page.addInitScript(() => {
        const sockets = [], NativeWebSocket = WebSocket
        globalThis.WebSocket = class extends NativeWebSocket {
          constructor(url, protocols) { super(url, protocols); sockets.push(this) }
        }
        globalThis.e026ReviewSockets = sockets
      })
      await page.goto('http://127.0.0.1:5178/')
      await page.locator('#start').click()
      await page.waitForFunction(() => globalThis.e026?.controller.state === 'active', null, { timeout: 30000 })
      const provenance = await page.evaluate(async () => (await fetch('/runtime-provenance.json')).json())
      const start = await page.evaluate(() => globalThis.e026.records.length)
      await page.evaluate(mode => globalThis.e026.run(mode), mode)
      await page.waitForFunction(({ start, mode }) => globalThis.e026.records.slice(start).some(row => mode === 'say' ? row.kind === 'source-running' : row.kind === 'rendered-pose' && Object.values(row.pose).some(v => Math.abs(v) > 0.1)), { start, mode }, { timeout: 15000 })
      await page.evaluate(() => globalThis.e026ReviewSockets.find(ws => ws.url.endsWith('/ws/A')).close())
      await page.waitForFunction(start => globalThis.e026.records.slice(start).some(row => row.kind === 'disconnect-local-stop-settled'), start, { timeout: 7000 })
      const state = await page.evaluate(() => {
        globalThis.e026.controller.disconnect(); globalThis.e026.controller.disconnect()
        globalThis.e026.controller.serverAck({ ...globalThis.e026.token, cancelId: 'late' }, true)
        return globalThis.e026.controller.state
      })
      assert.equal(state, 'quarantined')
      const openRejected = await page.evaluate(async () => { try { await globalThis.e026.newScope(); return false } catch { return true } })
      assert.equal(openRejected, true)
      await page.evaluate(() => globalThis.e026ReviewSockets.find(ws => ws.url.endsWith('/ws/B')).send(JSON.stringify({ kind: 'ping' })))
      await page.waitForFunction(start => globalThis.e026.records.slice(start).some(row => row.kind === 'robot-b-frame' && row.frame.kind === 'pong'), start)
      const rows = await page.evaluate(start => globalThis.e026.records.slice(start), start)
      const serverRows = await page.evaluate(async () => (await fetch('/fixture/records')).json())
      const disconnected = rows.find(row => row.kind === 'quarantined' && row.detail === 'control-disconnected')
      assert.ok(disconnected)
      const stopped = rows.find(row => row.kind === 'disconnect-effects-stopped'), settled = rows.find(row => row.kind === 'disconnect-local-stop-settled')
      assert.ok(stopped && settled)
      const stopMs = stopped.at - disconnected.at, cleanupMs = settled.at - disconnected.at
      assert.ok(stopMs >= 0 && stopMs <= 1000, `stop=${stopMs}`)
      assert.ok(cleanupMs >= 0 && cleanupMs <= 5000, `cleanup=${cleanupMs}`)
      const after = rows.filter(row => row.at >= disconnected.at)
      assert.equal(after.filter(row => row.kind === 'disconnect-local-stop-requested').length, 1)
      assert.equal(after.some(row => row.kind === 'dispatch' || row.kind === 'barrier-open'), false)
      assert.ok(after.some(row => row.kind === 'audio-context-closed'))
      assert.ok(after.some(row => row.kind === 'mod-trace' && row.record.kind === 'invalidated'))
      if (mode === 'say') assert.ok(after.some(row => row.kind === 'source-ended' && row.reason === 'cancelled'))
      if (mode === 'greet') {
        const stable = after.find(row => row.kind === 'motion-stable-300ms'), tail = after.find(row => row.kind === 'motion-tail-complete')
        assert.ok(stable && tail && tail.at - stable.at >= 2000)
        const poses = after.filter(row => row.kind === 'rendered-pose' && row.at >= stable.at && row.at <= tail.at)
        assert.ok(poses.length && poses.every(row => Object.values(row.pose).every(v => Math.abs(v) <= 0.02)))
      }
      assert.ok(serverRows.some(row => row.robot === 'A' && row.action === 'cancel_complete'))
      const metric = { mode, repeat, stopMs: +stopMs.toFixed(1), cleanupMs: +cleanupMs.toFixed(1), state, human: 'unobserved', newScopeRejected: true, otherRobotPing: true }
      await appendFile(out + 'runs.jsonl', JSON.stringify({ ...metric, provenance, rows, serverRows }) + '\n')
      metrics.push(metric); console.log(JSON.stringify(metric))
    } catch (error) {
      await writeFile(out + `${mode}-${repeat}-failure.json`, JSON.stringify({ error: String(error), rows: await page.evaluate(() => globalThis.e026?.records ?? []).catch(() => []) }, null, 2) + '\n')
      throw error
    } finally {
      await context.close(); await stop(server); await writeFile(out + `${mode}-${repeat}-server.txt`, server.log)
    }
  }
  await writeFile(out + 'result.json', JSON.stringify({ result: 'passed', cases: metrics, browserVersion: browser.version(), human: 'unobserved', scope: 'fixed simulator; socket close during say/greet only; no new human or hardware guarantee' }, null, 2) + '\n')
} finally {
  if (browser) await browser.close()
  await stop(vite); await writeFile(out + 'vite.txt', vite.log)
}
