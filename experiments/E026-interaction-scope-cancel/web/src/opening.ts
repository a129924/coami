/** Every asynchronous bootstrap boundary rechecks the immutable opening owner. */
export async function runOpening(stages: (() => Promise<void>)[], valid: () => boolean, dispose: () => Promise<void>): Promise<boolean> {
  let finished = false
  try {
    for (const stage of stages) {
      if (!valid()) return false
      await stage()
      if (!valid()) return false
    }
    finished = true
    return true
  } catch (error) {
    if (!valid()) return false
    throw error
  } finally { if (!finished || !valid()) await dispose() }
}
