/** Topology Compiler v0 (spike)：Vue SFC / routes / api 模块 → Software Graph。
 * 纪律（research.md §2A）：Derived Projection/Cache——携带 fingerprints/observedAt/
 * analyzer version；No Second Truth。解析器为启发式正则（heuristic v0），局限如实标注。
 *
 * Stable Semantic ID（research.md §2.3）：
 *   ROUTE:/path · PAGE:<RouteName> · COMPONENT:@/shared/ui#MasterButton ·
 *   STORE:<module>#<useXxx> · API:<METHOD>:<normalized-path> · DOMAIN:<tag>
 * file path / line range 只作 evidence/navigation，不作 identity。 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

export interface TopoNode {
  id: string
  type: 'route' | 'page' | 'component' | 'store' | 'api' | 'domain'
  name: string
  provenance: 'DECLARED' | 'OBSERVED' | 'DERIVED'
  implementation?: 'observed' | 'contract-only' | 'unknown'
  evidence: Array<{ path: string; line?: number; end_line?: number }>
  contentHash: string
  observedAt: string
  sub?: string
}
export interface TopoEdge {
  id: string
  relation: 'renders' | 'imports' | 'calls' | 'uses-store' | 'handled_by'
  from: string
  to: string
  evidence: Array<{ path: string; line?: number }>
  provenance: 'OBSERVED' | 'DECLARED' | 'DERIVED'
  why: string
}
export interface SoftwareGraph {
  analyzer: string
  generatedAt: string
  sourceFingerprints: Record<string, string>
  nodes: TopoNode[]
  edges: TopoEdge[]
}

const ANALYZER = 'topology-compiler v0.1 (heuristic-regex)'

function sha16(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}

function observedNow(): string {
  return new Date().toISOString()
}

/* ---------------- Vue SFC 启发式解析 ---------------- */

export interface SfcFacts {
  imports: Array<{ name: string; source: string; line: number }>
  templateTags: string[]
}

/** 抽取 script setup 的 import 声明 + template 中实际使用的组件标签。 */
export function parseVueSfc(source: string): SfcFacts {
  const imports: SfcFacts['imports'] = []
  const scriptMatch = /<script[^>]*>([\s\S]*?)<\/script>/.exec(source)
  if (scriptMatch !== null) {
    const re = /^import\s+(?:type\s+)?(?:\{([^}]+)\}|([A-Za-z$][\w$]*))(?:\s*,\s*\{([^}]+)\})?\s+from\s+['"]([^'"]+)['"]/gm
    let m: RegExpExecArray | null
    while ((m = re.exec(scriptMatch[1] ?? '')) !== null) {
      const source_ = m[4] ?? ''
      const line = source.slice(0, m.index).split('\n').length
      const named = (m[1] ?? m[3] ?? '')
        .split(',')
        .map((s) => (s.trim().split(/\s+as\s+/)[0] ?? '').trim())
        .filter((s) => s !== '')
      if (m[2] !== undefined) imports.push({ name: m[2], source: source_, line })
      for (const n of named) if (n !== '') imports.push({ name: n, source: source_, line })
    }
  }
  const templateMatch = /<template>([\s\S]*)<\/template>/.exec(source)
  const templateInner = templateMatch?.[1] ?? ''
  const templateTags: string[] = []
  if (templateInner !== '') {
    const re = /<([A-Z][A-Za-z0-9]*|[a-z][a-z0-9]*-[a-z0-9-]+)(?=[\s/>])/g
    let m: RegExpExecArray | null
    while ((m = re.exec(templateInner)) !== null) templateTags.push(m[1] ?? '')
  }
  return { imports, templateTags }
}

/** kebab-case → PascalCase（ElementPlus / master-button 归一）。 */
export function kebabToPascal(name: string): string {
  return name.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')
}

/* ---------------- appClient 端点抽取 ---------------- */

export interface EndpointCall { method: string; rawPath: string; normalizedPath: string; line: number }

/** 归一 baseURL（/api/v1）与模板参数（${projectId}→:project_id）。 */
export function normalizeApiPath(raw: string): string {
  let p = raw
  p = p.replace(/\$\{projectId\}/g, ':project_id')
  p = p.replace(/\$\{carlineId\}/g, ':carline_id')
  p = p.replace(/\$\{bucId\}/g, ':buc_id')
  p = p.replace(/\$\{partId\}/g, ':part_id')
  p = p.replace(/\$\{\w+\}/g, ':param')
  p = p.replace(/\/+$/, '')
  if (!p.startsWith('/api/')) p = '/api/v1' + p
  return p
}

/** 从 entity api 模块源码抽取 appClient.* 端点调用（含多行模板串）。 */
export function extractEndpointCalls(source: string): EndpointCall[] {
  const calls: EndpointCall[] = []
  const re = /appClient\s*\.\s*(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*[`'"]([^`'"]+)[`'"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source)) !== null) {
    const line = source.slice(0, m.index).split('\n').length
    calls.push({ method: (m[1] ?? 'get').toUpperCase(), rawPath: m[2] ?? '', normalizedPath: normalizeApiPath(m[2] ?? ''), line })
  }
  return calls
}

/* ---------------- barrel 展开（@/shared/ui → 真实组件路径） ---------------- */

export interface BarrelEntry { exportedName: string; realPath: string }

/** 解析 barrel index.ts 的 re-export 行（export { default as X } from './y'）。 */
export function expandBarrel(barrelPath: string): BarrelEntry[] {
  const src = readIfExists2(barrelPath)
  if (src === null) return []
  const out: BarrelEntry[] = []
  const re = /(?:export\s+\{[^}]*?as\s+(\w+)[^}]*?from\s*|export\s+(?:\{\s*)?)(?:default\s+as\s+)?'?([^']*)'?\s*\}|from\s+['"]([^'"]+)['"]/g
  // 简化：逐行匹配 export ... from './...' 抽取 as 名 + from 路径
  const lineRe = /export\s+\{[^}]*as\s+(\w+)\s*[^}]*\}\s*from\s*['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = lineRe.exec(src)) !== null) {
    out.push({ exportedName: m[1] ?? '', realPath: m[2] ?? '' })
  }
  const re2 = /export\s*\{\s*default\s+as\s+(\w+)\s*\}\s*from\s*['"]([^'"]+)['"]/g
  while ((m = re2.exec(src)) !== null) {
    var exportedName2 = m[1] ?? ''
    if (!out.some(function (e) { return e.exportedName === exportedName2 })) out.push({ exportedName: exportedName2, realPath: m[2] ?? '' })
  }
  return out
}

function readIfExists2(p: string): string | null {
  try { return readFileSync(p, 'utf8') } catch { return null }
}

/* ---------------- slice 构建 ---------------- */

export interface SliceGraph extends SoftwareGraph {
  slice: string
  notes: string[]
}

export interface SliceInput {
  masterRoot: string
  pageFile: string
  pageRouteId: string
  pageName: string
  entitiesUsed: Array<{ importName: string; module: string }>
  sharedUiUsed: string[]
}

function shaFile(p: string): string {
  try { return sha16(readFileSync(p, 'utf8')) } catch { return 'absent' }
}

/** 构建单页 Software Graph：Route → Page → (Components|Stores) → APIs。 */
export function buildPageSlice(input: SliceInput): SliceGraph {
  const nodes: TopoNode[] = []
  const edges: TopoEdge[] = []
  const fingerprints: Record<string, string> = {}
  const notes: string[] = []
  const observedAt = observedNow()

  const routeId = 'ROUTE:' + input.pageRouteId.replace('ROUTE:', '')
  nodes.push({
    id: routeId, type: 'route', name: input.pageRouteId,
    provenance: 'DECLARED',
    evidence: [{ path: 'src/app/router/routes.ts' }],
    contentHash: shaFile(join(input.masterRoot, 'src/app/router/routes.ts')),
    observedAt,
  })

  const pageId = 'PAGE:' + input.pageName
  const pageAbs = join(input.masterRoot, 'src/pages', input.pageFile)
  const pageSrc = readFileSync(pageAbs, 'utf8')
  fingerprints['src/pages/' + input.pageFile] = sha16(pageSrc)
  nodes.push({
    id: pageId, type: 'page', name: input.pageName,
    provenance: 'OBSERVED',
    evidence: [{ path: 'src/pages/' + input.pageFile }],
    contentHash: sha16(pageSrc), observedAt,
  })
  edges.push({
    id: routeId + ' -renders-> ' + pageId,
    relation: 'renders', from: routeId, to: pageId,
    evidence: [{ path: 'src/app/router/routes.ts' }],
    provenance: 'DECLARED',
    why: '路由表将该 path 指向此页面组件（lazy import）',
  })

  const sfc = parseVueSfc(pageSrc)
  const templateSet = new Set(sfc.templateTags.map((t) => kebabToPascal(t)))
  const templateKebab = new Set(sfc.templateTags)

  // shared/ui 组件：import 命中 → imports 边；template 观测 → renders 强边
  for (const imp of sfc.imports) {
    if (imp.source !== '@/shared/ui' && imp.source !== '@/shared/grid') continue
    const compId = 'COMPONENT:' + imp.source + '#' + imp.name
    const usedInTemplate = templateSet.has(imp.name) || templateKebab.has(kebabize(imp.name))
    if (!nodes.some((n) => n.id === compId)) {
      nodes.push({
        id: compId, type: 'component', name: imp.name,
        provenance: 'OBSERVED',
        evidence: [{ path: 'src/shared/ui', line: imp.line }],
        contentHash: 'barrel-reexport', observedAt,
      })
    }
    edges.push({
      id: pageId + ' -imports-> ' + compId,
      relation: 'imports', from: pageId, to: compId,
      evidence: [{ path: 'src/pages/' + input.pageFile, line: imp.line }],
      provenance: 'OBSERVED',
      why: 'script setup 静态 import（弱证据——不证明实际渲染）',
    })
    if (usedInTemplate) {
      edges.push({
        id: pageId + ' -renders-> ' + compId,
        relation: 'renders', from: pageId, to: compId,
        evidence: [{ path: 'src/pages/' + input.pageFile }],
        provenance: 'OBSERVED',
        why: 'template 观测到组件标签实际使用（强证据）',
      })
    }
  }

  // entity hooks/api 模块 → calls 边
  for (const ent of input.entitiesUsed) {
    const apiRel = 'src/entities/' + ent.module + '/api.ts'
    const apiSrc = readIfExists2(apiRel)
    if (apiSrc === null) { notes.push('api module absent: ' + apiRel); continue }
    fingerprints['src/entities/' + ent.module + '/api.ts'] = sha16(apiSrc)
    const calls = extractEndpointCalls(apiSrc)
    for (const call of calls) {
      const apiId = 'API:' + call.method + ':' + call.normalizedPath
      if (!nodes.some((n) => n.id === apiId)) {
        nodes.push({
          id: apiId, type: 'api', name: call.method + ' ' + call.normalizedPath,
          provenance: 'DECLARED',
          implementation: 'unknown',
          evidence: [{ path: 'src/entities/' + ent.module + '/api.ts', line: call.line }],
          contentHash: sha16(apiSrc), observedAt,
        })
      }
      edges.push({
        id: pageId + ' -calls-> ' + apiId + '#' + call.line,
        relation: 'calls', from: pageId, to: apiId,
        evidence: [{ path: 'src/entities/' + ent.module + '/api.ts', line: call.line }],
        provenance: 'OBSERVED',
        why: '页面经 entity api 模块调用该端点获取/提交数据',
      })
    }
  }
  return { slice: input.pageName, notes, analyzer: ANALYZER, generatedAt: observedNow(), sourceFingerprints: fingerprints, nodes, edges }
}

function kebabize(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/** 断言辅助：检查 store 节点（slice 2 使用）。 */
export function storeNodeId(module: string, useName: string): string {
  return 'STORE:' + module + '#' + useName
}
