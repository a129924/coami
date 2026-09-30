export const ACTION_MENU = [
  { id: 'face.neutral', label: '中立', kind: 'emotion' },
  { id: 'face.angry', label: '生氣', kind: 'emotion' },
  { id: 'face.sad', label: '難過', kind: 'emotion' },
  { id: 'face.happy', label: '開心', kind: 'emotion' },
  { id: 'face.sleepy', label: '想睡', kind: 'emotion' },
  { id: 'face.blink', label: '雙眼眨眼', kind: 'face' },
  { id: 'face.wink_left', label: '左眼眨眼', kind: 'face' },
  { id: 'face.wink_right', label: '右眼眨眼', kind: 'face' },
  { id: 'face.mouth_open', label: '張嘴', kind: 'face' },
  { id: 'head.left', label: '向左轉', kind: 'head' },
  { id: 'head.right', label: '向右轉', kind: 'head' },
  { id: 'head.up', label: '抬頭', kind: 'head' },
  { id: 'head.down', label: '低頭', kind: 'head' },
  { id: 'head.nod', label: '點頭', kind: 'head' },
  { id: 'head.shake', label: '搖頭', kind: 'head' },
  { id: 'head.center', label: '回正', kind: 'head' },
  { id: 'greet', label: '招呼', kind: 'sequence' },
] as const

export type ActionId = (typeof ACTION_MENU)[number]['id']
export type MenuAction = (typeof ACTION_MENU)[number]

export function actionFor(id: ActionId): MenuAction {
  const action = ACTION_MENU.find((candidate) => candidate.id === id)
  if (!action) throw new Error(`Unknown action: ${id}`)
  return action
}
