import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { getJSON, postCommand, type CommandEnvelope } from './api.ts'
import { WORKBENCH_CSS } from './styles.ts'

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

function SectionTitle(props: { children: React.ReactNode }): React.ReactElement {
  return <div className="pmwb-sec-title">{props.children}</div>
}

function str(v: unknown): string {
  if (v === undefined || v === null) return '—'
  if (typeof v === 'string') return v
  return JSON.stringify(v)
}

/* ============================================================ Overview (M2) */

interface OverviewData {
  schema: string
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

function OverviewPage(): React.ReactElement {
  const { data, error, reload } = usePageData<OverviewData>(() => getJSON('/api/pomaster/overview'), [])
  useEffect(() => {
    const timer = setInterval(reload, 10_000)
    return () => clearInterval(timer)
  }, [reload])
  if (error !== null) return <div className="pmwb-err">overview: {error}</div>
  if (data === null) return <div className="pmwb-empty">loading…</div>
  return (
    <div>
      <div className="pmwb-actions">
        <button className="pmwb-btn" onClick={reload}>Refresh</button>
        <span className="pmwb-muted">polls every 10s · generation_seq {data.generationSeq}</span>
      </div>
      <Card title="Project">
        <KV rows={[
          ['Name', data.project.name],
          ['Governed by', 'POMaster (headless authority)'],
          ['POMaster CLI', data.project.pomasterVersion ?? '—'],
          ['Baseline', <Badge tone={toneFor(data.baseline.state)}>{data.baseline.state}</Badge>],
          ['Active task', data.activeTask.present ? <span>{data.activeTask.count} active</span> : <span className="pmwb-muted">none</span>],
          ['Permits', data.permits.uniqueActiveRefs.length > 0 ? data.permits.uniqueActiveRefs.join(', ') : '—'],
          ['Objects', `${data.objects.total}`],
        ]} />
      </Card>
      <div className="pmwb-grid2">
        <Card title="Attention">
          {data.attention.total === 0
            ? <div className="pmwb-empty">clean — nothing needs a human right now</div>
            : (
              <ul className="pmwb-list">
                {Object.entries(data.attention.byCode).map(([code, n]) => (
                  <li key={code}><span className="pmwb-mono">{code}</span> × {n}</li>
                ))}
              </ul>
            )}
        </Card>
        <Card title="Tools / harness">
          <KV rows={[
            ['readiness', data.tools.readiness ?? '—'],
            ['capabilities', data.tools.capabilities ?? '—'],
            ['ready bindings', data.tools.readyBindings ?? '—'],
            ['gaps', data.tools.gaps ?? '—'],
            ['tip', data.tools.capabilityTip ?? '—'],
          ]} />
        </Card>
      </div>
      {data.nextAction !== null && (
        <Card title="Next action" meta={`route ${data.nextAction.routeId} · beat ${data.nextAction.beat}`}>
          <div className="pmwb-mono">{data.nextAction.command}</div>
          <div className="pmwb-muted" style={{ marginTop: 6 }}>{data.nextAction.reason}</div>
        </Card>
      )}
      <EnvelopeErrors errors={data.errors} />
    </div>
  )
}

/* ============================================================ Tasks (M2) */

function TasksPage(): React.ReactElement {
  const { data, error, reload } = usePageData<AnyRecord>(() => getJSON('/api/pomaster/tasks'), [])
  if (error !== null) return <div className="pmwb-err">tasks: {error}</div>
  if (data === null) return <div className="pmwb-empty">loading…</div>
  const review = isRec(data['review']) ? (data['review'] as AnyRecord) : null
  const steps = Array.isArray(review?.['steps']) ? (review?.['steps'] as AnyRecord[]) : []
  return (
    <div>
      <div className="pmwb-actions"><button className="pmwb-btn" onClick={reload}>Refresh</button></div>
      {review === null && <div className="pmwb-empty">no task view available</div>}
      {review !== null && (
        <>
          <Card title={`Task ${str(review['task'])}`}>
            <KV rows={[['view', str(review['view'])], ['write surface', str(review['write_surface'])]]} />
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

function AttentionPage(): React.ReactElement {
  const { data, error, reload } = usePageData<AnyRecord>(() => getJSON('/api/pomaster/attention'), [])
  useEffect(() => {
    const timer = setInterval(reload, 10_000)
    return () => clearInterval(timer)
  }, [reload])
  if (error !== null) return <div className="pmwb-err">attention: {error}</div>
  if (data === null) return <div className="pmwb-empty">loading…</div>
  const alerts = isRec(data['alerts']) && Array.isArray((data['alerts'] as AnyRecord)['alerts'])
    ? ((data['alerts'] as AnyRecord)['alerts'] as AnyRecord[])
    : []
  const groups = Array.isArray(data['groups']) ? (data['groups'] as AnyRecord[]) : []
  return (
    <div>
      <div className="pmwb-actions">
        <button className="pmwb-btn" onClick={reload}>Refresh</button>
        <span className="pmwb-muted">polls every 10s · Phase-1 read-only (view / locate / explain — PRD §26)</span>
      </div>
      <Card title={`Alert envelope (${alerts.length})`}>
        {alerts.length === 0 ? <div className="pmwb-empty">clean</div> : (
          <table className="pmwb-table">
            <thead><tr><th>code</th><th>message</th><th>hint</th></tr></thead>
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
            {items.length === 0 ? <div className="pmwb-empty">empty</div> : (
              <ul className="pmwb-list">{items.map((it, j) => <li key={j}>{str(it['summary'] ?? it['title'] ?? JSON.stringify(it))}</li>)}</ul>
            )}
          </Card>
        )
      })}
    </div>
  )
}

/* ============================================================ Knowledge (M2) */

function KnowledgePage(): React.ReactElement {
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const { data, error } = usePageData<AnyRecord>(() => getJSON(`/api/pomaster/knowledge?q=${encodeURIComponent(query)}`), [query])
  if (error !== null) return <div className="pmwb-err">knowledge: {error}</div>
  if (data === null) return <div className="pmwb-empty">loading…</div>
  const catalog = isRec(data['catalog']) ? (data['catalog'] as AnyRecord) : null
  const sections = isRec(catalog?.['sections']) ? (catalog?.['sections'] as AnyRecord) : {}
  const search = isRec(data['search']) ? (data['search'] as AnyRecord) : null
  const hits = Array.isArray(search?.['hits']) ? (search?.['hits'] as AnyRecord[]) : []
  return (
    <div>
      <div className="pmwb-actions">
        <input className="pmwb-input" placeholder="knowledge search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="pmwb-btn" onClick={() => setQuery(q)}>Search</button>
      </div>
      {catalog !== null && (
        <Card title="Engineering catalog" meta={`${str(catalog['catalog_version'])} · profile ${str(catalog['profile'])} · ${str(catalog['entries_total'])} entries`}>
          <table className="pmwb-table">
            <tbody>
              {Object.entries(sections).map(([k, v]) => (
                <tr key={k}><td>{k}</td><td>{str(v)}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="pmwb-muted" style={{ marginTop: 6 }}>
            lock: {str(isRec(catalog['lock_verification']) ? (catalog['lock_verification'] as AnyRecord)['ok'] : null)}
          </div>
        </Card>
      )}
      <Card title={`Search hits for “${str(data['query'])}”`} meta="Human library ≠ agent context (PRD §13) — the agent reads via spec routing, not this page.">
        {hits.length === 0 ? <div className="pmwb-empty">no hits</div> : (
          <ul className="pmwb-list">{hits.map((h, i) => <li key={i}>{str(h['id'] ?? h)}</li>)}</ul>
        )}
      </Card>
    </div>
  )
}

/* ============================================================ Routing (M3) */

function RoutingPage(): React.ReactElement {
  const { data, error, reload } = usePageData<AnyRecord>(() => getJSON('/api/pomaster/routing'), [])
  if (error !== null) return <div className="pmwb-err">routing: {error}</div>
  if (data === null) return <div className="pmwb-empty">loading…</div>
  const check = isRec(data['check']) ? (data['check'] as AnyRecord) : null
  const manifest = isRec(check?.['manifest']) ? (check?.['manifest'] as AnyRecord) : null
  const must = Array.isArray(manifest?.['must_entries']) ? (manifest?.['must_entries'] as AnyRecord[]) : []
  const advisory = Array.isArray(manifest?.['advisory_entries']) ? (manifest?.['advisory_entries'] as AnyRecord[]) : []
  return (
    <div>
      <div className="pmwb-actions"><button className="pmwb-btn" onClick={reload}>Refresh</button></div>
      {manifest === null && <div className="pmwb-empty">no routing manifest (zero-write check) — see raw below</div>}
      {manifest !== null && (
        <>
          <Card title="Current task context budget (PRD §13)" meta={`role ${str(check?.['role'])} · fingerprint ${str(check?.['inputs_fingerprint']).slice(0, 24)}…`}>
            <KV rows={[
              ['Available specs', str(isRec(check?.['counts']) ? (check?.['counts'] as AnyRecord)['available'] ?? '—' : '—')],
              ['Selected (must)', must.length],
              ['Injected', str(isRec(check?.['counts']) ? (check?.['counts'] as AnyRecord)['injected'] ?? must.length : must.length)],
              ['Advisory', advisory.length],
              ['Zero-write', 'true (--check)'],
            ]} />
          </Card>
          <Card title="Why selected — must (spec routing, M3)">
            {must.length === 0 ? <div className="pmwb-empty">none</div> : (
              <table className="pmwb-table">
                <thead><tr><th>ref</th><th>why (reason)</th></tr></thead>
                <tbody>
                  {must.map((m, i) => (
                    <tr key={i}><td className="pmwb-mono">{str(m['ref'])}</td><td>{str(m['reason'])}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          <Card title="Advisory (knowledge — never gate input, §83.2)">
            {advisory.length === 0 ? <div className="pmwb-empty">none</div> : (
              <table className="pmwb-table">
                <thead><tr><th>ref</th><th>why</th></tr></thead>
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

function TopologyPage(): React.ReactElement {
  const [refInput, setRefInput] = useState('TASK.DSH_WORKBENCH')
  const [ref, setRef] = useState('TASK.DSH_WORKBENCH')
  const { data, error } = usePageData<AnyRecord>(() => getJSON(`/api/pomaster/topology?ref=${encodeURIComponent(ref)}`), [ref])
  if (error !== null) return <div className="pmwb-err">topology: {error}</div>
  if (data === null) return <div className="pmwb-empty">loading…</div>
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
        <button className="pmwb-btn" onClick={() => setRef(refInput)}>Query</button>
        <span className="pmwb-muted">Relationship projection — not a truth store (PRD §14)</span>
      </div>
      <Card title="Impact closure">
        <div>
          {root !== undefined && <span className="pmwb-node" data-root="true">{str(root['id'])}</span>}
          {affected.map((a, i) => <span key={i} className="pmwb-node">{str(a['id'] ?? JSON.stringify(a))}</span>)}
          {affected.length === 0 && root !== undefined && <span className="pmwb-muted" style={{ marginLeft: 8 }}>no downstream affected objects at depth {str(impact?.['max_depth'])}</span>}
        </div>
      </Card>
      <div className="pmwb-grid2">
        <Card title="Forward dependencies (edge type → target)">
          {forward.length === 0 ? <div className="pmwb-empty">none</div> : (
            <ul className="pmwb-list">
              {forward.map((d, i) => (
                <li key={i}>{str(d['id'] ?? JSON.stringify(d))} {d['type'] !== undefined && <span className="pmwb-muted">via {str(d['type'])}</span>}</li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Reverse dependents (who depends on this)">
          {reverse.length === 0 ? <div className="pmwb-empty">none</div> : (
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

function VerificationPage(): React.ReactElement {
  const { data, error, reload } = usePageData<AnyRecord>(() => getJSON('/api/pomaster/verification'), [])
  if (error !== null) return <div className="pmwb-err">verification: {error}</div>
  if (data === null) return <div className="pmwb-empty">loading…</div>
  const closeout = data['closeout'] as CommandEnvelope | null | undefined
  const finalize = isRec(data['finalize']) ? (data['finalize'] as AnyRecord) : null
  const tools = isRec(data['tools']) ? (data['tools'] as AnyRecord) : null
  const bindings = Array.isArray(tools?.['bindings']) ? (tools?.['bindings'] as AnyRecord[]) : []
  return (
    <div>
      <div className="pmwb-actions"><button className="pmwb-btn" onClick={reload}>Refresh</button></div>
      <Card title="DoD judgment (closeout)" meta="Acceptance → gates → human ACCEPT receipt (PRD §27 compressed matrix)">
        {closeout === null || closeout === undefined
          ? <div className="pmwb-empty">no judgment available</div>
          : closeout.ok
            ? <Badge tone="ok">all gates green — awaiting/holding human acceptance receipt</Badge>
            : (
              <>
                <EnvelopeErrors errors={closeout.errors} />
                <div className="pmwb-muted" style={{ marginTop: 6 }}>fail-closed: warning / not_run are not green; the latest judgment supersedes older ones.</div>
              </>
            )}
      </Card>
      <Card title="Gate bindings (ToolBinding)">
        {bindings.length === 0 ? <div className="pmwb-empty">registry absent — plan run is explicitly not_run (M1 backlog)</div> : (
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
      <Card title="Finalize status">
        <JsonTree data={finalize} label="finalize status output" />
      </Card>
    </div>
  )
}

/* ============================================================ Evidence (M2) */

function EvidencePage(): React.ReactElement {
  const { data, error } = usePageData<AnyRecord>(() => getJSON('/api/pomaster/evidence'), [])
  if (error !== null) return <div className="pmwb-err">evidence: {error}</div>
  if (data === null) return <div className="pmwb-empty">loading…</div>
  const ledger = isRec(data['ledger']) ? (data['ledger'] as AnyRecord) : null
  const entries = Array.isArray(ledger?.['entries']) ? (ledger?.['entries'] as AnyRecord[]) : []
  return (
    <div>
      <Card title="Object & evidence lineage (inspect TASK.DSH_WORKBENCH)" meta="谁产生 · 何时 · 观察什么 · 哪版源码 · 现在还有效吗 (PRD §28)">
        <div className="pmwb-muted">inspect output is attached below — claims (CLM-*) and gate runs (GRN-*) carry the lineage.</div>
      </Card>
      <JsonTree data={data['inspect']} label="inspect output" />
      <Card title="Exception / assumption ledger">
        {entries.length === 0 ? <div className="pmwb-empty">ledger empty</div> : (
          <ul className="pmwb-list">{entries.map((e, i) => <li key={i}>{str(e['classification'])}: {str(e['statement'])}</li>)}</ul>
        )}
      </Card>
    </div>
  )
}

/* ============================================================ Components (M5) */

function ComponentsPage(): React.ReactElement {
  const [refInput, setRefInput] = useState('')
  const [ref, setRef] = useState('')
  const { data, error } = usePageData<AnyRecord>(() => getJSON(`/api/pomaster/components?ref=${encodeURIComponent(ref)}`), [ref])
  if (error !== null) return <div className="pmwb-err">components: {error}</div>
  if (data === null) return <div className="pmwb-empty">loading…</div>
  const catalog = isRec(data['catalog']) ? (data['catalog'] as AnyRecord) : null
  const sections = isRec(catalog?.['sections']) ? (catalog?.['sections'] as AnyRecord) : {}
  const archetypes = typeof sections['archetypes'] === 'number' ? sections['archetypes'] : 0
  return (
    <div>
      <div className="pmwb-actions">
        <input className="pmwb-input pmwb-mono" placeholder="catalog explain <ref>" value={refInput} onChange={(e) => setRefInput(e.target.value)} />
        <button className="pmwb-btn" onClick={() => setRef(refInput)}>Explain</button>
      </div>
      <Card title="Reference → Adopted → Customized (PRD §20)" meta="POMaster studio galleries are generated references (not importable); the Workbench builds its own surface and treats galleries as design-token/archetype reference.">
        <KV rows={[
          ['Archetype cards', archetypes],
          ['Catalog entries', str(catalog?.['entries_total'])],
          ['Catalog lock', str(isRec(catalog?.['lock_verification']) ? (catalog?.['lock_verification'] as AnyRecord)['ok'] : null)],
        ]} />
        <div className="pmwb-muted" style={{ marginTop: 8 }}>
          Reference galleries: <span className="pmwb-mono">corepack pnpm studio:dev</span> (Vue/antdv) · <span className="pmwb-mono">studio:react:dev</span> (React/antd 5, port 6007) — or the published gallery site.
        </div>
      </Card>
      {data['explain'] !== null && data['explain'] !== undefined && <JsonTree data={data['explain']} label={`catalog explain ${ref}`} />}
    </div>
  )
}

/* ============================================================ Actions (M7) */

interface ActionDesc { id: string; label: string; authorityNote: string; params: string[] }

function ActionsPage(): React.ReactElement {
  const { data, error } = usePageData<{ actions: ActionDesc[] }>(() => getJSON('/api/pomaster/actions'), [])
  const [results, setResults] = useState<Record<string, CommandEnvelope>>({})
  const [paramText, setParamText] = useState<Record<string, Record<string, string>>>({})
  if (error !== null) return <div className="pmwb-err">actions: {error}</div>
  if (data === null) return <div className="pmwb-empty">loading…</div>
  const run = async (action: ActionDesc): Promise<void> => {
    const params: Record<string, string> = {}
    for (const key of action.params) params[key] = paramText[action.id]?.[key] ?? ''
    const envelope = await postCommand(action.id, params)
    setResults((r) => ({ ...r, [action.id]: envelope }))
  }
  return (
    <div>
      <div className="pmwb-card">
        <strong>Mutation actions</strong>
        <div className="pmwb-muted" style={{ marginTop: 4 }}>
          Every button maps to an EXISTING pomaster command; the kernel re-judges authority on each invocation (PRD §57). Buttons show the required authority — a disabled/red result is the CLI's own adjudication, never bypassed (PRD §41).
        </div>
      </div>
      {data.actions.map((a) => (
        <Card key={a.id} title={a.label} meta={`action id: ${a.id}`}>
          <div className="pmwb-muted" style={{ marginBottom: 8 }}>authority: {a.authorityNote}</div>
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
            <button className="pmwb-btn" onClick={() => { void run(a) }}>Run</button>
          </div>
          {results[a.id] !== undefined && (
            <div>
              <Badge tone={results[a.id]!.ok ? 'ok' : 'bad'}>{results[a.id]!.ok ? 'ok' : 'rejected/failed (kernel adjudication)'}</Badge>
              <EnvelopeErrors errors={results[a.id]!.errors} />
              {results[a.id]!.ok && <JsonTree data={results[a.id]!.result} label="result" />}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

/* ============================================================ shell */

const TABS: Array<{ id: string; label: string; el: () => React.ReactElement }> = [
  { id: 'overview', label: 'Overview', el: () => <OverviewPage /> },
  { id: 'tasks', label: 'Tasks', el: () => <TasksPage /> },
  { id: 'attention', label: 'Attention', el: () => <AttentionPage /> },
  { id: 'knowledge', label: 'Knowledge', el: () => <KnowledgePage /> },
  { id: 'routing', label: 'Routing', el: () => <RoutingPage /> },
  { id: 'topology', label: 'Topology', el: () => <TopologyPage /> },
  { id: 'verification', label: 'Verification', el: () => <VerificationPage /> },
  { id: 'evidence', label: 'Evidence', el: () => <EvidencePage /> },
  { id: 'components', label: 'Components', el: () => <ComponentsPage /> },
  { id: 'actions', label: 'Actions', el: () => <ActionsPage /> },
]

export function WorkbenchApp(): React.ReactElement {
  const [active, setActive] = useState('overview')
  const tab = useMemo(() => TABS.find((t) => t.id === active) ?? (TABS[0] as (typeof TABS)[number]), [active])
  return (
    <div className="pmwb">
      <style>{WORKBENCH_CSS}</style>
      <div className="pmwb-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === active} data-active={t.id === active} className="pmwb-tab" onClick={() => setActive(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab.el()}
      <div className="pmwb-muted" style={{ marginTop: 28 }}>
        POMaster Workbench · read-only projection surface · same-source contract with the pomaster CLI · @pomaster/dsh-bundle
      </div>
    </div>
  )
}
