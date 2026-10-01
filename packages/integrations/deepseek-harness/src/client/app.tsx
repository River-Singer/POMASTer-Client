import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { getJSON, postCommand, type CommandEnvelope } from './api.ts'
import { WORKBENCH_CSS } from './styles.ts'
import type { Translate } from './i18n.ts'

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

function Card(props: { title: string; children: React.ReactNode; meta?: string }): React.ReactElement {
  return (
    <div className="pmwb-card">
      <h3>{props.title}</h3>
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

/** Tolerant fallback: any unexpected shape renders as a collapsible JSON tree. */
function JsonTree(props: { data: unknown; label: string }): React.ReactElement {
  return (
    <details className="pmwb-card">
      <summary style={{ cursor: 'pointer', fontSize: 13 }}>{props.label}</summary>
      <pre className="pmwb-pre">{JSON.stringify(props.data, null, 2)}</pre>
    </details>
  )
}

function EnvelopeErrors(props: { errors: Array<{ code: string; message: string; hint?: string }> }): React.ReactElement {
  if (props.errors.length === 0) return <span />
  return (
    <div>
      {props.errors.map((e, i) => (
        <div className="pmwb-err" key={i}>
          <span className="pmwb-mono">{e.code}</span> — {e.message}
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

function OverviewPage(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const { data, error, reload } = usePageData<OverviewData>(() => getJSON('/api/pomaster/overview'), [])
  useEffect(() => {
    const timer = setInterval(reload, 10_000)
    return () => clearInterval(timer)
  }, [reload])
  if (error !== null) return <div className="pmwb-err">{t('tab.overview')}: {error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  return (
    <div>
      <div className="pmwb-actions">
        <button className="pmwb-btn" onClick={reload}>{t('common.refresh')}</button>
        <span className="pmwb-muted">{t('common.polls')} · generation_seq {data.generationSeq}</span>
      </div>
      <Card title={t('overview.project')}>
        <KV rows={[
          [t('overview.name'), data.project.name],
          [t('overview.governedBy'), t('overview.pomaster')],
          [t('overview.cli'), data.project.pomasterVersion ?? t('common.none')],
          [t('overview.baseline'), <Badge tone={toneFor(data.baseline.state)}>{data.baseline.state}</Badge>],
          [t('overview.activeTask'), data.activeTask.present ? t('overview.activeCount', { n: data.activeTask.count }) : <span className="pmwb-muted">{t('overview.none')}</span>],
          [t('overview.permits'), data.permits.uniqueActiveRefs.length > 0 ? data.permits.uniqueActiveRefs.join(', ') : t('common.none')],
          [t('overview.objects'), `${data.objects.total}`],
        ]} />
      </Card>
      <div className="pmwb-grid2">
        <Card title={t('overview.attention')}>
          {data.attention.total === 0
            ? <div className="pmwb-empty">{t('common.clean')}</div>
            : (
              <ul className="pmwb-list">
                {Object.entries(data.attention.byCode).map(([code, n]) => (
                  <li key={code}><span className="pmwb-mono">{code}</span> × {n}</li>
                ))}
              </ul>
            )}
        </Card>
        <Card title={t('overview.tools')}>
          <KV rows={[
            [t('overview.readiness'), data.tools.readiness ?? t('common.none')],
            [t('overview.capabilities'), data.tools.capabilities ?? t('common.none')],
            [t('overview.bindings'), data.tools.readyBindings ?? t('common.none')],
            [t('overview.gaps'), data.tools.gaps ?? t('common.none')],
            [t('overview.tip'), data.tools.capabilityTip ?? t('common.none')],
          ]} />
        </Card>
      </div>
      {data.nextAction !== null && (
        <Card title={t('overview.nextAction')} meta={`${t('overview.route')} ${data.nextAction.routeId} · ${t('overview.beat')} ${data.nextAction.beat}`}>
          <div className="pmwb-mono">{data.nextAction.command}</div>
          <div className="pmwb-muted" style={{ marginTop: 6 }}>{data.nextAction.reason}</div>
        </Card>
      )}
      <EnvelopeErrors errors={data.errors} />
    </div>
  )
}

/* ============================================================ Tasks (M2) */

function TasksPage(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const { data, error, reload } = usePageData<AnyRecord>(() => getJSON('/api/pomaster/tasks'), [])
  if (error !== null) return <div className="pmwb-err">{t('tab.tasks')}: {error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  const review = isRec(data['review']) ? (data['review'] as AnyRecord) : null
  const steps = Array.isArray(review?.['steps']) ? (review?.['steps'] as AnyRecord[]) : []
  return (
    <div>
      <div className="pmwb-actions"><button className="pmwb-btn" onClick={reload}>{t('common.refresh')}</button></div>
      {review === null && <div className="pmwb-empty">{t('tasks.noView')}</div>}
      {review !== null && (
        <>
          <Card title={`Task ${str(review['task'])}`}>
            <KV rows={[[t('tasks.view'), str(review['view'])], [t('tasks.writeSurface'), str(review['write_surface'])]]} />
          </Card>
          {steps.map((s, i) => (
            <Card key={i} title={`${str(s['step'])}. ${str(s['title'])}`}>
              <ul className="pmwb-list">
                {(Array.isArray(s['lines']) ? (s['lines'] as unknown[]) : []).map((line, j) => (
                  <li key={j}>{str(line)}</li>
                ))}
              </ul>
            </Card>
          ))}
          <JsonTree data={review} label="raw review packet" />
        </>
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
  return (
    <div>
      <div className="pmwb-actions">
        <button className="pmwb-btn" onClick={reload}>{t('common.refresh')}</button>
        <span className="pmwb-muted">{t('attention.phase1')}</span>
      </div>
      <Card title={t('attention.envelope', { n: alerts.length })}>
        {alerts.length === 0 ? <div className="pmwb-empty">{t('common.clean')}</div> : (
          <table className="pmwb-table">
            <thead><tr><th>{t('attention.code')}</th><th>{t('attention.message')}</th><th>{t('attention.hint')}</th></tr></thead>
            <tbody>
              {alerts.map((a, i) => (
                <tr key={i}>
                  <td className="pmwb-mono">{str(a['code'])}</td>
                  <td>{str(a['message'])}</td>
                  <td className="pmwb-muted">{str(a['hint'])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {groups.map((g, i) => {
        const items = Array.isArray(g['items']) ? (g['items'] as AnyRecord[]) : []
        return (
          <Card key={i} title={str(g['label'])} meta={str(g['source_note'])}>
            {items.length === 0 ? <div className="pmwb-empty">{t('common.empty')}</div> : (
              <ul className="pmwb-list">{items.map((it, j) => <li key={j}>{str(it['summary'] ?? it['title'] ?? JSON.stringify(it))}</li>)}</ul>
            )}
          </Card>
        )
      })}
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
  const search = isRec(data['search']) ? (data['search'] as AnyRecord) : null
  const hits = Array.isArray(search?.['hits']) ? (search?.['hits'] as AnyRecord[]) : []
  return (
    <div>
      <div className="pmwb-actions">
        <input className="pmwb-input" placeholder={t('knowledge.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="pmwb-btn" onClick={() => setQuery(q)}>{t('common.search')}</button>
      </div>
      {catalog !== null && (
        <Card title={t('knowledge.catalog')} meta={`${str(catalog['catalog_version'])} · ${t('knowledge.profile')} ${str(catalog['profile'])} · ${str(catalog['entries_total'])} ${t('knowledge.entries')}`}>
          <table className="pmwb-table">
            <tbody>
              {Object.entries(sections).map(([k, v]) => (
                <tr key={k}><td>{k}</td><td>{str(v)}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="pmwb-muted" style={{ marginTop: 6 }}>
            {t('knowledge.lock')}: {str(isRec(catalog['lock_verification']) ? (catalog['lock_verification'] as AnyRecord)['ok'] : null)}
          </div>
        </Card>
      )}
      <Card title={t('knowledge.hits', { q: str(data['query']) })} meta={t('knowledge.humanVsAgent')}>
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
          <Card title={t('routing.budget')} meta={`${t('tab.routing')} ${str(check?.['role'])} · ${str(check?.['inputs_fingerprint']).slice(0, 24)}…`}>
            <KV rows={[
              [t('routing.available'), str(isRec(check?.['counts']) ? (check?.['counts'] as AnyRecord)['available'] ?? t('common.none') : t('common.none'))],
              [t('routing.selected'), must.length],
              [t('routing.injected'), str(isRec(check?.['counts']) ? (check?.['counts'] as AnyRecord)['injected'] ?? must.length : must.length)],
              [t('routing.advisory'), advisory.length],
              [t('routing.zeroWrite'), 'true (--check)'],
            ]} />
          </Card>
          <Card title={t('routing.whySelected')}>
            {must.length === 0 ? <div className="pmwb-empty">{t('common.none')}</div> : (
              <table className="pmwb-table">
                <thead><tr><th>{t('routing.ref')}</th><th>{t('routing.why')}</th></tr></thead>
                <tbody>
                  {must.map((m, i) => (
                    <tr key={i}><td className="pmwb-mono">{str(m['ref'])}</td><td>{str(m['reason'])}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          <Card title={t('routing.whyAdvisory')}>
            {advisory.length === 0 ? <div className="pmwb-empty">{t('common.none')}</div> : (
              <table className="pmwb-table">
                <thead><tr><th>{t('routing.ref')}</th><th>{t('routing.why')}</th></tr></thead>
                <tbody>
                  {advisory.map((m, i) => (
                    <tr key={i}><td className="pmwb-mono">{str(m['ref'])}</td><td>{str(m['reason'])}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
      <JsonTree data={data} label="raw zero-write check output" />
    </div>
  )
}

/* ============================================================ Topology (M4) */

function TopologyPage(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const [refInput, setRefInput] = useState('TASK.DSH_WORKBENCH')
  const [ref, setRef] = useState('TASK.DSH_WORKBENCH')
  const { data, error } = usePageData<AnyRecord>(() => getJSON(`/api/pomaster/topology?ref=${encodeURIComponent(ref)}`), [ref])
  if (error !== null) return <div className="pmwb-err">{t('tab.topology')}: {error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  const impact = isRec(data['impact']) ? (data['impact'] as AnyRecord) : null
  const family = isRec(data['family']) ? (data['family'] as AnyRecord) : null
  const root = isRec(impact?.['impact']) ? ((impact?.['impact'] as AnyRecord)['root'] as AnyRecord | undefined) : undefined
  const affected = isRec(impact?.['impact']) ? ((impact?.['impact'] as AnyRecord)['affected'] as AnyRecord[] | undefined) ?? [] : []
  const forward = Array.isArray(family?.['forward_dependencies']) ? (family?.['forward_dependencies'] as AnyRecord[]) : []
  const reverse = Array.isArray(family?.['reverse_dependents']) ? (family?.['reverse_dependents'] as AnyRecord[]) : []
  return (
    <div>
      <div className="pmwb-actions">
        <input className="pmwb-input pmwb-mono" value={refInput} onChange={(e) => setRefInput(e.target.value)} />
        <button className="pmwb-btn" onClick={() => setRef(refInput)}>{t('common.query')}</button>
        <span className="pmwb-muted">{t('topology.projection')}</span>
      </div>
      <Card title={t('topology.impact')}>
        <div>
          {root !== undefined && <span className="pmwb-node" data-root="true">{str(root['id'])}</span>}
          {affected.map((a, i) => <span key={i} className="pmwb-node">{str(a['id'] ?? JSON.stringify(a))}</span>)}
          {affected.length === 0 && root !== undefined && (
            <span className="pmwb-muted" style={{ marginLeft: 8 }}>{t('topology.noDownstream', { d: str(impact?.['max_depth']) })}</span>
          )}
        </div>
      </Card>
      <div className="pmwb-grid2">
        <Card title={t('topology.forward')}>
          {forward.length === 0 ? <div className="pmwb-empty">{t('common.none')}</div> : (
            <ul className="pmwb-list">
              {forward.map((d, i) => (
                <li key={i}>{str(d['id'] ?? JSON.stringify(d))} {d['type'] !== undefined && <span className="pmwb-muted">via {str(d['type'])}</span>}</li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={t('topology.reverse')}>
          {reverse.length === 0 ? <div className="pmwb-empty">{t('common.none')}</div> : (
            <ul className="pmwb-list">
              {reverse.map((d, i) => (
                <li key={i}>{str(d['id'] ?? JSON.stringify(d))} {d['type'] !== undefined && <span className="pmwb-muted">via {str(d['type'])}</span>}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <EnvelopeErrors errors={Array.isArray(data['impactErrors']) ? (data['impactErrors'] as Array<{ code: string; message: string }>) : []} />
      <JsonTree data={data} label="raw graph output" />
    </div>
  )
}

/* ============================================================ Verification (M2) */

function VerificationPage(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const { data, error, reload } = usePageData<AnyRecord>(() => getJSON('/api/pomaster/verification'), [])
  if (error !== null) return <div className="pmwb-err">{t('tab.verification')}: {error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  const closeout = data['closeout'] as CommandEnvelope | null | undefined
  const finalize = isRec(data['finalize']) ? (data['finalize'] as AnyRecord) : null
  const tools = isRec(data['tools']) ? (data['tools'] as AnyRecord) : null
  const bindings = Array.isArray(tools?.['bindings']) ? (tools?.['bindings'] as AnyRecord[]) : []
  return (
    <div>
      <div className="pmwb-actions"><button className="pmwb-btn" onClick={reload}>{t('common.refresh')}</button></div>
      <Card title={t('verification.dod')} meta={t('verification.matrix')}>
        {closeout === null || closeout === undefined
          ? <div className="pmwb-empty">{t('common.empty')}</div>
          : closeout.ok
            ? <Badge tone="ok">{t('verification.green')}</Badge>
            : (
              <>
                <EnvelopeErrors errors={closeout.errors} />
                <div className="pmwb-muted" style={{ marginTop: 6 }}>{t('verification.failclosed')}</div>
              </>
            )}
      </Card>
      <Card title={t('verification.bindings')}>
        {bindings.length === 0 ? <div className="pmwb-empty">{t('verification.registryAbsent')}</div> : (
          <table className="pmwb-table">
            <thead><tr><th>binding</th><th>gate</th><th>detect</th><th>available</th></tr></thead>
            <tbody>
              {bindings.map((b, i) => (
                <tr key={i}>
                  <td className="pmwb-mono">{str(b['binding_id'])}</td>
                  <td>{str(b['gate'])}</td>
                  <td>{str(b['detect_status'])}</td>
                  <td>{str(b['available'])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card title={t('verification.finalize')}>
        <JsonTree data={finalize} label="finalize status output" />
      </Card>
    </div>
  )
}

/* ============================================================ Evidence (M2) */

function EvidencePage(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const { data, error } = usePageData<AnyRecord>(() => getJSON('/api/pomaster/evidence'), [])
  if (error !== null) return <div className="pmwb-err">{t('tab.evidence')}: {error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  const ledger = isRec(data['ledger']) ? (data['ledger'] as AnyRecord) : null
  const entries = Array.isArray(ledger?.['entries']) ? (ledger?.['entries'] as AnyRecord[]) : []
  return (
    <div>
      <Card title={t('evidence.lineage')} meta={t('evidence.lineageMeta')}>
        <div className="pmwb-muted">{t('evidence.attached')}</div>
      </Card>
      <JsonTree data={data['inspect']} label="inspect output" />
      <Card title={t('evidence.ledger')}>
        {entries.length === 0 ? <div className="pmwb-empty">{t('evidence.ledgerEmpty')}</div> : (
          <ul className="pmwb-list">{entries.map((e, i) => <li key={i}>{str(e['classification'])}: {str(e['statement'])}</li>)}</ul>
        )}
      </Card>
    </div>
  )
}

/* ============================================================ Components (M5) */

function ComponentsPage(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const [refInput, setRefInput] = useState('')
  const [ref, setRef] = useState('')
  const { data, error } = usePageData<AnyRecord>(() => getJSON(`/api/pomaster/components?ref=${encodeURIComponent(ref)}`), [ref])
  if (error !== null) return <div className="pmwb-err">{t('tab.components')}: {error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  const catalog = isRec(data['catalog']) ? (data['catalog'] as AnyRecord) : null
  const sections = isRec(catalog?.['sections']) ? (catalog?.['sections'] as AnyRecord) : {}
  const archetypes = typeof sections['archetypes'] === 'number' ? sections['archetypes'] : 0
  return (
    <div>
      <div className="pmwb-actions">
        <input className="pmwb-input pmwb-mono" placeholder={t('components.explainPlaceholder')} value={refInput} onChange={(e) => setRefInput(e.target.value)} />
        <button className="pmwb-btn" onClick={() => setRef(refInput)}>{t('common.query')}</button>
      </div>
      <Card title={t('components.model')} meta={t('components.meta')}>
        <KV rows={[
          [t('components.archetypes'), archetypes],
          [t('knowledge.entries'), str(catalog?.['entries_total'])],
          [t('knowledge.lock'), str(isRec(catalog?.['lock_verification']) ? (catalog?.['lock_verification'] as AnyRecord)['ok'] : null)],
        ]} />
        <div className="pmwb-muted" style={{ marginTop: 8 }}>
          <span className="pmwb-mono">corepack pnpm studio:dev</span> · <span className="pmwb-mono">studio:react:dev</span>
        </div>
      </Card>
      {data['explain'] !== null && data['explain'] !== undefined && <JsonTree data={data['explain']} label={`catalog explain ${ref}`} />}
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
            <div>
              <Badge tone={results[a.id]!.ok ? 'ok' : 'bad'}>{results[a.id]!.ok ? t('common.ok') : t('common.rejected')}</Badge>
              <EnvelopeErrors errors={results[a.id]!.errors} />
              {results[a.id]!.ok && <JsonTree data={results[a.id]!.result} label={t('common.result')} />}
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
