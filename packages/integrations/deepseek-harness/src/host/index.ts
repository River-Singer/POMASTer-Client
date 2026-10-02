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
import { readdir, readFile } from 'node:fs/promises'
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

const str = (v: unknown): string => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v))

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
      let stories: Array<{ id: string; title: string; name: string; type: string }> = []
      if (react) {
        try {
          const response = await fetch('http://127.0.0.1:6007/index.json')
          const index = (await response.json()) as { entries?: Record<string, { id: string; title: string; name?: string; type?: string }> }
          stories = Object.values(index.entries ?? {}).map((e) => ({ id: e.id, title: e.title, name: e.name ?? '', type: e.type ?? 'story' }))
        } catch { /* index unavailable */ }
      }
      return {
        react: { available: react, base: 'http://127.0.0.1:6007' },
        stories,
        startCommand: 'cd POMaster_VNext && corepack pnpm studio:react:dev',
      }
    })

    getRoute('/api/pomaster/actions', async () => ({
      actions: ACTION_ALLOWLIST.map((a) => ({ id: a.id, label: a.label, authorityNote: a.authorityNote, params: a.params })),
    }))

    // ---- IA Reset (PR-IA-2): Work workspace merged projection ----
    getRoute('/api/pomaster/work', async () => {
      const [review, routing, executions, alerts] = await Promise.all([
        run(['view', 'review', 'TASK.DSH_WORKBENCH']),
        run(['context', 'compile', '--role', 'frontend', '--change', 'TASK.DSH_WORKBENCH', '--check']),
        run(['execution', 'list']),
        run<RawAlertsResult>(['alerts']),
      ])
      return { review: review.result, routing: routing.result, executions: executions.result, alerts: alerts.result }
    })

    getRoute('/api/pomaster/executions', async () => ({
      executions: (await run(['execution', 'list'])).result,
    }))

    // ---- IA Reset (PR-IA-3): Knowledge documents (whitelisted real files) ----
    getRoute('/api/pomaster/knowledge-docs', async (query) => {
      const docDir = `${this.config.workspaceRoot}/doc`
      const requested = query.get('path')
      if (requested !== null && requested !== '') {
        // whitelist: only files that exist in doc/ (no traversal)
        const safe = basename(requested)
        const body = await readFile(`${docDir}/${safe}`, 'utf8').catch(() => null)
        if (body === null) return notFound(`document not found: ${safe}`)
        return { name: safe, body }
      }
      const entries = await readdir(docDir).catch(() => [] as string[])
      const docs = entries.filter((f) => f.endsWith('.md')).map((f) => ({ name: f, group: 'Project Documents' }))
      return {
        docs,
        specTree: [
          { name: 'backend', group: 'Specs' },
          { name: 'frontend', group: 'Specs' },
          { name: 'guides', group: 'Specs' },
        ],
        note: 'MASTer spec tree served under /api/pomaster/master',
      }
    })

    getRoute('/api/pomaster/master-task', async (query) => {
      const dir = query.get('dir') ?? ''
      // whitelist: simple directory name, no traversal
      if (dir === '' || /[^a-zA-Z0-9._-]/.test(dir)) return notFound('invalid task dir')
      const base = `${MASTER}/.trellis/tasks/${dir}`
      const taskJson = await readFile(`${base}/task.json`, 'utf8').then((t) => JSON.parse(t) as Record<string, unknown>).catch(() => null)
      const prd = await readFile(`${base}/prd.md`, 'utf8').catch(() => '')
      const readJsonl = async (file: string): Promise<Array<{ file: string; reason: string }>> => {
        try {
          return (await readFile(`${base}/${file}`, 'utf8')).split(/\r?\n/).filter((l) => l.trim() !== '').map((l) => JSON.parse(l) as { file: string; reason: string })
        } catch { return [] }
      }
      return {
        dir,
        task: taskJson,
        prd: prd.split(/\r?\n/).slice(0, 40).join('\n'),
        implementRefs: await readJsonl('implement.jsonl'),
        checkRefs: await readJsonl('check.jsonl'),
      }
    })

    // ---- MASTer 实测：真实项目治理映射（全部白名单只读路径 + CLI --dir 投影） ----
    const MASTER = 'D:/Vscode Documents/MASTer_master'
    getRoute('/api/pomaster/master', async () => {
      const masterRun = <T,>(args: string[]) => runPomasterJson<T>(args, { cwd: MASTER, scriptPath: this.config.pomasterScriptPath || undefined })
      const [storeStatus, migrateAnalyze] = await Promise.all([
        runPomasterJson<RawStatusResult>(['status'], { cwd: MASTER, scriptPath: this.config.pomasterScriptPath || undefined }),
        runPomasterJson(['migrate', 'trellis-spec', '--analyze', '--spec-root', `${MASTER}/.trellis/spec`], { cwd: MASTER, scriptPath: this.config.pomasterScriptPath || undefined }).catch(() => null),
      ])

      // actual governance lives in Trellis task files — read them read-only
      const tasksDir = `${MASTER}/.trellis/tasks`
      let tasks: Array<Record<string, unknown>> = []
      try {
        const dirs = (await readdir(tasksDir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)
        tasks = (await Promise.all(dirs.map(async (dir): Promise<Record<string, unknown> | null> => {
          try {
            const raw = await readFile(`${tasksDir}/${dir}/task.json`, 'utf8')
            const task = JSON.parse(raw) as Record<string, unknown>
            const countLines = async (file: string): Promise<number> => {
              try {
                const text = await readFile(`${tasksDir}/${dir}/${file}`, 'utf8')
                return text.split(/\r?\n/).filter((l) => l.trim() !== '').length
              } catch { return 0 }
            }
            let prdSummary = ''
            try {
              const prd = await readFile(`${tasksDir}/${dir}/prd.md`, 'utf8')
              const bodyLine = prd.split(/\r?\n/).find((l) => l.trim() !== '' && !l.startsWith('#')) ?? ''
              prdSummary = bodyLine.slice(0, 140)
            } catch { /* no prd */ }
            return {
              ...(task as Record<string, unknown>),
              dir,
              implementRefs: await countLines('implement.jsonl'),
              checkRefs: await countLines('check.jsonl'),
              prdSummary,
            }
          } catch {
            return null
          }
        }))).filter((x): x is Record<string, unknown> => x !== null)
        tasks.sort((a, b) => str(a['dir']).localeCompare(str(b['dir'])))
      } catch { /* tasks dir absent */ }

      let bpHead = ''
      try {
        const bp = await readFile(`${MASTER}/outputs/bp/BP-BLUEPRINT.md`, 'utf8')
        bpHead = bp.split('\n').filter((l) => l.startsWith('#') || l.startsWith('- 蓝图') || l.startsWith('- 权威') || l.startsWith('- 生效')).slice(0, 6).join('\n')
      } catch { /* bp absent */ }

      let manifestLines = 0
      try {
        const manifest = await readFile(`${MASTER}/.trellis/spec/spec-manifest.jsonl`, 'utf8')
        manifestLines = manifest.split(/\r?\n/).filter((l) => l.trim() !== '').length
      } catch { /* manifest absent */ }

      let specDirs: string[] = []
      try {
        specDirs = (await readdir(`${MASTER}/.trellis/spec`, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)
      } catch { /* spec absent */ }

      const byStatus: Record<string, number> = {}
      for (const task of tasks) {
        const s = str(task['status']) || 'unknown'
        byStatus[s] = (byStatus[s] ?? 0) + 1
      }

      // code base size (src, ts/tsx)
      const countCodeFiles = async (root: string): Promise<number> => {
        let count = 0
        const walk = async (dir: string): Promise<void> => {
          const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
          for (const e of entries) {
            if (e.isDirectory()) await walk(`${dir}/${e.name}`)
            else if (/\.(tsx?|jsx?)$/.test(e.name)) count++
          }
        }
        await walk(root)
        return count
      }
      const srcTsFiles = await countCodeFiles(`${MASTER}/src`)

      const architecture = {
        title: 'MASTer 整车成本分析前端（master-vehicle-cost-analysis）',
        groups: [
          { id: 'trellis', title: '开发任务与规范（.trellis）', tone: '#722ed1', col: 1, nodes: [
            { id: 'tasks', title: '.trellis/tasks', sub: tasks.length + ' 个真实任务 · in_progress ' + String(byStatus['in_progress'] ?? 0) + ' · 引用/检查记录齐备' },
            { id: 'spec', title: '.trellis/spec', sub: specDirs.join(' / ') + ' · manifest ' + manifestLines + ' 条' },
            { id: 'workflow', title: 'workflow.md + workspace', sub: '开发流程与工作区日志' },
          ] },
          { id: 'outputs', title: '项目事实与文档（outputs）', tone: '#fa8c16', col: 2, nodes: [
            { id: 'bp', title: 'outputs/bp', sub: 'BP-MASTER-FRONTEND-REFACTOR 1.4.0 · approved' },
            { id: 'frontend', title: 'outputs/frontend', sub: '前端治理产物' },
            { id: 'handoffs', title: 'outputs/handoffs', sub: 'frontend-to-bp / frontend-to-backend' },
          ] },
          { id: 'code', title: '核心代码（src · Feature-Sliced）', tone: '#1677ff', col: 3, nodes: [
            { id: 'app', title: 'src/app' }, { id: 'pages', title: 'src/pages' }, { id: 'features', title: 'src/features' },
            { id: 'entities', title: 'src/entities' }, { id: 'shared', title: 'src/shared' },
          ] },
        ],
        edges: [
          { from: 'bp', to: 'tasks', label: '驱动任务' },
          { from: 'spec', to: 'code', label: '约束实现' },
          { from: 'tasks', to: 'code', label: '实现落地' },
          { from: 'tasks', to: 'frontend', label: '产物落点', dashed: true },
          { from: 'store', to: 'tasks', label: '待映射（gap）', dashed: true },
        ],
      }

return {
        identity: { name: 'master-vehicle-cost-analysis', root: MASTER },
        storeStatus: { ok: storeStatus.ok, routeId: storeStatus.result?.next_action?.route_id ?? null, generationSeq: storeStatus.result?.generation_seq ?? 0, objects: storeStatus.result?.objects ?? null },
        migrateAnalyze: { ok: migrateAnalyze?.ok ?? false, result: migrateAnalyze?.result ?? null, errors: migrateAnalyze?.errors ?? [] },
        trellis: { tasks, tasksByStatus: byStatus, bpHead, specDirs, manifestLines },
        srcTsFiles,
        architecture,
      }
    })

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
