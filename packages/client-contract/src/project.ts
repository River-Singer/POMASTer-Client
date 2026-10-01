/**
 * ProjectOverview DTO (PRD §8): 30-second project status for a Human who has
 * never read the kernel. Every field is a projection of existing POMaster
 * state — this contract never introduces new Overview State (PRD §8 禁令).
 * Source commands: `pomaster status --json` + `pomaster alerts --json`.
 */
import type { CliError, CliWarning } from './envelope.ts'

export type BaselineState = 'confirmed' | 'unconfirmed' | 'drifted' | 'unknown'

export interface NextActionRef {
  routeId: string
  beat: string
  command: string
  reason: string
}

export interface ObjectCounts {
  total: number
  byKind: Record<string, number>
  byLifecycle: Record<string, number>
}

export interface ActiveTaskRef {
  /** True when ≥1 task_object exists in the store. */
  present: boolean
  count: number
}

export interface AttentionSummary {
  total: number
  byCode: Record<string, number>
}

export interface ToolReadiness {
  readiness: string | null
  capabilityTip: string | null
  capabilities: number | null
  readyBindings: number | null
  gaps: number | null
}

export interface ProjectOverview {
  /** Contract version tag — bump on breaking shape change. */
  schema: 'pomaster.workbench.overview/v1-spike'
  project: {
    name: string
    governance: 'pomaster'
    pomasterVersion: string | null
  }
  baseline: { state: BaselineState }
  activeTask: ActiveTaskRef
  permits: { uniqueActiveRefs: string[] }
  attention: AttentionSummary
  objects: ObjectCounts
  generationSeq: number
  nextAction: NextActionRef | null
  tools: ToolReadiness
  /** Provenance: which CLI invocations produced this projection (PRD §61 same-source discipline). */
  sources: { commands: string[] }
  warnings: CliWarning[]
  errors: CliError[]
}
