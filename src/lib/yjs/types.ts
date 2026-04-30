export type TicketStatus = 'triage' | 'scripting' | 'review' | 'done'
export type TicketPriority = 'P0' | 'P1' | 'P2' | 'P3'

export const STATUS_ORDER: TicketStatus[] = ['triage', 'scripting', 'review', 'done']
export const STATUS_LABELS: Record<TicketStatus, string> = {
  triage: 'Triage',
  scripting: 'Scripting',
  review: 'Review',
  done: 'Done',
}

export interface Ticket {
  id: string
  humanId: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  assignee: string
  mrrAtRisk: number
  properties: string[]
  createdAt: number
}

interface BaseEvent {
  id: string
  by: string
  at: number
}

export interface CreatedEvent extends BaseEvent { type: 'created' }
export interface CommentEvent extends BaseEvent {
  type: 'comment'
  /** Canonical markdown body — used for export/portability and as a fallback. */
  body: string
  /** Tiptap JSON snapshot. Optional so legacy comments don't break read-only Tiptap. */
  bodyJson?: unknown
}
export interface CommentDeletedEvent extends BaseEvent { type: 'comment_deleted'; targetId: string }
export interface StatusChangeEvent extends BaseEvent { type: 'status_change'; from: TicketStatus; to: TicketStatus }
export interface AssignedEvent extends BaseEvent { type: 'assigned'; from: string; to: string }
export interface ScriptRunEvent extends BaseEvent {
  type: 'script_run'
  code: string
  stdout: string
  stderr: string
  durationMs: number
  runBy: string
}

export type TicketEvent =
  | CreatedEvent
  | CommentEvent
  | CommentDeletedEvent
  | StatusChangeEvent
  | AssignedEvent
  | ScriptRunEvent
