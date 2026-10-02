/**
 * Project-agnostic topology collector (IA Reset PR-IA-5 generalization).
 * For any project registered in host config projects, collects four topology
 * surfaces: routes / API domains (openapi) / task hierarchy (.trellis) / code
 * layers (FSD or top-level). Probes are adaptive; missing surfaces are
 * reported honestly as absent.
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import yaml from 'js-yaml'

export interface ProjectEntry { key: string; name: string; root: string }

export interface RouteRow { name: string; path: string; page: string }
export interface ApiEndpoint { method: string; path: string; summary: string }
export interface ApiDomain { tag: string; endpointCount: number; endpoints: ApiEndpoint[] }
export interface MasterTask { dir: string; id: string; title: string; status: string; priority: string; assignee: string; createdAt: string; parent: string; implementRefs: number; checkRefs: number }
export interface CodeLayerStat { layer: string; files: number }
export interface PageEntry { dir: string; files: number; main: string | null }

export type Surface<T> = { status: 'ok'; data: T } | { status: 'absent'; hint: string }

export interface ProjectTopology {
  project: ProjectEntry
  routes: Surface<{ count: number; routes: RouteRow[]; routerFile: string }>
  openapi: Surface<{ title: string; version: string; pathCount: number; operationCount: number; schemaCount: number; domains: ApiDomain[]; openapiFile: string }>
  tasks: Surface<{ count: number; byStatus: Record<string, number>; tasks: MasterTask[]; tasksDir: string }>
  spec: Surface<{ count: number; byKind: Record<string, number>; manifestFile: string }>
  code: Surface<{ totalFiles: number; layers: CodeLayerStat[]; pages: PageEntry[]; style: 'FSD' | 'top-level' }>
}

const str = (v: unknown): string => (typeof v === 'string' ? v : v === undefined || v === null ? '' : String(v))
const exists = async (p: string): Promise<boolean> => { try { await stat(p); return true } catch { return false } }

async function readIfExists(p: string): Promise<string | null> {
  return readFile(p, 'utf8').catch(() => null)
}

/* ---------------- 路由探测 ---------------- */

const ROUTER_CANDIDATES = (root: string): string[] => [
  join(root, 'src', 'app', 'router', 'routes.ts'),
  join(root, 'src', 'app', 'router', 'index.ts'),
  join(root, 'src', 'router', 'index.ts'),
  join(root, 'src', 'router', 'routes.ts'),
  join(root, 'src', 'routes', 'index.ts'),
]

async function collectRoutes(root: string): Promise<ProjectTopology['routes']> {
  for (const file of ROUTER_CANDIDATES(root)) {
    if (!(await exists(file))) continue
    const src = await readIfExists(file)
    if (src === null) continue
    const routes: RouteRow[] = []
    const re = /name:\s*'([A-Za-z0-9_-]+)'[\s\S]{0,240}?path:\s*'([^']+)'[\s\S]{0,240}?component:\s*(\w+)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(src)) !== null) {
      if (m[1] === undefined || m[2] === undefined || m[3] === undefined) continue
      routes.push({ name: m[1], path: m[2], page: m[3] })
    }
    if (routes.length === 0) {
      // name 在后的变体
      const blocks = src.split(/\{\s*\n/)
      for (const b of blocks) {
        const name = /name:\s*'([A-Za-z0-9_-]+)'/.exec(b)?.[1]
        const path = /path:\s*'([^']+)'/.exec(b)?.[1]
        const component = /component:\s*(\w+)/.exec(b)?.[1]
        if (name !== undefined && path !== undefined && component !== undefined) routes.push({ name, path, page: component })
      }
    }
    if (routes.length > 0) return { status: 'ok', data: { count: routes.length, routes, routerFile: file } }
  }
  return { status: 'absent', hint: '未找到 vue-router/react-router 风格路由表（探测路径：src/app/router、src/router、src/routes）' }
}

/* ---------------- OpenAPI 探测 ---------------- */

const OPENAPI_CANDIDATES = (root: string): string[] => [
  join(root, 'openapi.yaml'),
  join(root, 'api', 'openapi.yaml'),
  join(root, 'doc', 'openapi.yaml'),
]

async function findOpenApi(root: string): Promise<string | null> {
  // 浅递归 doc/**（两层）+ 常见根位置，找第一个 openapi.yaml
  const docDir = join(root, 'doc')
  const candidates: string[] = [join(root, 'openapi.yaml'), join(root, 'api', 'openapi.yaml')]
  try {
    for (const lvl1 of await readdir(docDir, { withFileTypes: true }).catch(() => [])) {
      const p1 = join(docDir, lvl1.name)
      if (!lvl1.isDirectory()) { if (lvl1.name === 'openapi.yaml') candidates.unshift(p1); continue }
      candidates.push(join(p1, 'openapi.yaml'))
      for (const lvl2 of await readdir(p1, { withFileTypes: true }).catch(() => [])) {
        if (!lvl2.isDirectory()) continue
        candidates.push(join(p1, lvl2.name, 'openapi.yaml'))
        candidates.push(join(p1, lvl2.name, 'api-contracts', 'openapi.yaml'))
      }
    }
  } catch { /* doc absent */ }
  for (const cand of candidates) if (await exists(cand)) return cand
  return null
}

interface OpenApiDoc {
  info?: { title?: string; version?: string }
  paths?: Record<string, Record<string, { tags?: string[]; summary?: string }>>
  components?: { schemas?: Record<string, unknown> }
}

async function collectOpenApi(root: string): Promise<ProjectTopology['openapi']> {
  const file = await findOpenApi(root)
  if (file === null) return { status: 'absent', hint: '未找到 openapi.yaml（探测：doc/**/、根、api/）' }
  const src = await readIfExists(file)
  if (src === null) return { status: 'absent', hint: `openapi.yaml 不可读：${file}` }
  const doc = yaml.load(src) as OpenApiDoc | null
  if (doc === null || typeof doc !== 'object') return { status: 'absent', hint: 'openapi.yaml 解析失败' }
  const domains = new Map<string, ApiEndpoint[]>()
  let operationCount = 0
  for (const [path, methods] of Object.entries(doc.paths ?? {})) {
    for (const [method, op] of Object.entries(methods)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue
      operationCount++
      const tag = op?.tags?.[0] ?? 'untagged'
      const list = domains.get(tag) ?? []
      list.push({ method: method.toUpperCase(), path, summary: str(op?.summary) })
      domains.set(tag, list)
    }
  }
  return {
    status: 'ok',
    data: {
      title: str(doc.info?.title) || 'API',
      version: str(doc.info?.version),
      pathCount: Object.keys(doc.paths ?? {}).length,
      operationCount,
      schemaCount: Object.keys(doc.components?.schemas ?? {}).length,
      domains: [...domains.entries()]
        .map(([tag, endpoints]) => ({ tag, endpointCount: endpoints.length, endpoints }))
        .sort((a, b) => b.endpointCount - a.endpointCount),
      openapiFile: file,
    },
  }
}

/* ---------------- 任务探测（.trellis） ---------------- */

async function collectTasks(root: string): Promise<ProjectTopology['tasks']> {
  const tasksDir = join(root, '.trellis', 'tasks')
  if (!(await exists(tasksDir))) return { status: 'absent', hint: '无 .trellis/tasks（任务数据缺失）' }
  const tasks: MasterTask[] = []
  const dirs = (await readdir(tasksDir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)
  for (const dir of dirs) {
    const base = join(tasksDir, dir)
    try {
      const task = JSON.parse(await readFile(join(base, 'task.json'), 'utf8')) as Record<string, unknown>
      const countJsonl = async (f: string): Promise<number> => {
        try { return (await readFile(join(base, f), 'utf8')).split(/\r?\n/).filter((l) => l.trim() !== '').length } catch { return 0 }
      }
      tasks.push({
        dir,
        id: str(task['id']) || dir,
        title: str(task['title']) || dir,
        status: str(task['status']) || 'unknown',
        priority: str(task['priority']),
        assignee: str(task['assignee']),
        createdAt: str(task['createdAt']),
        parent: str(task['parent']),
        implementRefs: await countJsonl('implement.jsonl'),
        checkRefs: await countJsonl('check.jsonl'),
      })
    } catch { /* 目录无 task.json（archive 等）——跳过 */ }
  }
  const byStatus: Record<string, number> = {}
  for (const t of tasks) byStatus[t.status] = (byStatus[t.status] ?? 0) + 1
  if (tasks.length === 0) return { status: 'absent', hint: '.trellis/tasks 存在但无有效 task.json' }
  return { status: 'ok', data: { count: tasks.length, byStatus, tasks, tasksDir } }
}

/* ---------------- 规范 manifest 探测 ---------------- */

async function collectSpec(root: string): Promise<ProjectTopology['spec']> {
  const manifestFile = join(root, '.trellis', 'spec', 'spec-manifest.jsonl')
  if (!(await exists(manifestFile))) return { status: 'absent', hint: '无 .trellis/spec/spec-manifest.jsonl' }
  const src = await readIfExists(manifestFile)
  if (src === null) return { status: 'absent', hint: 'manifest 不可读' }
  const byKind: Record<string, number> = {}
  let count = 0
  for (const line of src.split(/\r?\n/)) {
    if (line.trim() === '') continue
    count++
    try {
      const obj = JSON.parse(line) as Record<string, unknown>
      const kind = str(obj['kind']) || str(obj['type']) || 'other'
      byKind[kind] = (byKind[kind] ?? 0) + 1
    } catch { byKind['unparsed'] = (byKind['unparsed'] ?? 0) + 1 }
  }
  return { status: 'ok', data: { count, byKind, manifestFile } }
}

/* ---------------- 代码分层探测 ---------------- */

async function countCodeFiles(dir: string, depth = 0): Promise<number> {
  if (depth > 6) return 0
  let count = 0
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const e of entries) {
    if (e.isDirectory()) count += await countCodeFiles(join(dir, e.name), depth + 1)
    else if (/\.(ts|tsx|vue|jsx)$/.test(e.name)) count++
  }
  return count
}

async function collectCode(root: string): Promise<ProjectTopology['code']> {
  const srcRoot = join(root, 'src')
  if (!(await exists(srcRoot))) return { status: 'absent', hint: '无 src 目录' }
  const FSD = ['app', 'pages', 'features', 'entities', 'shared']
  const layers: CodeLayerStat[] = []
  let totalFiles = 0
  let fsdHits = 0
  for (const layer of FSD) {
    const dir = join(srcRoot, layer)
    if (!(await exists(dir))) continue
    fsdHits++
    const files = await countCodeFiles(dir)
    layers.push({ layer, files })
    totalFiles += files
  }
  if (fsdHits >= 3) return { status: 'ok', data: { totalFiles, layers, pages: [], style: 'FSD' } }
  // 非 FSD：顶层目录计数
  const tops = (await readdir(srcRoot, { withFileTypes: true })).filter((d) => d.isDirectory())
  for (const top of tops) {
    const files = await countCodeFiles(join(srcRoot, top.name))
    layers.push({ layer: top.name, files })
    totalFiles += files
  }
  return { status: 'ok', data: { totalFiles, layers, pages: [], style: 'top-level' } }
}

/* ---------------- pages 探测（page-* 目录） ---------------- */

export async function collectPages(root: string): Promise<Surface<{ count: number; pages: PageEntry[] }>> {
  const pagesDir = join(root, 'src', 'pages')
  if (!(await exists(pagesDir))) return { status: 'absent', hint: '无 src/pages' }
  const dirs = (await readdir(pagesDir, { withFileTypes: true })).filter((d) => d.isDirectory())
  const pages: PageEntry[] = []
  for (const d of dirs) {
    const dir = join(pagesDir, d.name)
    const files = await countCodeFiles(dir)
    let main: string | null = null
    try {
      main = (await readdir(dir)).find((f) => f.endsWith('.vue')) ?? null
    } catch { /* ignore */ }
    pages.push({ dir: d.name, files, main })
  }
  if (pages.length === 0) return { status: 'absent', hint: 'src/pages 为空' }
  return { status: 'ok', data: { count: pages.length, pages } }
}

/* ---------------- 汇总 ---------------- */

export async function collectProjectTopology(project: ProjectEntry): Promise<ProjectTopology> {
  const root = project.root
  const [routes, openapi, tasks, spec, code] = await Promise.all([
    collectRoutes(root),
    collectOpenApi(root),
    collectTasks(root),
    collectSpec(root),
    collectCode(root),
  ])
  return { project, routes, openapi, tasks, spec, code }
}
