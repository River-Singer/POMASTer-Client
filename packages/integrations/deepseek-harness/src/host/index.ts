/**
 * POMaster host controller (M1-M7): registers authenticated Connection Fetch
 * routes (public plugin surface — `ctx.connection.fetch.register`, the same
 * API session-controller uses for /api/file; see COMPATIBILITY-MATRIX.md).
 * Every route spawns the pomaster CLI via workbench-model and returns the
 * §45 envelope as JSON — the UI never touches .pomaster (PRD §1).
 *
 * POST /api/pomaster/command executes the M7 typed-action allowlist: each
 * action maps to an EXISTING pomaster command with fixed argv shapes; the CLI
 * re-judges all authority (PRD §57 — the client is not a trust boundary).
 */
import { basename } from 'node:path'
import {
  buildProjectOverview,
  runPomasterJson,
  type PomasterCliOptions,
  type RawAlertsResult,
  type RawStatusResult,
} from '@pomaster/workbench-model'
import type { ProjectOverview } from '@pomaster/client-contract'

export interface PomasterHostConfig {
  workspaceRoot: string
  pomasterScriptPath?: string
}

interface RouteReg {
  path: string
  methods: string[]
  requestBody: string
  fetch: (request: Request) => Promise<Response>
}

export const name = 'pomaster-host'

export const inject = ['connection']

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })

const notFound = (message: string): Response =>
  json({ ok: false, result: null, warnings: [], errors: [{ code: 'POMASTER_NOT_FOUND', message }] }, 404)

/** M7 typed-action allowlist: fixed argv templates, no free-form command execution. */
export interface ActionSpec {
  id: string
  label: string
  authorityNote: string
  /** Parameter keys the action needs (rendered as inputs by the Actions page). */
  params: string[]
  build: (params: Record<string, string>) => string[]
}

export const ACTION_ALLOWLIST: readonly ActionSpec[] = [
  {
    id: 'baseline.confirm',
    label: 'Confirm baseline',
    authorityNote: 'Owner gate (R-L). Idempotent: NO_CHANGE when already confirmed and undrifted.',
    params: [],
    build: () => ['baseline', 'confirm'],
  },
  {
    id: 'baseline.ackDrifted',
    label: 'Acknowledge drifted baseline',
    authorityNote: 'Owner manual-change declaration (channel 2) — requires a note; journal BASELINE_ACK. Run only with explicit owner instruction.',
    params: ['note'],
    build: (p) => ['baseline', 'confirm', '--ack-drifted', '--note', p['note'] ?? 'acknowledged via workbench'],
  },
  {
    id: 'task.closeoutJudge',
    label: 'Judge task DoD (closeout)',
    authorityNote: 'DoD judgment — 施加 COMPLETED only when every gate is green AND a human ACCEPT receipt covers the task.',
    params: [],
    build: () => ['closeout', 'TASK.DSH_WORKBENCH'],
  },
  {
    id: 'decision.accept',
    label: 'Accept discovery decision',
    authorityNote: 'Discovery decision ACCEPT — adopts the recorded recommendation; kernel re-judges grounding and frontier.',
    params: ['decisionId'],
    build: (p) => ['brainstorm', 'decide', 'dsh-workbench', '--answer', p['decisionId'] ?? '', '--accept'],
  },
  {
    id: 'decision.value',
    label: 'Answer discovery decision with a value',
    authorityNote: 'Discovery decision CHANGE — records a human-provided option; downstream decisions re-ground.',
    params: ['decisionId', 'value'],
    build: (p) => ['brainstorm', 'decide', 'dsh-workbench', '--answer', p['decisionId'] ?? '', '--value', p['value'] ?? ''],
  },
] as const

export class PomasterController {
  static inject = ['connection']

  private declare config: PomasterHostConfig

  constructor(ctx: unknown, config: PomasterHostConfig) {
    this.config = config
    const cliOpts: PomasterCliOptions = {
      cwd: config.workspaceRoot,
      scriptPath: config.pomasterScriptPath || undefined,
    }
    const run = <T,>(args: string[]) => runPomasterJson<T>(args, cliOpts)

    const connection = (ctx as {
      connection: { fetch: { register(reg: RouteReg): () => void } }
      effect(fn: () => () => void, name?: string): void
    })

    const getRoute = (path: string, handler: (query: URLSearchParams) => Promise<unknown>): void => {
      const dispose = connection.connection.fetch.register({
        path,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: async (request) => {
          try {
            return json(await handler(new URL(request.url).searchParams))
          } catch (error) {
            return json({ ok: false, result: null, warnings: [], errors: [{ code: 'POMASTER_ROUTE_FAILED', message: String(error) }] }, 502)
          }
        },
      })
      connection.effect(() => dispose, `pomaster: ${path}`)
    }

    const overview = async (): Promise<ProjectOverview> => {
      const [status, alerts] = await Promise.all([
        run<RawStatusResult>(['status']),
        run<RawAlertsResult>(['alerts']),
      ])
      return buildProjectOverview({ status, alerts, projectName: basename(this.config.workspaceRoot) })
    }

    getRoute('/api/pomaster/overview', () => overview())

    getRoute('/api/pomaster/tasks', async () => ({
      review: (await run(['view', 'review', 'TASK.DSH_WORKBENCH'])).result,
      attention: (await run(['view', 'attention'])).result,
    }))

    getRoute('/api/pomaster/attention', async (query) => ({
      alerts: (await run<RawAlertsResult>(['alerts'])).result,
      groups: (await run(['view', 'attention'])).result,
      topic: query.get('topic'),
    }))

    getRoute('/api/pomaster/knowledge', async (query) => {
      const q = query.get('q') ?? ''
      return {
        catalog: (await run(['catalog', 'status'])).result,
        search: (await run(['knowledge', 'search', q])).result,
        query: q,
      }
    })

    getRoute('/api/pomaster/routing', async () => ({
      // zero-write form (verified: only --check avoids .pomaster/state/contexts writes)
      check: (await run(['context', 'compile', '--role', 'frontend', '--change', 'TASK.DSH_WORKBENCH', '--check'])).result,
    }))

    getRoute('/api/pomaster/topology', async (query) => {
      const ref = query.get('ref') ?? 'TASK.DSH_WORKBENCH'
      const [impact, family] = await Promise.all([
        run(['graph', ref, '--view', 'impact']),
        run(['graph', ref]),
      ])
      return { ref, impact: impact.result, family: family.result, impactErrors: impact.errors }
    })

    getRoute('/api/pomaster/verification', async () => {
      // closeout while gates are not green returns an ok:false envelope — that
      // failure listing IS the honest verification matrix; pass it through raw.
      const [closeout, finalize, tools] = await Promise.all([
        run(['closeout', 'TASK.DSH_WORKBENCH']),
        run(['finalize', 'status', 'TASK.DSH_WORKBENCH']),
        run(['tools', 'list']),
      ])
      return { closeout, finalize, tools }
    })

    getRoute('/api/pomaster/evidence', async () => ({
      inspect: (await run(['inspect', 'TASK.DSH_WORKBENCH'])).result,
      ledger: (await run(['ledger', 'list'])).result,
    }))

    getRoute('/api/pomaster/components', async (query) => {
      const ref = query.get('ref')
      const catalog = (await run(['catalog', 'status'])).result
      const explain = ref !== null && ref !== '' ? (await run(['catalog', 'explain', ref])).result : null
      return { catalog, explain }
    })

    getRoute('/api/pomaster/theme', async () => {
      // Canonical POMaster design-token presets (baseline asset, official seeded theme).
      const preview = await run<{
        entries?: Array<{ key: string; preset_value: string; current_value: string }>
        denominator?: Record<string, unknown>
      }>(['preset', 'preview', '--family', 'design-tokens'])
      const entries = preview.result?.entries ?? []
      const tokens: Record<string, string> = {}
      for (const e of entries) tokens[e.key] = e.current_value ?? e.preset_value
      return { tokens, denominator: preview.result?.denominator ?? null }
    })

    getRoute('/api/pomaster/studio-status', async () => {
      // Probe the local studio-react Storybook dev server (port 6007) so the
      // Components page can embed it live or show start guidance.
      const probe = async (port: number): Promise<boolean> => {
        try {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), 1500)
          const response = await fetch(`http://127.0.0.1:${port}/index.html`, { signal: controller.signal })
          clearTimeout(timer)
          return response.ok
        } catch {
          return false
        }
      }
      const react = await probe(6007)
      return {
        react: { available: react, base: `http://127.0.0.1:6007` },
        startCommand: 'cd POMaster_VNext && corepack pnpm studio:react:dev',
      }
    })

    getRoute('/api/pomaster/actions', async () => ({
      actions: ACTION_ALLOWLIST.map((a) => ({ id: a.id, label: a.label, authorityNote: a.authorityNote, params: a.params })),
    }))

    const commandDispose = connection.connection.fetch.register({
      path: '/api/pomaster/command',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: async (request) => {
        try {
          const body = (await request.json()) as { actionId?: string; params?: Record<string, string> }
          const spec = ACTION_ALLOWLIST.find((a) => a.id === body.actionId)
          if (spec === undefined) {
            return json({ ok: false, result: null, warnings: [], errors: [{ code: 'POMASTER_ACTION_UNKNOWN', message: `actionId ${String(body.actionId)} is not in the allowlist` }] }, 400)
          }
          const argv = spec.build(body.params ?? {})
          if (argv.some((a) => a === '')) {
            return json({ ok: false, result: null, warnings: [], errors: [{ code: 'POMASTER_ACTION_PARAMS', message: 'missing required params', hint: spec.authorityNote }] }, 400)
          }
          return json(await run(argv))
        } catch (error) {
          return json({ ok: false, result: null, warnings: [], errors: [{ code: 'POMASTER_ROUTE_FAILED', message: String(error) }] }, 502)
        }
      },
    })
    connection.effect(() => commandDispose, 'pomaster: /api/pomaster/command')
  }
}

export default PomasterController

// keep notFound referenced for future routes without tripping noUnusedLocals in some configs
void notFound
