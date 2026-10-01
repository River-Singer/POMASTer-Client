/**
 * Agent tool batch (M6, PRD §36/§37): high-level tools mapping to Agent
 * INTENT, not a 1:1 CLI dump. Each returns {summary, state, next_action,
 * references}-style payloads — never the raw .pomaster tree. Read-only
 * sub-forms only where Phase-1 discipline applies; plan is compile-judge
 * (never run); finalize/closeout surfaces the kernel's own adjudication
 * (which fails honestly without a human ACCEPT receipt — the tool cannot
 * and must not carry authority, PRD §58).
 */
import { basename } from 'node:path'
import type { PomasterEnvelope } from '@pomaster/client-contract'
import {
  buildAttentionList,
  buildProjectOverview,
  runPomasterJson,
  type PomasterCliOptions,
  type RawAlertsResult,
  type RawStatusResult,
} from '@pomaster/workbench-model'

export const name = 'pomaster-tools'
export const inject = ['tools']

interface ToolsConfig {
  workspaceRoot?: string
  pomasterScriptPath?: string
}

interface ToolCtx {
  tools: { register(definition: unknown): () => void }
}

const jsonText = (v: unknown, limit = 6000): string => JSON.stringify(v, null, 2).slice(0, limit)

function makeRunner(config: ToolsConfig): <T>(args: string[]) => Promise<PomasterEnvelope<T>> {
  const cliOpts: PomasterCliOptions = {
    cwd: config.workspaceRoot ?? process.cwd(),
    scriptPath: config.pomasterScriptPath || undefined,
  }
  return <T,>(args: string[]) => runPomasterJson<T>(args, cliOpts)
}

export function apply(ctx: ToolCtx, config: ToolsConfig = {}): void {
  const run = makeRunner(config)
  const workspaceRoot = config.workspaceRoot ?? process.cwd()

  const register = (definition: Record<string, unknown>): void => { ctx.tools.register(definition) }

  // ---- pomaster_project_overview (PR-1 must-tier) ----
  register({
    name: 'pomaster_project_overview',
    description:
      'Read-only POMaster governance overview: baseline state, active task, attention summary, permit refs, object counts, and the kernel-computed next action. Returns {summary, state, next_action, references} per PRD §37.',
    parameters: { type: 'object', properties: {}, required: [] },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args: unknown, value: { summary?: string } | undefined) => [{ type: 'text', text: String(value?.summary ?? JSON.stringify(value)) }],
    },
    execute: async () => {
      const [status, alerts] = await Promise.all([
        run<RawStatusResult>(['status']),
        run<RawAlertsResult>(['alerts']),
      ])
      const state = buildProjectOverview({ status, alerts, projectName: basename(workspaceRoot) })
      return {
        summary:
          `POMaster ${state.project.name}: baseline ${state.baseline.state}; ` +
          `active task ${state.activeTask.count ? 'present' : 'none'}; attention ${state.attention.total}; ` +
          `next action: ${state.nextAction?.command ?? 'none'}`,
        state,
        next_action: state.nextAction,
        references: state.sources.commands,
      }
    },
  })

  // ---- pomaster_attention (M6) ----
  register({
    name: 'pomaster_attention',
    description: 'Read-only POMaster attention: actionable alerts (payload is the signal; always exit 0) plus the grouped human-decision view. Phase-1 read-only — view/locate/explain only.',
    parameters: { type: 'object', properties: {}, required: [] },
    output: { schema: { type: 'object', additionalProperties: true }, render: (_a: unknown, v: { summary?: string } | undefined) => [{ type: 'text', text: String(v?.summary ?? '') }] },
    execute: async () => {
      const [alerts, groups] = await Promise.all([
        run<RawAlertsResult>(['alerts']),
        run(['view', 'attention']),
      ])
      const list = buildAttentionList(alerts)
      const openGroups = Array.isArray(groups.result) || groups.result !== null
        ? ((groups.result as { groups?: Array<{ kind?: string; items?: unknown[] }> }).groups ?? [])
          .filter((g) => Array.isArray(g.items) && g.items.length > 0)
          .map((g) => g.kind)
        : []
      return {
        summary: `attention: ${list.count} alert(s)${openGroups.length > 0 ? `; non-empty decision groups: ${openGroups.join(', ')}` : ' — clean'}`,
        state: { items: list.items, byCode: list.byCode, groups: groups.result },
        next_action: null,
        references: ['pomaster alerts --json', 'pomaster view attention'],
      }
    },
  })

  // ---- pomaster_next_action (M6) ----
  register({
    name: 'pomaster_next_action',
    description: 'The kernel-computed next action for the project (route id, eight-beat position, exact command, reason). Neutral machine data from status --json — no prompt directives.',
    parameters: { type: 'object', properties: {}, required: [] },
    output: { schema: { type: 'object', additionalProperties: true }, render: (_a: unknown, v: { summary?: string } | undefined) => [{ type: 'text', text: String(v?.summary ?? '') }] },
    execute: async () => {
      const status = await run<RawStatusResult>(['status'])
      const na = status.result?.next_action ?? null
      return {
        summary: na !== null ? `${na.command} — ${na.reason}` : 'no next action routed',
        state: { next_action: na, generation_seq: status.result?.generation_seq ?? null },
        next_action: na,
        references: ['pomaster status --json'],
      }
    },
  })

  // ---- pomaster_context (M6) ----
  register({
    name: 'pomaster_context',
    description: 'Compiled minimal-sufficient context for the current task via the ZERO-WRITE form (context compile --check — never writes .pomaster). Returns role, fingerprint, must/advisory entries with per-ref reasons (why selected).',
    parameters: {
      type: 'object',
      properties: { role: { type: 'string', description: 'role lane, default frontend', enum: ['frontend', 'backend', 'architect', 'designer', 'documenter'] } },
      required: [],
    },
    output: { schema: { type: 'object', additionalProperties: true }, render: (_a: unknown, v: { summary?: string } | undefined) => [{ type: 'text', text: String(v?.summary ?? '') }] },
    execute: async (args: { role?: string }) => {
      const role = args.role ?? 'frontend'
      const check = await run(['context', 'compile', '--role', role, '--change', 'TASK.DSH_WORKBENCH', '--check'])
      const manifest = (check.result as { manifest?: { must_entries?: unknown[]; advisory_entries?: unknown[] } } | null)?.manifest ?? null
      const mustCount = Array.isArray(manifest?.must_entries) ? manifest.must_entries.length : 0
      return {
        summary: `context check (${role}): ok=${String(check.ok)}; must entries ${mustCount}; fingerprint present=${check.result !== null}`,
        state: { ok: check.ok, result: check.result, errors: check.errors },
        next_action: null,
        references: ['pomaster context compile --check'],
      }
    },
  })

  // ---- pomaster_knowledge_search (M6) ----
  register({
    name: 'pomaster_knowledge_search',
    description: 'Search the POMaster knowledge library (curated entries). Returns hit ids/titles — the agent consumes knowledge through spec routing, this tool is for discovery.',
    parameters: { type: 'object', properties: { query: { type: 'string', required: true, description: 'search text' } }, required: ['query'] },
    output: { schema: { type: 'object', additionalProperties: true }, render: (_a: unknown, v: { summary?: string } | undefined) => [{ type: 'text', text: String(v?.summary ?? '') }] },
    execute: async (args: { query: string }) => {
      const search = await run<{ total_in_library?: number; hits?: unknown[] }>(['knowledge', 'search', args.query])
      const hits = search.result?.hits ?? []
      return {
        summary: `knowledge search "${args.query}": ${hits.length} hit(s), library ${search.result?.total_in_library ?? 0}`,
        state: search.result,
        next_action: null,
        references: ['pomaster knowledge search'],
      }
    },
  })

  // ---- pomaster_topology_query (M6) ----
  register({
    name: 'pomaster_topology_query',
    description: 'Query the relationship projection for a governed id: impact closure and family (forward dependencies / reverse dependents). Relationship projection, not a truth store (PRD §14).',
    parameters: { type: 'object', properties: { ref: { type: 'string', required: true, description: 'governed id, e.g. TASK.DSH_WORKBENCH' } }, required: ['ref'] },
    output: { schema: { type: 'object', additionalProperties: true }, render: (_a: unknown, v: { summary?: string } | undefined) => [{ type: 'text', text: String(v?.summary ?? '') }] },
    execute: async (args: { ref: string }) => {
      const [impact, family] = await Promise.all([
        run(['graph', args.ref, '--view', 'impact']),
        run(['graph', args.ref]),
      ])
      const affected = (impact.result as { impact?: { affected?: unknown[] } } | null)?.impact?.affected ?? []
      return {
        summary: `topology ${args.ref}: ${affected.length} affected object(s) in impact closure`,
        state: { impact: impact.result, family: family.result },
        next_action: null,
        references: ['pomaster graph --view impact'],
      }
    },
  })

  // ---- pomaster_component_search (M6) ----
  register({
    name: 'pomaster_component_search',
    description: 'Engineering catalog lookup for component/archetype references before creating new entities (PRD §23: query first, New Entity only without a reuse path). Returns catalog sections and lock state; explain a specific ref on demand.',
    parameters: { type: 'object', properties: { ref: { type: 'string', description: 'optional catalog ref to explain' } }, required: [] },
    output: { schema: { type: 'object', additionalProperties: true }, render: (_a: unknown, v: { summary?: string } | undefined) => [{ type: 'text', text: String(v?.summary ?? '') }] },
    execute: async (args: { ref?: string }) => {
      const catalog = await run<{ entries_total?: number; sections?: Record<string, number> }>(['catalog', 'status'])
      const explain = args.ref !== undefined && args.ref !== '' ? (await run([`catalog`, 'explain', args.ref])).result : null
      const archetypes = catalog.result?.sections?.archetypes ?? 0
      return {
        summary: `catalog: ${catalog.result?.entries_total ?? 0} entries, ${archetypes} archetypes${args.ref !== undefined && args.ref !== '' ? `; explain ${args.ref} attached` : ''}`,
        state: { catalog: catalog.result, explain },
        next_action: null,
        references: ['pomaster catalog status'],
      }
    },
  })

  // ---- pomaster_plan (M6: compile/judge only — NEVER run) ----
  register({
    name: 'pomaster_plan',
    description: 'Judge the task DoD via closeout (compile/judge semantics). NEVER runs a plan; write paths stay behind the kernel\'s own gates and a human ACCEPT receipt. Returns the honest gate matrix (fail-closed).',
    parameters: { type: 'object', properties: {}, required: [] },
    output: { schema: { type: 'object', additionalProperties: true }, render: (_a: unknown, v: { summary?: string } | undefined) => [{ type: 'text', text: String(v?.summary ?? '') }] },
    execute: async () => {
      const closeout = await run(['closeout', 'TASK.DSH_WORKBENCH'])
      return {
        summary: closeout.ok
          ? 'DoD judgment: all gates green — awaiting human acceptance receipt'
          : `DoD judgment: not complete (${closeout.errors.map((e: { code: string }) => e.code).join(', ') || 'see state'})`,
        state: { ok: closeout.ok, errors: closeout.errors, result: closeout.result },
        next_action: closeout.ok ? null : { command: 'resolve gate findings, then re-judge', reason: 'fail-closed until every gate is green and acceptance carries a human receipt' },
        references: ['pomaster closeout'],
      }
    },
  })

  // ---- pomaster_finalize (M6 per PRD §48; authority stays with the kernel + human) ----
  register({
    name: 'pomaster_finalize',
    description: 'Finalize status for the task: what the finalize/replay-adjudication surface sees. Read-only status — finalization decisions remain governed by POMaster authority, not by the agent.',
    parameters: { type: 'object', properties: {}, required: [] },
    output: { schema: { type: 'object', additionalProperties: true }, render: (_a: unknown, v: { summary?: string } | undefined) => [{ type: 'text', text: String(v?.summary ?? '') }] },
    execute: async () => {
      const finalize = await run(['finalize', 'status', 'TASK.DSH_WORKBENCH'])
      return {
        summary: `finalize status: ok=${String(finalize.ok)}; ${jsonText(finalize.result, 200).replace(/\s+/g, ' ')}`,
        state: { ok: finalize.ok, result: finalize.result, errors: finalize.errors },
        next_action: null,
        references: ['pomaster finalize status'],
      }
    },
  })

  void jsonText
}
