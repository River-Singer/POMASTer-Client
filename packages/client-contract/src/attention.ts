/**
 * Attention DTO (PRD §24-26): Attention is the core Human page. Phase 1 is
 * strictly read-only — view / locate / explain. Resolve/Acknowledge actions
 * are deferred to Phase 3 (PRD §26); recommendation ≠ authority (PRD §25).
 */
import type { CliError, CliWarning } from './envelope.ts'

export interface AttentionItem {
  /** Alert code from the POMaster alerts projection (e.g. BASELINE_NOT_CONFIRMED). */
  code: string
  message: string
  hint?: string
  /** True when the alert names a command the Human can run next. */
  actionable: boolean
}

export interface AttentionList {
  schema: 'pomaster.workbench.attention/v1-spike'
  items: AttentionItem[]
  count: number
  byCode: Record<string, number>
  warnings: CliWarning[]
  errors: CliError[]
}
