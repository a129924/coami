export const CATALOG_VERSION = 1 as const

export const ACTION_CATALOG = [
  { id: 'face.neutral', label: '中立', category: 'face' },
  { id: 'face.angry', label: '生氣', category: 'face' },
  { id: 'face.sad', label: '難過', category: 'face' },
  { id: 'face.happy', label: '開心', category: 'face' },
  { id: 'face.sleepy', label: '想睡', category: 'face' },
  { id: 'face.doubtful', label: '疑惑', category: 'face' },
  { id: 'face.cold', label: '寒冷', category: 'face' },
  { id: 'face.hot', label: '炎熱', category: 'face' },
  { id: 'face.blink', label: '雙眼眨眼', category: 'face' },
  { id: 'face.wink_left', label: '左眼眨眼', category: 'face' },
  { id: 'face.wink_right', label: '右眼眨眼', category: 'face' },
  { id: 'face.mouth_open', label: '張嘴', category: 'face' },
  { id: 'head.left', label: '向左轉', category: 'head' },
  { id: 'head.right', label: '向右轉', category: 'head' },
  { id: 'head.up', label: '抬頭', category: 'head' },
  { id: 'head.down', label: '低頭', category: 'head' },
  { id: 'head.nod', label: '點頭', category: 'head' },
  { id: 'head.shake', label: '搖頭', category: 'head' },
  { id: 'head.center', label: '回正', category: 'head' },
  { id: 'greet', label: '招呼', category: 'sequence' },
] as const

export type ActionId = (typeof ACTION_CATALOG)[number]['id']
export type ActionCategory = (typeof ACTION_CATALOG)[number]['category'] | 'control'
export type ResultStatus = 'completed' | 'cancelled' | 'failed' | 'timeout'

type RecordCommon = {
  schema_version: 1
  request_id: string
  action_id: ActionId | 'control.stop'
  category: ActionCategory
  source: 'human_button'
  simulator_generation: number
}

export type ActionCommand = RecordCommon & {
  record_type: 'command'
  requested_at: string
}

export type ActionResult = RecordCommon & {
  record_type: 'result'
  mod_run_seq: number | null
  started_at: string | null
  finished_at: string
  status: ResultStatus
  error_code: string | null
  detail: string | null
  cancelled_by_request_id: string | null
}

export type ActionRecord = ActionCommand | ActionResult

export type CatalogTrace = {
  kind: 'catalog'
  catalog_version: 1
  action_ids: ActionId[]
  selected_index: -1
}
export type SelectionTrace = {
  kind: 'selection'
  catalog_version: 1
  selection_seq: number
  selected_index: number
  action_id: ActionId
  phase: 'pressed' | 'released'
}
export type RunTrace = {
  kind: 'run'
  catalog_version: 1
  run_seq: number
  action_id: ActionId
  phase: 'started' | 'completed' | 'cancelled' | 'failed'
  error?: string
}
export type ResetTrace = {
  kind: 'reset'
  catalog_version: 1
  phase: 'completed' | 'failed' | 'released'
  error?: string
}
export type ModTrace = CatalogTrace | SelectionTrace | RunTrace | ResetTrace

function isActionId(value: unknown): value is ActionId {
  return typeof value === 'string' && ACTION_CATALOG.some((action) => action.id === value)
}

export function parseModTrace(line: string): ModTrace | null {
  if (!line.startsWith('COAMI5|')) return null
  try {
    const value: unknown = JSON.parse(line.slice('COAMI5|'.length))
    if (!value || typeof value !== 'object') return null
    const trace = value as Record<string, unknown>
    if (trace.catalog_version !== CATALOG_VERSION) return null
    if (trace.kind === 'catalog' && Array.isArray(trace.action_ids) && trace.action_ids.every(isActionId) && trace.selected_index === -1) {
      return trace as CatalogTrace
    }
    if (trace.kind === 'selection' && Number.isInteger(trace.selection_seq) && Number(trace.selection_seq) > 0 &&
      Number.isInteger(trace.selected_index) && Number(trace.selected_index) >= 0 && Number(trace.selected_index) < ACTION_CATALOG.length &&
      isActionId(trace.action_id) && (trace.phase === 'pressed' || trace.phase === 'released')) {
      return trace as SelectionTrace
    }
    if (trace.kind === 'run' && Number.isInteger(trace.run_seq) && Number(trace.run_seq) > 0 && isActionId(trace.action_id) &&
      typeof trace.phase === 'string' && ['started', 'completed', 'cancelled', 'failed'].includes(trace.phase) &&
      (trace.error === undefined || typeof trace.error === 'string')) {
      return trace as RunTrace
    }
    if (trace.kind === 'reset' && typeof trace.phase === 'string' && ['completed', 'failed', 'released'].includes(trace.phase) &&
      (trace.error === undefined || typeof trace.error === 'string')) {
      return trace as ResetTrace
    }
  } catch {
    return null
  }
  return null
}

export function recordsToJsonl(records: readonly ActionRecord[]): string {
  return records.map((record) => JSON.stringify(record)).join('\n') + (records.length ? '\n' : '')
}
