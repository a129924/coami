type Schedule = (callback: () => void) => () => void
const scheduleTimeout: Schedule = callback => {
 const id = setTimeout(callback, 30000)
 return () => clearTimeout(id)
}
export async function watchStartup(start: () => Promise<void>, isReady: () => boolean,
 isBlocked: () => boolean, onTimeout: () => void, schedule: Schedule = scheduleTimeout): Promise<void> {
 const cancel = schedule(() => { if (!isReady() && !isBlocked()) onTimeout() })
 try { await start(); if (isReady() || isBlocked()) cancel() }
 catch (error) { cancel(); throw error }
}
