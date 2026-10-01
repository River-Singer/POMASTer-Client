/**
 * Live-update contract restatement (DECISION.DSH08).
 * PRD §33 originally asked for four `*.changed` observables. Grounding found
 * DSH's `ctx.remote.$on` consumes a CLOSED forwarded-event allowlist
 * (packages/api/remotes/src/remote-events.ts API_REMOTE_FORWARDED_EVENTS) —
 * an external bundle cannot add pomaster/* events without forking (forbidden).
 * PRD §51 delegates such deviations to the compatibility layer, so the
 * observable surface is restated as: M1 chooses between a @Remote({mode:'stream'})
 * follow method and unary polling keyed on generation_seq. Note that DSH's
 * git-diff workspace-changes is blind to .pomaster (typically gitignored).
 */

export type WorkbenchChangedTopic = 'project' | 'task' | 'attention' | 'verification'

export interface WorkbenchChangedEvent {
  topic: WorkbenchChangedTopic
  /** POMaster generation_seq at change detection — the polling key. */
  generationSeq: number
}

export type LiveUpdateStrategy =
  | { kind: 'polling'; intervalMs: number }
  | { kind: 'remote-stream'; method: 'follow' }
