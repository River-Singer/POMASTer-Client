import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { getJSON, postCommand, type CommandEnvelope } from './api.ts'
import { WORKBENCH_CSS } from './styles.ts'
import type { Translate } from './i18n.ts'
import { GroupDiagram, type DiagEdge, type DiagGroup } from './diagram.tsx'

/* ============================================================ primitives */

type AnyRecord = Record<string, unknown>

const isRec = (v: unknown): v is AnyRecord => typeof v === 'object' && v !== null

function Badge(props: { tone: 'ok' | 'warn' | 'bad' | 'neutral'; children: React.ReactNode }): React.ReactElement {
  return <span className="pmwb-badge" data-tone={props.tone === 'neutral' ? undefined : props.tone}>{props.children}</span>
}

function toneFor(verdict: string | undefined): 'ok' | 'warn' | 'bad' | 'neutral' {
  if (verdict === 'passed' || verdict === 'confirmed' || verdict === 'VERIFIED') return 'ok'
  if (verdict === undefined) return 'neutral'
  if (['warning', 'not_run', 'pending', 'UNVERIFIED', 'unconfirmed', 'PROPOSED'].includes(verdict)) return 'warn'
  if (['failed', 'drifted', 'REJECTED'].includes(verdict)) return 'bad'
  return 'neutral'
}

function Card(props: { title?: string; children: React.ReactNode; meta?: string }): React.ReactElement {
  return (
    <div className="pmwb-card">
      {props.title !== undefined && <h3>{props.title}</h3>}
      {props.meta !== undefined && <div className="pmwb-muted" style={{ marginBottom: 8 }}>{props.meta}</div>}
      {props.children}
    </div>
  )
}

function KV(props: { rows: Array<[string, React.ReactNode]> }): React.ReactElement {
  return (
    <dl className="pmwb-kv">
      {props.rows.map(([k, v]) => (
        <React.Fragment key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </React.Fragment>
      ))}
    </dl>
  )
}

function SectionTitle(props: { children: React.ReactNode }): React.ReactElement {
  return <div className="pmwb-sec-title">{props.children}</div>
}

/** Document-style page title: date + human summary. */
function DocTitle(props: { summary: string; sub?: string }): React.ReactElement {
  const date = new Date()
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="pmwb-doc-title">{dateStr} · {props.summary}</div>
      {props.sub !== undefined && <div className="pmwb-doc-sub">{props.sub}</div>}
    </div>
  )
}

/** Horizontal progress bar with count caption. */
function ProgressBar(props: { value: number; total: number; caption?: string; tone?: 'ok' | 'warn' | 'bad' }): React.ReactElement {
  const pct = props.total > 0 ? Math.round((props.value / props.total) * 100) : 0
  return (
    <div className="pmwb-progress-row">
      <div className="pmwb-progress" data-tone={props.tone}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <span className="pmwb-muted" style={{ whiteSpace: 'nowrap' }}>
        {props.caption ?? `${props.value}/${props.total} · ${pct}%`}
      </span>
    </div>
  )
}

/** Stacked ratio bar with legend. */
function StackedBar(props: { segments: Array<{ label: string; value: number; color: string }>; total?: number }): React.ReactElement {
  const total = props.total ?? props.segments.reduce((acc, s) => acc + s.value, 0)
  return (
    <div>
      <div className="pmwb-stacked">
        {props.segments.map((s) => (
          <span key={s.label} style={{ width: total > 0 ? `${(s.value / total) * 100}%` : '0%', background: s.color }} />
        ))}
      </div>
      <div className="pmwb-legend">
        {props.segments.map((s) => (
          <span key={s.label}><i style={{ background: s.color }} />{s.label} · {s.value}</span>
        ))}
      </div>
    </div>
  )
}

function EnvelopeErrors(props: { errors: Array<{ code: string; message: string; hint?: string }> }): React.ReactElement {
  if (props.errors.length === 0) return <span />
  return (
    <div>
      {props.errors.map((e, i) => (
        <div className="pmwb-err" key={i}>
          {e.message}
          {e.hint !== undefined && <div className="pmwb-muted">hint: {e.hint}</div>}
        </div>
      ))}
    </div>
  )
}

interface Loadable<T> { data: T | null; error: string | null }

function usePageData<T>(fetcher: () => Promise<T>, deps: React.DependencyList): Loadable<T> & { reload: () => void } {
  const [state, setState] = useState<Loadable<T>>({ data: null, error: null })
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, error: null }))
    fetcher().then(
      (data) => { if (alive) setState({ data, error: null }) },
      (error) => { if (alive) setState({ data: null, error: String((error as Error)?.message ?? error) }) },
    )
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])
  return { ...state, reload }
}

const str = (v: unknown): string => (v === undefined || v === null ? '—' : typeof v === 'string' ? v : JSON.stringify(v))

/** Truncate long text with an expandable full view. */
function LongText(props: { text: string; limit?: number }): React.ReactElement {
  const limit = props.limit ?? 90
  const [open, setOpen] = useState(false)
  if (props.text.length <= limit) return <span>{props.text}</span>
  return (
    <span>
      {open ? props.text : `${props.text.slice(0, limit)}…`}
      {' '}
      <a onClick={() => setOpen(!open)} style={{ color: 'var(--tk-color-brand-primary,#1677ff)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        {open ? '收起' : '展开全文'}
      </a>
    </span>
  )
}

/* ============================================================ design tokens (POMaster preset) */

interface ThemePayload { tokens: Record<string, string> }

/** Token values are unitless numbers for px-grouped axes (radius/spacing/size/density);
 * CSS custom properties need explicit units or the consuming declaration is invalid. */
function tokenValue(key: string, value: string): string {
  const pxGroups = /^(radius|spacing|density|typography\.size)\./
  if (pxGroups.test(key) && /^\d+(\.\d+)?$/.test(value.trim())) return `${value.trim()}px`
  return value
}

function tokenVars(tokens: Record<string, string>): React.CSSProperties {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(tokens)) {
    out[`--tk-${key.replace(/[._]/g, '-')}`] = tokenValue(key, value)
  }
  return out as unknown as React.CSSProperties
}

function useDesignTokens(): React.CSSProperties {
  const [vars, setVars] = useState<React.CSSProperties>({})
  useEffect(() => {
    let alive = true
    getJSON<ThemePayload>('/api/pomaster/theme').then(
      (payload) => { if (alive) setVars(tokenVars(payload.tokens ?? {})) },
      () => { /* seeded fallbacks in the stylesheet already match the preset */ },
    )
    return () => { alive = false }
  }, [])
  return vars
}

/* ============================================================ Overview (M2) */

interface OverviewData {
  project: { name: string; pomasterVersion: string | null }
  baseline: { state: string }
  activeTask: { present: boolean; count: number }
  permits: { uniqueActiveRefs: string[] }
  attention: { total: number; byCode: Record<string, number> }
  objects: { total: number; byKind: Record<string, number>; byLifecycle: Record<string, number> }
  generationSeq: number
  nextAction: { routeId: string; beat: string; command: string; reason: string } | null
  tools: { readiness: string | null; capabilityTip: string | null; capabilities: number | null; readyBindings: number | null; gaps: number | null }
  errors: Array<{ code: string; message: string }>
}

const SEGMENT_COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16']

/** Current-project architecture (pomaster client): what the Workbench actually is. */
const CLIENT_ARCH: { groups: DiagGroup[]; edges: DiagEdge[] } = {
  groups: [
    { id: 'ui', title: 'DSH Web · Workbench 面板', tone: '#1677ff', col: 1, nodes: [
      { id: 'panel', title: 'Workbench UI', sub: '10 页 · 语言跟随 · 设计预设' },
      { id: 'tools', title: 'Agent Tools', sub: 'pomaster_* ×9' },
    ] },
    { id: 'host', title: 'DSH Host（插件层）', tone: '#722ed1', col: 2, nodes: [
      { id: 'ctrl', title: 'PomasterController', sub: 'Connection Fetch 路由' },
      { id: 'allow', title: 'Typed Actions', sub: 'M7 allowlist' },
    ] },
    { id: 'core', title: 'POMaster CLI / Kernel', tone: '#52c41a', col: 3, nodes: [
      { id: 'cli', title: 'pomaster --json', sub: 'status/alerts/view/graph/closeout' },
      { id: 'state', title: '.pomaster state', sub: '20 objects · seq 14' },
    ] },
  ],
  edges: [
    { from: 'panel', to: 'ctrl', label: 'fetch /api/pomaster/*' },
    { from: 'tools', to: 'ctrl', label: 'inject' },
    { from: 'ctrl', to: 'cli', label: 'subprocess --json' },
  ],
}

function OverviewPage(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const { data, error, reload } = usePageData<OverviewData>(() => getJSON('/api/pomaster/overview'), [])
  useEffect(() => {
    const timer = setInterval(reload, 10_000)
    return () => clearInterval(timer)
  }, [reload])
  if (error !== null) return <div className="pmwb-err">{t('tab.overview')}: {error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  const lifecycle = data.objects.byLifecycle ?? {}
  const lifecycleSegments = Object.entries(lifecycle).map(([k, v], i) => ({ label: k, value: v as number, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] ?? '#1677ff' }))
  return (
    <div>
      <div className="pmwb-actions">
        <button className="pmwb-btn" onClick={reload}>{t('common.refresh')}</button>
        <span className="pmwb-muted">{t('common.polls')}</span>
      </div>
      <Card title={t('overview.project')}>
        <KV rows={[
          [t('overview.name'), data.project.name],
          [t('overview.baseline'), <Badge tone={toneFor(data.baseline.state)}>{data.baseline.state}</Badge>],
          [t('overview.activeTask'), data.activeTask.present ? t('overview.activeCount', { n: data.activeTask.count }) : <span className="pmwb-muted">{t('overview.none')}</span>],
          [t('overview.attention'), data.attention.total === 0 ? <Badge tone="ok">{t('common.clean')}</Badge> : `${data.attention.total}`],
          [t('overview.objects'), `${data.objects.total}`],
          [t('overview.stage'), <Badge tone="warn">{t('overview.stageName')}</Badge>],
        ]} />
      </Card>
      <div className="pmwb-grid2">
        <Card title={t('overview.objectMix')}>
          <StackedBar segments={lifecycleSegments} total={data.objects.total} />
        </Card>
        <Card title={t('overview.tools')}>
          <KV rows={[
            [t('overview.readiness'), data.tools.readiness ?? t('common.none')],
            [t('overview.capabilities'), data.tools.capabilities ?? t('common.none')],
            [t('overview.gaps'), data.tools.gaps ?? t('common.none')],
          ]} />
        </Card>
      </div>
      {data.nextAction !== null && (
        <Card title={t('overview.nextAction')}>
          <div>{data.nextAction.reason}</div>
          <div className="pmwb-mono pmwb-muted" style={{ marginTop: 6 }}>{data.nextAction.command}</div>
        </Card>
      )}
      <SectionTitle>{t('overview.architecture')}</SectionTitle>
      <Card>
        <GroupDiagram groups={CLIENT_ARCH.groups} edges={CLIENT_ARCH.edges} compact />
      </Card>
    </div>
  )
}

/* ============================================================ Tasks (M2, document-style) */

interface AcceptanceRow { criterion?: string; claim?: string; claim_verdict?: string; satisfied?: boolean }

function TasksPage(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const { data, error, reload } = usePageData<AnyRecord>(() => getJSON('/api/pomaster/tasks'), [])
  if (error !== null) return <div className="pmwb-err">{t('tab.tasks')}: {error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  const review = isRec(data['review']) ? (data['review'] as AnyRecord) : null
  const expected = isRec(review?.['expected']) ? (review?.['expected'] as AnyRecord) : null
  const acceptance = Array.isArray(expected?.['acceptance']) ? (expected?.['acceptance'] as AcceptanceRow[]) : []
  const verified = acceptance.filter((a) => a.satisfied === true).length
  const intent = str(expected?.['intent'])
  const steps = Array.isArray(review?.['steps']) ? (review?.['steps'] as AnyRecord[]) : []
  return (
    <div>
      <div className="pmwb-actions"><button className="pmwb-btn" onClick={reload}>{t('common.refresh')}</button></div>
      <DocTitle summary="POMaster 工作台 · 客户端化插件" sub="这个任务在做什么、验收了没有，一页看完" />
      {intent !== '—' && (
        <Card title={t('doc.goal')}>
          <p className="pmwb-para"><LongText text={intent} limit={90} /></p>
        </Card>
      )}
      <Card title={t('tasks.acceptance')}>
        <div className="pmwb-progress-row" style={{ marginBottom: 10 }}>
          <span className="pmwb-muted">{t('tasks.acceptanceProgress')}</span>
        </div>
        <ProgressBar value={verified} total={acceptance.length} tone={verified === acceptance.length ? 'ok' : 'warn'} />
        <div style={{ marginTop: 4 }}>
          {verified === acceptance.length && acceptance.length > 0
            ? <Badge tone="ok">{t('tasks.allVerified')}</Badge>
            : <Badge tone="warn">{t('tasks.pending')}</Badge>}
        </div>
        <ul className="pmwb-check" style={{ marginTop: 10 }}>
          {acceptance.map((a, i) => (
            <li key={i}>
              <span className="pmwb-check-mark" data-ok={String(a.satisfied === true)}>{a.satisfied === true ? '✓' : '…'}</span>
              <div>
                <div>{str(a['criterion'])}</div>
                <div className="pmwb-muted">
                  {a.satisfied === true ? t('tasks.verified') : t('tasks.pending')}
                  {a['claim'] !== undefined && <span> · {str(a['claim'])}</span>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      {steps.length > 0 && (
        <details className="pmwb-fold">
          <summary>{t('tasks.steps')} · {steps.length}</summary>
          <div className="pmwb-fold-body">
            {steps.map((s, i) => (
              <Card key={i} title={str(s['title'])}>
                <ul className="pmwb-list">
                  {(Array.isArray(s['lines']) ? (s['lines'] as unknown[]) : []).map((line, j) => (
                    <li key={j}><LongText text={str(line)} limit={140} /></li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

/* ============================================================ Attention (M2) */

function AttentionPage(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const { data, error, reload } = usePageData<AnyRecord>(() => getJSON('/api/pomaster/attention'), [])
  useEffect(() => {
    const timer = setInterval(reload, 10_000)
    return () => clearInterval(timer)
  }, [reload])
  if (error !== null) return <div className="pmwb-err">{t('tab.attention')}: {error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  const alerts = isRec(data['alerts']) && Array.isArray((data['alerts'] as AnyRecord)['alerts'])
    ? ((data['alerts'] as AnyRecord)['alerts'] as AnyRecord[])
    : []
  const groups = Array.isArray(data['groups']) ? (data['groups'] as AnyRecord[]) : []
  const nonEmpty = groups.filter((g) => Array.isArray(g['items']) && (g['items'] as unknown[]).length > 0)
  return (
    <div>
      <div className="pmwb-actions">
        <button className="pmwb-btn" onClick={reload}>{t('common.refresh')}</button>
        <span className="pmwb-muted">{t('attention.phase1')}</span>
      </div>
      {alerts.length === 0 && nonEmpty.length === 0 ? (
        <Card><div className="pmwb-empty">{t('common.clean')}</div></Card>
      ) : (
        <>
          {alerts.length > 0 && (
            <Card title={t('attention.envelope', { n: alerts.length })}>
              <table className="pmwb-table">
                <thead><tr><th>{t('attention.message')}</th><th>{t('attention.hint')}</th></tr></thead>
                <tbody>
                  {alerts.map((a, i) => (
                    <tr key={i}>
                      <td>{str(a['message'])}</td>
                      <td className="pmwb-muted">{str(a['hint'])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
          {nonEmpty.map((g, i) => (
            <Card key={i} title={str(g['label'])}>
              <ul className="pmwb-list">{(g['items'] as AnyRecord[]).map((it, j) => <li key={j}>{str(it['summary'] ?? it['title'] ?? JSON.stringify(it))}</li>)}</ul>
            </Card>
          ))}
        </>
      )}
    </div>
  )
}

/* ============================================================ Knowledge (M2) */

function KnowledgePage(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const { data, error } = usePageData<AnyRecord>(() => getJSON(`/api/pomaster/knowledge?q=${encodeURIComponent(query)}`), [query])
  if (error !== null) return <div className="pmwb-err">{t('tab.knowledge')}: {error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  const catalog = isRec(data['catalog']) ? (data['catalog'] as AnyRecord) : null
  const sections = isRec(catalog?.['sections']) ? (catalog?.['sections'] as AnyRecord) : {}
  const sectionEntries = Object.entries(sections)
  const search = isRec(data['search']) ? (data['search'] as AnyRecord) : null
  const hits = Array.isArray(search?.['hits']) ? (search?.['hits'] as AnyRecord[]) : []
  return (
    <div>
      <div className="pmwb-actions">
        <input className="pmwb-input" placeholder={t('knowledge.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="pmwb-btn" onClick={() => setQuery(q)}>{t('common.search')}</button>
      </div>
      {catalog !== null && (
        <Card title={t('knowledge.catalog')} meta={t('knowledge.humanVsAgent')}>
          <StackedBar segments={sectionEntries.map(([k, v], i) => ({ label: k, value: v as number, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length] ?? '#52c41a' }))} total={catalog['entries_total'] as number} />
          <div className="pmwb-muted" style={{ marginTop: 8 }}>
            {t('knowledge.lock')}: {str(isRec(catalog['lock_verification']) ? (catalog['lock_verification'] as AnyRecord)['ok'] : null)}
          </div>
        </Card>
      )}
      <Card title={t('knowledge.hits', { q: str(data['query']) })}>
        {hits.length === 0 ? <div className="pmwb-empty">{t('common.empty')}</div> : (
          <ul className="pmwb-list">{hits.map((h, i) => <li key={i}>{str(h['id'] ?? h)}</li>)}</ul>
        )}
      </Card>
    </div>
  )
}

/* ============================================================ Routing (M3) */

function RoutingPage(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const { data, error, reload } = usePageData<AnyRecord>(() => getJSON('/api/pomaster/routing'), [])
  if (error !== null) return <div className="pmwb-err">{t('tab.routing')}: {error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  const check = isRec(data['check']) ? (data['check'] as AnyRecord) : null
  const manifest = isRec(check?.['manifest']) ? (check?.['manifest'] as AnyRecord) : null
  const must = Array.isArray(manifest?.['must_entries']) ? (manifest?.['must_entries'] as AnyRecord[]) : []
  const advisory = Array.isArray(manifest?.['advisory_entries']) ? (manifest?.['advisory_entries'] as AnyRecord[]) : []
  return (
    <div>
      <div className="pmwb-actions"><button className="pmwb-btn" onClick={reload}>{t('common.refresh')}</button></div>
      {manifest === null && <div className="pmwb-empty">{t('routing.noManifest')}</div>}
      {manifest !== null && (
        <>
          <Card title={t('routing.budget')}>
            <KV rows={[
              [t('routing.selected'), must.length],
              [t('routing.advisory'), advisory.length],
            ]} />
          </Card>
          <Card title={t('routing.whySelected')}>
            {must.length === 0 ? <div className="pmwb-empty">{t('common.none')}</div> : (
              <ul className="pmwb-check">
                {must.map((m, i) => (
                  <li key={i}>
                    <span className="pmwb-check-mark" data-ok="true">✓</span>
                    <div>
                      <div className="pmwb-mono">{str(m['ref'])}</div>
                      <div className="pmwb-muted">{str(m['reason'])}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {advisory.length > 0 && (
            <Card title={t('routing.whyAdvisory')}>
              <ul className="pmwb-list">{advisory.map((m, i) => <li key={i}><span className="pmwb-mono">{str(m['ref'])}</span> — {str(m['reason'])}</li>)}</ul>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

/* ============================================================ Topology (M4) */

function TopologyPage(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const [refInput, setRefInput] = useState('TASK.DSH_WORKBENCH')
  const [ref, setRef] = useState('TASK.DSH_WORKBENCH')
  const { data, error } = usePageData<AnyRecord>(() => getJSON(`/api/pomaster/topology?ref=${encodeURIComponent(ref)}`), [ref])
  const master = usePageData<AnyRecord>(() => getJSON('/api/pomaster/master'), [])
  if (error !== null) return <div className="pmwb-err">{t('tab.topology')}: {error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  const masterArch = isRec(master.data?.['architecture']) ? (master.data?.['architecture'] as { title: string; groups: DiagGroup[]; edges: DiagEdge[] }) : null
  return (
    <div>
      <SectionTitle>{t('topology.architecture')}</SectionTitle>
      {masterArch !== null ? (
        <Card meta={masterArch.title}>
          <GroupDiagram groups={masterArch.groups} edges={masterArch.edges} />
        </Card>
      ) : (
        <div className="pmwb-empty">{t('common.loading')}</div>
      )}
      <SectionTitle>{t('topology.impactQuery')}</SectionTitle>
      <div className="pmwb-actions">
        <input className="pmwb-input pmwb-mono" value={refInput} onChange={(e) => setRefInput(e.target.value)} />
        <button className="pmwb-btn" onClick={() => setRef(refInput)}>{t('common.query')}</button>
      </div>
      <Card title={t('topology.impact')}>
        <div>
          {(() => {
            const impact = isRec(data['impact']) ? (data['impact'] as AnyRecord) : null
            const root = isRec(impact?.['impact']) ? ((impact?.['impact'] as AnyRecord)['root'] as AnyRecord | undefined) : undefined
            const affected = isRec(impact?.['impact']) ? ((impact?.['impact'] as AnyRecord)['affected'] as AnyRecord[] | undefined) ?? [] : []
            return (
              <>
                {root !== undefined && <span className="pmwb-node" data-root="true">{str(root['id'])}</span>}
                {affected.map((a, i) => <span key={i} className="pmwb-node">{str(a['id'] ?? JSON.stringify(a))}</span>)}
                {affected.length === 0 && root !== undefined && (
                  <span className="pmwb-muted" style={{ marginLeft: 8 }}>{t('topology.noDownstream', { d: str(impact?.['max_depth']) })}</span>
                )}
              </>
            )
          })()}
        </div>
      </Card>
      <div className="pmwb-grid2">
        <Card title={t('topology.forward')}>
          {(() => {
            const family = isRec(data['family']) ? (data['family'] as AnyRecord) : null
            const forward = Array.isArray(family?.['forward_dependencies']) ? (family?.['forward_dependencies'] as AnyRecord[]) : []
            if (forward.length === 0) return <div className="pmwb-empty">{t('common.none')}</div>
            return (
              <ul className="pmwb-list">
                {forward.map((d, i) => (
                  <li key={i}>{str(d['id'] ?? JSON.stringify(d))} {d['type'] !== undefined && <span className="pmwb-muted">via {str(d['type'])}</span>}</li>
                ))}
              </ul>
            )
          })()}
        </Card>
        <Card title={t('topology.reverse')}>
          {(() => {
            const family = isRec(data['family']) ? (data['family'] as AnyRecord) : null
            const reverse = Array.isArray(family?.['reverse_dependents']) ? (family?.['reverse_dependents'] as AnyRecord[]) : []
            if (reverse.length === 0) return <div className="pmwb-empty">{t('common.none')}</div>
            return (
              <ul className="pmwb-list">
                {reverse.map((d, i) => (
                  <li key={i}>{str(d['id'] ?? JSON.stringify(d))} {d['type'] !== undefined && <span className="pmwb-muted">via {str(d['type'])}</span>}</li>
                ))}
              </ul>
            )
          })()}
        </Card>
      </div>
    </div>
  )
}

/* ============================================================ Verification (M2) */

const GATE_HUMAN_ORDER = ['BUILD', 'BROWSER', 'TYPECHECK', 'LINT', 'ARCHITECTURE', 'SECURITY', 'CONTRACT', 'COVERAGE', 'MUTATION', 'PERFORMANCE']

function gateName(t: Translate, code: string): string {
  const key = `verify.checkName.${code}`
  const human = t(key)
  return human === key ? code : human
}

function VerificationPage(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const { data, error, reload } = usePageData<AnyRecord>(() => getJSON('/api/pomaster/verification'), [])
  if (error !== null) return <div className="pmwb-err">{t('tab.verification')}: {error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  const closeout = data['closeout'] as CommandEnvelope | null | undefined
  const tools = isRec(data['tools']) ? (data['tools'] as AnyRecord) : null
  const bindings = Array.isArray(tools?.['bindings']) ? (tools?.['bindings'] as AnyRecord[]) : []
  const gateCodes = new Set<string>([...GATE_HUMAN_ORDER])
  for (const g of closeout?.errors ?? []) {
    const m = /gate (\w+)/.exec(g.message)
    if (m?.[1] !== undefined) gateCodes.add(m[1])
  }
  const failing = closeout === null || closeout === undefined || closeout.ok
    ? []
    : (closeout.errors.map((e) => /gate (\w+)/.exec(e.message)?.[1]).filter((x): x is string => x !== undefined))
  const passed = [...gateCodes].filter((g) => !failing.includes(g)).length
  const total = Math.max(gateCodes.size, 1)
  return (
    <div>
      <div className="pmwb-actions"><button className="pmwb-btn" onClick={reload}>{t('common.refresh')}</button></div>
      <DocTitle summary={t('verify.title')} />
      <Card>
        {closeout === null || closeout === undefined ? (
          <div className="pmwb-empty">{t('common.empty')}</div>
        ) : closeout.ok ? (
          <>
            <Badge tone="ok">{t('verify.yes')}</Badge>
            <div style={{ marginTop: 10 }}><ProgressBar value={total} total={total} /></div>
          </>
        ) : failing.length === 0 ? (
          <>
            <Badge tone="warn">{t('verify.awaitingYou')}</Badge>
            <div style={{ marginTop: 10 }}><ProgressBar value={passed} total={total} /></div>
            <div style={{ marginTop: 8 }}><EnvelopeErrors errors={closeout.errors} /></div>
          </>
        ) : (
          <>
            <Badge tone="warn">{t('verify.no')}</Badge>
            <div style={{ marginTop: 10, marginBottom: 4 }}><span className="pmwb-muted">{t('verify.gateProgress', { passed, total })}</span></div>
            <ProgressBar value={passed} total={total} tone="warn" />
            <div style={{ marginTop: 10 }}><EnvelopeErrors errors={closeout.errors} /></div>
          </>
        )}
      </Card>
      <SectionTitle>{t('verify.autoChecks')}</SectionTitle>
      {bindings.length === 0 ? (
        <Card><div className="pmwb-empty">{t('verify.noBindings')}</div></Card>
      ) : (
        <Card>
          <ul className="pmwb-check">
            {bindings.map((b, i) => {
              const gate = str(b['gate'])
              return (
                <li key={i}>
                  <span className="pmwb-check-mark" data-ok={String(b['available'] === true)}>{b['available'] === true ? '✓' : '…'}</span>
                  <div>
                    <div>{gateName(t, gate)}</div>
                    <div className="pmwb-muted">{str(b['binding_id'])}</div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}

/* ============================================================ Evidence (M2) */

function EvidencePage(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const { data, error } = usePageData<AnyRecord>(() => getJSON('/api/pomaster/evidence'), [])
  if (error !== null) return <div className="pmwb-err">{t('tab.evidence')}: {error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  const indexRow = isRec(data['inspect']) && isRec((data['inspect'] as AnyRecord)['index_row'])
    ? ((data['inspect'] as AnyRecord)['index_row'] as AnyRecord)
    : null
  const summary = isRec(indexRow?.['evidence_summary']) ? (indexRow?.['evidence_summary'] as AnyRecord) : null
  const claims = typeof summary?.['claims'] === 'number' ? summary['claims'] : 0
  const verified = typeof summary?.['verified'] === 'number' ? summary['verified'] : 0
  const ledger = isRec(data['ledger']) ? (data['ledger'] as AnyRecord) : null
  const entries = Array.isArray(ledger?.['entries']) ? (ledger?.['entries'] as AnyRecord[]) : []
  return (
    <div>
      <DocTitle summary={t('evidence.title')} />
      <Card title={t('evidence.claims', { n: claims, v: verified })}>
        <ProgressBar value={verified} total={claims} tone={verified === claims ? 'ok' : 'warn'} />
        <div style={{ marginTop: 6 }}>
          <Badge tone={verified === claims ? 'ok' : 'warn'}>{verified}/{claims} {t('tasks.verified')}</Badge>
        </div>
      </Card>
      <Card title={t('evidence.ledger')}>
        {entries.length === 0 ? <div className="pmwb-empty">{t('evidence.ledgerEmpty')}</div> : (
          <ul className="pmwb-list">{entries.map((e, i) => <li key={i}>{str(e['classification'])}: {str(e['statement'])}</li>)}</ul>
        )}
      </Card>
    </div>
  )
}

/* ============================================================ Components (M5, explorer-style gallery) */

function Swatch(props: { name: string; color: string }): React.ReactElement {
  return (
    <div>
      <div className="sw-color" style={{ background: props.color }} />
      <div className="sw-name">{props.name}<br />{props.color}</div>
    </div>
  )
}

type Sample = { name: string; render: React.ReactNode }

function ComponentsPage(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const [refInput, setRefInput] = useState('')
  const [ref, setRef] = useState('')
  const [openCat, setOpenCat] = useState<string | null>(null)
  const { data, error } = usePageData<AnyRecord>(() => getJSON(`/api/pomaster/components?ref=${encodeURIComponent(ref)}`), [ref])
  const theme = usePageData<{ tokens: Record<string, string> }>(() => getJSON('/api/pomaster/theme'), [])
  if (error !== null) return <div className="pmwb-err">{t('tab.components')}: {error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  const catalog = isRec(data['catalog']) ? (data['catalog'] as AnyRecord) : null
  const sections = isRec(catalog?.['sections']) ? (catalog?.['sections'] as AnyRecord) : {}
  const archetypes = typeof sections['archetypes'] === 'number' ? sections['archetypes'] : 0

  const samples: Record<string, Sample[]> = {
    typography: [
      { name: '标题 title', render: <div className="pmwb-doc-title">POMaster Workbench</div> },
      { name: '小节标题 section', render: <SectionTitle>为什么入选</SectionTitle> },
      { name: '正文 body', render: <p className="pmwb-para">这是一段正文示例：工作台把治理状态翻译成人能直接读懂的语言，不再需要打开命令行。</p> },
      { name: '辅助说明 muted', render: <div className="pmwb-muted">辅助说明文字，比正文更弱一级。</div> },
      { name: '代码 mono', render: <span className="pmwb-mono">pomaster status --json</span> },
    ],
    badges: [
      { name: '通过 ok', render: <Badge tone="ok">confirmed</Badge> },
      { name: '警告 warn', render: <Badge tone="warn">not_run</Badge> },
      { name: '失败 bad', render: <Badge tone="bad">failed</Badge> },
      { name: '中性 neutral', render: <Badge tone="neutral">PROPOSED</Badge> },
    ],
    buttons: [
      { name: '主按钮 primary', render: <button className="pmwb-btn" style={{ background: 'var(--tk-color-brand-primary,#1677ff)', borderColor: 'var(--tk-color-brand-primary,#1677ff)', color: '#fff' }}>刷新</button> },
      { name: '次按钮 default', render: <button className="pmwb-btn">刷新</button> },
      { name: '危险 danger', render: <button className="pmwb-btn" style={{ borderColor: 'var(--tk-color-semantic-error,#ff4d4f)', color: 'var(--tk-color-semantic-error,#ff4d4f)' }}>删除</button> },
      { name: '链接 link', render: <button className="pmwb-btn" style={{ border: 'none', background: 'none', color: 'var(--tk-color-brand-primary,#1677ff)', padding: '4px 6px' }}>展开全文</button> },
      { name: '小尺寸 small', render: <button className="pmwb-btn" style={{ height: 'var(--tk-density-compact_control_height,24px)', padding: '2px 8px', fontSize: 12 }}>小按钮</button> },
      { name: '大尺寸 large', render: <button className="pmwb-btn" style={{ height: 40, padding: '8px 20px', fontSize: 15 }}>大按钮</button> },
      { name: '带图标 icon', render: <button className="pmwb-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1v10M4 7l4 4 4-4M2 14h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>导出</button> },
      { name: '禁用 disabled', render: <button className="pmwb-btn" disabled>不可用</button> },
      { name: '输入框 input', render: <input className="pmwb-input" placeholder="搜索…" readOnly /> },
      { name: '开关 switch', render: <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}><span style={{ width: 36, height: 20, borderRadius: 999, background: 'var(--tk-color-brand-primary,#1677ff)', position: 'relative', display: 'inline-block' }}><span style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: '50%', background: '#fff' }} /></span>开启</label> },
    ],
    progress: [
      { name: '进度 100%', render: <div style={{ width: 220 }}><ProgressBar value={5} total={5} /></div> },
      { name: '进度 60%', render: <div style={{ width: 220 }}><ProgressBar value={3} total={5} tone="warn" /></div> },
      { name: '占比条 stacked', render: <div style={{ width: 220 }}><StackedBar segments={[{ label: 'policies', value: 206, color: '#1677ff' }, { label: 'archetypes', value: 41, color: '#52c41a' }, { label: '其余', value: 23, color: '#faad14' }]} /></div> },
    ],
    tables: [
      {
        name: '数据表 grid',
        render: (
          <table className="pmwb-table" style={{ minWidth: 300 }}>
            <thead><tr><th>检查</th><th>状态</th><th>证据</th></tr></thead>
            <tbody>
              <tr><td>构建与单元测试</td><td><Badge tone="ok">passed</Badge></td><td className="pmwb-mono">GRN-0006</td></tr>
              <tr><td>浏览器界面检查</td><td><Badge tone="ok">passed</Badge></td><td className="pmwb-mono">GRN-0007</td></tr>
              <tr><td>类型检查</td><td><Badge tone="warn">not_run</Badge></td><td className="pmwb-mono">—</td></tr>
            </tbody>
          </table>
        ),
      },
      {
        name: '栅格 grid-2col',
        render: (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: 240 }}>
            {[1, 2, 3, 4].map((n) => <div key={n} style={{ border: '1px solid var(--tk-color-border-default,#d9d9d9)', borderRadius: 6, padding: '8px 10px', fontSize: 12 }}>栅格 {n}</div>)}
          </div>
        ),
      },
    ],
    layout: [
      { name: '间距尺度 spacing', render: <div>{['xs', 'sm', 'md', 'lg', 'xl', 'xxl'].map((k) => <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><span className="pmwb-muted" style={{ width: 30 }}>{k}</span><span style={{ height: 10, width: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }[k as 'xs'] ?? 8, background: 'var(--tk-color-brand-primary,#1677ff)', borderRadius: 2, display: 'inline-block' }} /></div>)}</div> },
      { name: '断点 breakpoints', render: <div>{[['sm', 576], ['md', 768], ['lg', 992], ['xl', 1200]].map(([k, w]) => <div key={k as string} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><span className="pmwb-muted" style={{ width: 30 }}>{k}</span><span style={{ height: 10, width: `${(w as number) / 12}px`, maxWidth: 220, background: 'var(--tk-color-semantic-info,#1677ff)', borderRadius: 2, display: 'inline-block' }} /><span className="pmwb-muted">{w}</span></div>)}</div> },
      { name: '卡片阴影 elevation', render: <div style={{ display: 'flex', gap: 8 }}><div style={{ width: 60, height: 40, borderRadius: 8, background: '#fff', boxShadow: 'var(--tk-elevation-card,none)', border: '1px solid var(--tk-color-border-subtle,#f0f0f0)' }} /><div style={{ width: 60, height: 40, borderRadius: 8, background: '#fff', boxShadow: 'var(--tk-elevation-popover,none)', border: '1px solid var(--tk-color-border-subtle,#f0f0f0)' }} /></div> },
    ],
    icons: [
      { name: '功能图标集', render: (
        <div className="pmwb-icon-row">
          <svg viewBox="0 0 16 16" fill="none"><path d="M2 8.5 6 12l8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <svg viewBox="0 0 16 16" fill="none"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          <svg viewBox="0 0 16 16" fill="none"><path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <svg viewBox="0 0 16 16" fill="none"><path d="M2 3h12v10H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M2 6h12" stroke="currentColor" strokeWidth="1.5" /></svg>
          <svg viewBox="0 0 16 16" fill="none"><path d="M8 1v14M2 5h12M2 11h12" stroke="currentColor" strokeWidth="1.4" /><rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" /></svg>
          <svg viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="3.5" rx="5.5" ry="2.2" stroke="currentColor" strokeWidth="1.4" /><path d="M2.5 3.5V12c0 1.2 2.5 2.2 5.5 2.2s5.5-1 5.5-2.2V3.5M2.5 7.75c0 1.2 2.5 2.2 5.5 2.2s5.5-1 5.5-2.2" stroke="currentColor" strokeWidth="1.4" /></svg>
        </div>
      ) },
    ],
    cards: [
      { name: '基础卡 card', render: <div style={{ width: 240 }}><Card title="项目"><div className="pmwb-muted">pomaster client · 20 对象</div></Card></div> },
      { name: '错误提示 error', render: <div style={{ width: 240 }}><div className="pmwb-err">GATE_WARNING — 有检查项未全绿</div></div> },
    ],
    empty: [
      { name: '空状态 empty', render: <div style={{ width: 200 }}><div className="pmwb-empty">干净——当前不需要人工介入</div></div> },
    ],
  }

  const categoryMeta: Array<{ id: string; icon: string; nameKey: string }> = [
    { id: 'typography', icon: '📝', nameKey: 'gallery.cat.typography' },
    { id: 'badges', icon: '🏷️', nameKey: 'gallery.cat.badges' },
    { id: 'buttons', icon: '🔘', nameKey: 'gallery.cat.buttons' },
    { id: 'progress', icon: '📊', nameKey: 'gallery.cat.progress' },
    { id: 'tables', icon: '📋', nameKey: 'gallery.cat.tables' },
    { id: 'layout', icon: '📐', nameKey: 'gallery.cat.layout' },
    { id: 'icons', icon: '✨', nameKey: 'gallery.cat.icons' },
    { id: 'cards', icon: '🃏', nameKey: 'gallery.cat.cards' },
    { id: 'empty', icon: '📂', nameKey: 'gallery.cat.empty' },
    { id: 'palette', icon: '🎨', nameKey: 'gallery.cat.palette' },
  ]

  const themeTokens = theme.data?.tokens ?? {}
  const colorSwatches = Object.entries(themeTokens).filter(([k]) => k.startsWith('color.'))

  /** Component props documentation (Storybook-style Args tables). */
  const ARGS: Record<string, Array<{ name: string; type: string; def: string; desc: string }>> = {
    buttons: [
      { name: 'variant', type: 'primary | default | danger | link', def: 'default', desc: '视觉形态：主操作 / 常规 / 破坏性 / 链接' },
      { name: 'size', type: 'small | middle | large', def: 'middle', desc: '尺寸（对应 density token 高度）' },
      { name: 'icon', type: 'SVGElement', def: '—', desc: '前置图标（14px 线性 SVG）' },
      { name: 'disabled', type: 'boolean', def: 'false', desc: '禁用态（透明度 .45 + 禁指针）' },
    ],
    tables: [
      { name: 'columns', type: '{key,label}[]', def: '—', desc: '列定义（表头人话名）' },
      { name: 'rows', type: 'Record[]', def: '—', desc: '数据行；单元格可渲染徽标/mono 文本' },
      { name: 'bordered', type: 'boolean', def: 'true (subtle)', desc: '行分隔线使用 border-subtle token' },
    ],
  }

  return (
    <div>
      <DocTitle summary={t('gallery.title')} sub={t('gallery.meta')} />
      {openCat === null ? (
        <>
          <div className="pmwb-gallery">
            {categoryMeta.map((c) => (
              <div key={c.id} className="pmwb-tile" onClick={() => setOpenCat(c.id)}>
                <div className="pmwb-tile-icon">{c.icon}</div>
                <div className="pmwb-tile-name">{t(c.nameKey)}</div>
                {c.id === 'palette' && <div className="pmwb-tile-count">{colorSwatches.length} tokens</div>}
              </div>
            ))}
          </div>
          <SectionTitle>{t('components.model')}</SectionTitle>
          <Card>
            <KV rows={[
              [t('components.archetypes'), archetypes],
              [t('knowledge.entries'), str(catalog?.['entries_total'])],
              [t('knowledge.lock'), str(isRec(catalog?.['lock_verification']) ? (catalog?.['lock_verification'] as AnyRecord)['ok'] : null)],
            ]} />
          </Card>
        </>
      ) : (
        <>
          <div className="pmwb-breadcrumb">
            <a onClick={() => setOpenCat(null)}>{t('gallery.all')}</a> / <b>{t(`gallery.cat.${openCat}`)}</b>
          </div>
          {openCat === 'palette' ? (
            <div className="pmwb-swatch">
              {colorSwatches.map(([k, v]) => <Swatch key={k} name={k} color={v} />)}
            </div>
          ) : (
            <div className="pmwb-gallery">
              {(samples[openCat] ?? []).map((s, i) => (
                <div key={i} className="pmwb-tile" style={{ cursor: 'default' }}>
                  <div className="pmwb-sample-frame">{s.render}</div>
                  <div className="pmwb-sample-name">{s.name}</div>
                </div>
              ))}
            </div>
          )}
          {(openCat === 'buttons' || openCat === 'tables') && ARGS[openCat] !== undefined && (
            <Card title={t('gallery.args')}>
              <table className="pmwb-table">
                <thead><tr><th>参数</th><th>类型</th><th>默认</th><th>说明</th></tr></thead>
                <tbody>
                  {ARGS[openCat].map((a, i) => (
                    <tr key={i}>
                      <td className="pmwb-mono">{a.name}</td>
                      <td className="pmwb-mono pmwb-muted">{a.type}</td>
                      <td className="pmwb-mono pmwb-muted">{a.def}</td>
                      <td>{a.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
          {ref !== '' && data['explain'] !== null && data['explain'] !== undefined && (
            <Card title={`catalog explain · ${ref}`}>
              <pre className="pmwb-pre">{JSON.stringify(data['explain'], null, 2)}</pre>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

/* ============================================================ Actions (M7) */

interface ActionDesc { id: string; label: string; authorityNote: string; params: string[] }

function ActionsPage(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const { data, error } = usePageData<{ actions: ActionDesc[] }>(() => getJSON('/api/pomaster/actions'), [])
  const [results, setResults] = useState<Record<string, CommandEnvelope>>({})
  const [paramText, setParamText] = useState<Record<string, Record<string, string>>>({})
  if (error !== null) return <div className="pmwb-err">{t('tab.actions')}: {error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  const run = async (action: ActionDesc): Promise<void> => {
    const params: Record<string, string> = {}
    for (const key of action.params) params[key] = paramText[action.id]?.[key] ?? ''
    const envelope = await postCommand(action.id, params)
    setResults((r) => ({ ...r, [action.id]: envelope }))
  }
  return (
    <div>
      <div className="pmwb-card">
        <strong>{t('actions.title')}</strong>
        <div className="pmwb-muted" style={{ marginTop: 4 }}>{t('common.kernelRejudge')}</div>
      </div>
      {data.actions.map((a) => (
        <Card key={a.id} title={a.label} meta={`action id: ${a.id}`}>
          <div className="pmwb-muted" style={{ marginBottom: 8 }}>{t('common.authority')}: {a.authorityNote}</div>
          {a.params.map((p) => (
            <div key={p} style={{ marginBottom: 6 }}>
              <input
                className="pmwb-input pmwb-mono"
                placeholder={p}
                value={paramText[a.id]?.[p] ?? ''}
                onChange={(e) => setParamText((s) => ({ ...s, [a.id]: { ...s[a.id], [p]: e.target.value } }))}
              />
            </div>
          ))}
          <div className="pmwb-actions">
            <button className="pmwb-btn" onClick={() => { void run(a) }}>{t('common.run')}</button>
          </div>
          {results[a.id] !== undefined && (
            <div style={{ marginTop: 6 }}>
              <Badge tone={results[a.id]!.ok ? 'ok' : 'bad'}>{results[a.id]!.ok ? t('common.ok') : t('common.rejected')}</Badge>
              <EnvelopeErrors errors={results[a.id]!.errors} />
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

/* ============================================================ shell */

interface TabDef { id: string; labelKey: string; el: (t: Translate) => React.ReactElement }

const TABS: TabDef[] = [
  { id: 'overview', labelKey: 'tab.overview', el: (t) => <OverviewPage t={t} /> },
  { id: 'tasks', labelKey: 'tab.tasks', el: (t) => <TasksPage t={t} /> },
  { id: 'attention', labelKey: 'tab.attention', el: (t) => <AttentionPage t={t} /> },
  { id: 'knowledge', labelKey: 'tab.knowledge', el: (t) => <KnowledgePage t={t} /> },
  { id: 'routing', labelKey: 'tab.routing', el: (t) => <RoutingPage t={t} /> },
  { id: 'topology', labelKey: 'tab.topology', el: (t) => <TopologyPage t={t} /> },
  { id: 'verification', labelKey: 'tab.verification', el: (t) => <VerificationPage t={t} /> },
  { id: 'evidence', labelKey: 'tab.evidence', el: (t) => <EvidencePage t={t} /> },
  { id: 'components', labelKey: 'tab.components', el: (t) => <ComponentsPage t={t} /> },
  { id: 'actions', labelKey: 'tab.actions', el: (t) => <ActionsPage t={t} /> },
]

export function WorkbenchApp(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const [active, setActive] = useState('overview')
  const tokenStyle = useDesignTokens()
  const tab = useMemo(() => TABS.find((x) => x.id === active) ?? (TABS[0] as TabDef), [active])
  return (
    <div className="pmwb" style={tokenStyle}>
      <style>{WORKBENCH_CSS}</style>
      <div className="pmwb-tabs" role="tablist">
        {TABS.map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === active} data-active={x.id === active} className="pmwb-tab" onClick={() => setActive(x.id)}>
            {t(x.labelKey)}
          </button>
        ))}
      </div>
      {tab.el(t)}
      <div className="pmwb-muted" style={{ marginTop: 28 }}>{t('footer.note')}</div>
    </div>
  )
}
