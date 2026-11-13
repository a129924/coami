// Fixture owns a fresh Server process and browser context per independent case.
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, appendFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
if (!process.env.E026_PLAYWRIGHT_MODULE) throw Error('Existing E026_PLAYWRIGHT_MODULE required')
const { chromium } = await import(pathToFileURL(process.env.E026_PLAYWRIGHT_MODULE).href)
const serverDir = fileURLToPath(new URL('../../server/', import.meta.url))
const evidenceRoot = fileURLToPath(new URL('../../evidence/faults/', import.meta.url)); await mkdir(evidenceRoot, { recursive: true })
const attempt = process.env.E026_FAULT_RUN ?? `run-${Date.now()}`
if (!/^[a-z0-9-]{1,60}$/.test(attempt)) throw Error('Invalid fixture run name')
const evidence = evidenceRoot + attempt + '/'; await mkdir(evidence)
const allowed = ['robot-stop-error', 'robot-stop-timeout', 'robot-close-error', 'server-cleanup-error', 'server-cleanup-timeout', 'opening-startup-timeout']
const modes = process.env.E026_FAULT_MODES?.split(',') ?? allowed
if (modes.some(mode => !allowed.includes(mode))) throw Error('Unknown fixture mode')
try { await fetch('http://127.0.0.1:8766/fixture/records'); throw Error('Stop the previous fixture Server before running fault-check') }
catch (error) { if (String(error).includes('Stop the previous')) throw error }
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--enable-webgl', '--use-angle=swiftshader'] })
try {
  for (const mode of modes) for (let repeat = 1; repeat <= 3; repeat++) {
    const server = spawn(serverDir + '.venv/bin/python', ['-m', 'uvicorn', 'app:app', '--host', '127.0.0.1', '--port', '8766'], { cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'] })
    let serverLog = ''; server.stdout.on('data', d => { serverLog += d }); server.stderr.on('data', d => { serverLog += d })
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), page = await context.newPage()
    let releaseStartup = () => {}
    try {
      const deadline = Date.now() + 10000
      while (true) {
        try { if ((await fetch('http://127.0.0.1:8766/fixture/records')).ok) break } catch {}
        if (Date.now() > deadline || server.exitCode !== null) throw Error('Fixture Server startup failed')
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      await page.addInitScript(mode => {
        const nodes = [], ended = new WeakSet(), stop = AudioBufferSourceNode.prototype.stop, start = AudioBufferSourceNode.prototype.start, close = AudioContext.prototype.close
        AudioBufferSourceNode.prototype.start = function (...args) { nodes.push(this); this.addEventListener('ended', () => ended.add(this)); if (mode === 'robot-stop-timeout') this.loop = true; return start.apply(this, args) }
        AudioBufferSourceNode.prototype.stop = function (...args) { if (mode === 'robot-stop-error') throw Error('fixture stop error'); if (mode === 'robot-stop-timeout') return; return stop.apply(this, args) }
        if (mode === 'robot-close-error') AudioContext.prototype.close = function () { return Promise.reject(Error('fixture close error')) }
        globalThis.e026Fault = { nodes, ended, stop, start, close }
      }, mode)
      let startupHeld = Promise.resolve()
      if (mode === 'opening-startup-timeout') {
        let heldResolve
        startupHeld = new Promise(resolve => { heldResolve = resolve })
        const gate = new Promise(resolve => { releaseStartup = resolve })
        let requests = 0
        await page.route(url => url.pathname.endsWith('/simulator/mc.wasm'), async route => {
          if (++requests === 2) { heldResolve(); await gate }
          await route.continue().catch(() => {})
        })
      }
      await page.goto('http://127.0.0.1:5178/'); await page.click('#start')
      if (mode === 'opening-startup-timeout') {
        await Promise.race([startupHeld, new Promise((_, reject) => setTimeout(() => reject(Error('WASM startup gate not reached')), 20000))])
        const start = await page.evaluate(() => globalThis.e026.records.length)
        await page.evaluate(() => { globalThis.e026.cancel(); globalThis.e026.ping() })
        await page.waitForFunction(() => globalThis.e026.controller.state === 'quarantined', null, { timeout: 7000 })
        releaseStartup()
        await page.waitForFunction(start => globalThis.e026.records.slice(start).some(r => r.kind === 'opening-resources-disposed'), start, { timeout: 20000 })
        const rows = await page.evaluate(start => globalThis.e026.records.slice(start), start)
        if (rows.some(r => r.kind === 'scope-active' || r.kind === 'dispatch')) throw Error('Cancelled boot activated business')
        const disposed = rows.some(r => r.kind === 'audio-context-closed') && rows.some(r => r.kind === 'opening-resources-disposed')
        if (!disposed) throw Error('Cancelled boot resources not confirmed disposed')
        const serverRows = await page.evaluate(async () => (await fetch('/fixture/records')).json())
        await appendFile(evidence + 'runs.jsonl', JSON.stringify({ mode, repeat, fixture: 'second WASM fetch held through cleanup deadline', expected: 'quarantined', human: 'unobserved', disposed, rows, serverRows }) + '\n')
        console.log(mode, repeat, 'deadline quarantine; no activation; opening resources disposed')
        continue
      }
      await page.waitForFunction(() => globalThis.e026?.controller.state === 'active', null, { timeout: 30000 })
      const start = await page.evaluate(() => globalThis.e026.records.length)
      await page.evaluate(mode => globalThis.e026.run('say', false, mode === 'server-cleanup-error' ? 'cleanup_error' : mode === 'server-cleanup-timeout' ? 'cleanup_timeout' : 'blocked'), mode)
      await page.waitForFunction(start => globalThis.e026.records.slice(start).some(r => r.kind === 'source-running'), start, { timeout: 20000 })
      await page.evaluate(() => { globalThis.e026.cancel(); globalThis.e026.ping() })
      await page.waitForFunction(() => globalThis.e026.controller.state === 'quarantined', null, { timeout: 7000 })
      await page.evaluate(() => { const operation = globalThis.e026.cancel(); globalThis.e026.controller.serverAck(operation, true) })
      const rejected = await page.evaluate(async () => { try { await globalThis.e026.newScope(); return false } catch { return true } })
      if (!rejected || await page.evaluate(() => globalThis.e026.controller.state) !== 'quarantined') throw Error('Failure unlocked a new Scope')
      // Harness teardown is separately evidenced, never labelled product recovery.
      const disposed = await page.evaluate(async () => {
        const f = globalThis.e026Fault
        AudioBufferSourceNode.prototype.stop = f.stop; AudioBufferSourceNode.prototype.start = f.start; AudioContext.prototype.close = f.close
        for (const node of f.nodes) if (!f.ended.has(node) && node.context.state !== 'closed') await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(Error('Fixture teardown source did not end')), 1500)
          node.addEventListener('ended', () => { clearTimeout(timer); resolve() }, { once: true }); f.stop.call(node)
        })
        const contexts = [...new Set(f.nodes.map(node => node.context))]
        for (const context of contexts) if (context.state !== 'closed') await f.close.call(context)
        return contexts.every(context => context.state === 'closed')
      })
      if (!disposed) throw Error('Old audio environment not disposed')
      const rows = await page.evaluate(start => globalThis.e026.records.slice(start), start)
      const serverRows = await page.evaluate(async () => (await fetch('/fixture/records')).json())
      await appendFile(evidence + 'runs.jsonl', JSON.stringify({ mode, repeat, expected: 'quarantined', human: 'unobserved', disposed, rows, serverRows }) + '\n')
      console.log(mode, repeat, 'quarantined; independent environment disposed')
    } catch (error) {
      await writeFile(evidence + `${mode}-${repeat}-failure.json`, JSON.stringify({ reason: String(error), records: await page.evaluate(() => globalThis.e026?.records ?? []).catch(() => []) }, null, 2) + '\n')
      throw error
    } finally {
      releaseStartup()
      await context.close()
      const stopped = once(server, 'exit'); server.kill('SIGINT')
      const watchdog = setTimeout(() => server.kill('SIGKILL'), 8000)
      await stopped; clearTimeout(watchdog)
      await writeFile(evidence + `${mode}-${repeat}-server.txt`, serverLog)
    }
  }
  await writeFile(evidence + `result-${modes.length === allowed.length ? 'all' : modes.join('-')}.json`, JSON.stringify({ automated: 'completed', cases: modes.length * 3, modes, expectedFailureIsolation: 'observed', human: 'unobserved', overall: 'inconclusive' }, null, 2) + '\n')
} finally { await browser.close() }
