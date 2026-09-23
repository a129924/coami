/** Wire-facing Action vocabulary. Keep values aligned with the E004 protocol. */
export enum Action {
  GREET = 'greet',
}

export type RobotCommand = {
  commandId: string
  eventId: string | undefined
  action: Action
}

export type ActiveGreeting = {
  commandId: string
  session: number
  origin: 'direct' | 'event'
}

/** One simulator motion slot; a WebSocket reconnect does not clear local motion. */
export class GreetingSlot {
  private active: ActiveGreeting | undefined

  get current(): ActiveGreeting | undefined { return this.active }

  begin(commandId: string, session: number, origin: ActiveGreeting['origin']): boolean {
    if (this.active) return false
    this.active = { commandId, session, origin }
    return true
  }

  finish(): ActiveGreeting | undefined {
    const greeting = this.active
    this.active = undefined
    return greeting
  }
}

/** Decode either a direct command or an E003 event-origin command. */
export function decodeCommand(value: unknown): RobotCommand | null {
  if (typeof value !== 'object' || value === null) return null
  const message = value as Record<string, unknown>
  if (message.type !== 'robot.command') return null
  if (typeof message.command_id !== 'string' || !message.command_id) return null
  if (message.action !== Action.GREET) return null
  if (message.event_id !== undefined && typeof message.event_id !== 'string') return null
  return {
    commandId: message.command_id,
    eventId: message.event_id as string | undefined,
    action: Action.GREET,
  }
}
