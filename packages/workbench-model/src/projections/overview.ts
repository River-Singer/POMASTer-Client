/**
 * ProjectOverview projection (PRD §8): fuse `status --json` + `alerts --json`
 * envelopes into the host-agnostic DTO. Same-source discipline (PRD §61):
 * every field traces to a CLI result field; fields the CLI does not emit are
 * null — the projection never invents state.
 */
import type {
  ActiveTaskRef,
  AttentionSummary,
  BaselineState,
  NextActionRef,
  ObjectCounts,
  PomasterEnvelope,
  ProjectOverview,
  ToolReadiness,
} from '@pomaster/client-contract'

/** Loose passthrough types for the raw CLI results (verified field shapes: POMaster packages/cli/src/status.ts, alerts.ts). */
export interface RawStatusResult {
  state_path?: string
  generation_seq?: number
  objects?: { total?: number; by_kind?: Record<string, number>; by_lifecycle?: Record<string, number> }
  permits?: { unique_active_refs?: string[] }
  baseline_confirmation?: { state?: string }
  next_action?: { route_id?: string; beat?: string; command?: string; reason?: string } | null
  bootstrap_harness?: { readiness?: string; capabilities?: number; tools?: { ready?: number; gaps?: number } | number }
  capability_tip?: string | null
}

export interface RawAlertsResult {
  alerts?: Array<Record<string, unknown>>
}

export interface OverviewInput {
  status: PomasterEnvelope<RawStatusResult>
  alerts: PomasterEnvelope<RawAlertsResult>
  /** Display name; spike derives it from the workspace dir when absent. */
  projectName?: string
  pomasterVersion?: string | null
}

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {}
}

function normalizeBaseline(state: unknown): BaselineState {
  return state === 'confirmed' || state === 'unconfirmed' || state === 'drifted' ? state : 'unknown'
}

function countAlerts(alerts: PomasterEnvelope<RawAlertsResult>): AttentionSummary {
  const items = Array.isArray(alerts.result?.alerts) ? alerts.result.alerts : []
  const byCode: Record<string, number> = {}
  for (const item of items) {
    const rec = asRecord(item)
    const code = typeof rec['code'] === 'string' ? rec['code'] : 'UNKNOWN'
    byCode[code] = (byCode[code] ?? 0) + 1
  }
  return { total: items.length, byCode }
}

function normalizeNextAction(status: PomasterEnvelope<RawStatusResult>): NextActionRef | null {
  const raw = status.result?.next_action
  const rec = asRecord(raw)
  if (raw === null || raw === undefined || Object.keys(rec).length === 0) return null
  return {
    routeId: typeof rec['route_id'] === 'string' ? rec['route_id'] : 'UNKNOWN',
    beat: typeof rec['beat'] === 'string' ? rec['beat'] : '',
    command: typeof rec['command'] === 'string' ? rec['command'] : '',
    reason: typeof rec['reason'] === 'string' ? rec['reason'] : '',
  }
}

function normalizeTools(status: PomasterEnvelope<RawStatusResult>): ToolReadiness {
  const harness = asRecord(status.result?.bootstrap_harness)
  const toolsRaw = harness['tools']
  let readyBindings: number | null = null
  let gaps: number | null = null
  if (typeof toolsRaw === 'object' && toolsRaw !== null) {
    const t = toolsRaw as Record<string, unknown>
    readyBindings = typeof t['ready'] === 'number' ? t['ready'] : null
    gaps = typeof t['gaps'] === 'number' ? t['gaps'] : null
  } else if (typeof toolsRaw === 'number') {
    readyBindings = toolsRaw
  }
  return {
    readiness: typeof harness['readiness'] === 'string' ? harness['readiness'] : null,
    capabilityTip: typeof status.result?.capability_tip === 'string' ? status.result.capability_tip : null,
    capabilities: typeof harness['capabilities'] === 'number' ? harness['capabilities'] : null,
    readyBindings,
    gaps,
  }
}

/** Derive a display name from the state path (…/<workspace>/.pomaster/state/truth-index.json). */
export function projectNameFromStatePath(statePath: string | undefined, fallback = 'POMaster project'): string {
  if (statePath === undefined || statePath === '') return fallback
  const parts = statePath.split(/[\\/]/)
  const idx = parts.indexOf('.pomaster')
  if (idx > 0) return parts[idx - 1] ?? fallback
  return fallback
}

export function buildProjectOverview(input: OverviewInput): ProjectOverview {
  const { status, alerts } = input
  const raw = status.result ?? {}
  const objects = raw.objects ?? {}
  const byKind = objects.by_kind ?? {}
  const taskCount = byKind['task_object'] ?? 0
  const activeTask: ActiveTaskRef = { present: taskCount > 0, count: taskCount }
  const counts: ObjectCounts = {
    total: objects.total ?? 0,
    byKind,
    byLifecycle: objects.by_lifecycle ?? {},
  }
  const sources = ['pomaster status --json', 'pomaster alerts --json']
  const warnings = [...status.warnings, ...alerts.warnings]
  const errors = [
    ...status.errors.map((e) => ({ ...e, code: `status/${e.code}` })),
    ...alerts.errors.map((e) => ({ ...e, code: `alerts/${e.code}` })),
  ]
  return {
    schema: 'pomaster.workbench.overview/v1-spike',
    project: {
      name: input.projectName ?? projectNameFromStatePath(raw.state_path),
      governance: 'pomaster',
      pomasterVersion: input.pomasterVersion ?? null,
    },
    baseline: { state: normalizeBaseline(raw.baseline_confirmation?.state) },
    activeTask,
    permits: { uniqueActiveRefs: raw.permits?.unique_active_refs ?? [] },
    attention: countAlerts(alerts),
    objects: counts,
    generationSeq: typeof raw.generation_seq === 'number' ? raw.generation_seq : -1,
    nextAction: normalizeNextAction(status),
    tools: normalizeTools(status),
    sources: { commands: sources },
    warnings,
    errors,
  }
}
