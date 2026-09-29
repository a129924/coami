import type { Terminal } from './top-touch-greet'

/** Renders the requested terminal when possible and always yields an observable terminal. */
export function renderTerminal(render: (terminal: Terminal) => void, terminal: Terminal): Terminal {
  try {
    render(terminal)
    return terminal
  } catch {
    if (terminal === 'failed') return 'failed'
    try { render('failed') } catch { /* The caller still emits the failed terminal. */ }
    return 'failed'
  }
}
