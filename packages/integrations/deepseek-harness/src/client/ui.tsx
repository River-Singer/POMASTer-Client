/** Shared Workbench primitives (IA Reset v2) — every formal page imports from here. */
import React, { useCallback, useEffect, useState } from 'react'
import type { Translate } from './i18n.ts'

export type AnyRecord = Record<string, unknown>
export const isRec = (v: unknown): v is AnyRecord => typeof v === 'object' && v !== null
export const str = (v: unknown): string => (v === undefined || v === null ? '—' : typeof v === 'string' ? v : JSON.stringify(v))

export function Badge(props: { tone: 'ok' | 'warn' | 'bad' | 'neutral'; children: React.ReactNode }): React.ReactElement {
  return <span className="pmwb-badge" data-tone={props.tone === 'neutral' ? undefined : props.tone}>{props.children}</span>
}

export function toneFor(verdict: string | undefined): 'ok' | 'warn' | 'bad' | 'neutral' {
  if (verdict === 'passed' || verdict === 'confirmed' || verdict === 'VERIFIED') return 'ok'
  if (verdict === undefined) return 'neutral'
  if (['warning', 'not_run', 'pending', 'UNVERIFIED', 'unconfirmed', 'PROPOSED'].includes(verdict)) return 'warn'
  if (['failed', 'drifted', 'REJECTED'].includes(verdict)) return 'bad'
  return 'neutral'
}

export function Card(props: { title?: string; children: React.ReactNode; meta?: string }): React.ReactElement {
  return (
    <div className="pmwb-card">
      {props.title !== undefined && <h3>{props.title}</h3>}
      {props.meta !== undefined && <div className="pmwb-muted" style={{ marginBottom: 8 }}>{props.meta}</div>}
      {props.children}
    </div>
  )
}

export function SectionTitle(props: { children: React.ReactNode }): React.ReactElement {
  return <div className="pmwb-sec-title">{props.children}</div>
}

export function KV(props: { rows: Array<[string, React.ReactNode]> }): React.ReactElement {
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

export function DocTitle(props: { summary: string; sub?: string }): React.ReactElement {
  const date = new Date()
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="pmwb-doc-title">{dateStr} · {props.summary}</div>
      {props.sub !== undefined && <div className="pmwb-doc-sub">{props.sub}</div>}
    </div>
  )
}

export function ProgressBar(props: { value: number; total: number; caption?: string; tone?: 'ok' | 'warn' | 'bad' }): React.ReactElement {
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

export function StackedBar(props: { segments: Array<{ label: string; value: number; color: string }>; total?: number }): React.ReactElement {
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

export function EnvelopeErrors(props: { errors: Array<{ code: string; message: string; hint?: string }> }): React.ReactElement {
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

export interface Loadable<T> { data: T | null; error: string | null }

export function usePageData<T>(fetcher: () => Promise<T>, deps: React.DependencyList): Loadable<T> & { reload: () => void } {
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
  return { ...state, error: state.error, data: state.data, reload }
}

/** Ask Agent bridge (DECISION.IA06): copies the stable reference to the clipboard —
 * only stable refs cross the boundary, never page content (PRD §13). */
export function AskAgent(props: { refId: string; t: Translate }): React.ReactElement {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="pmwb-btn"
      style={{ fontSize: 12, padding: '3px 10px' }}
      onClick={() => {
        void navigator.clipboard?.writeText(props.refId).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }).catch(() => setCopied(false))
      }}
    >
      {copied ? '✓ ref copied' : props.t('askAgent')}
    </button>
  )
}

/** Empty state with an action meaning (PRD §17). */
export function EmptyState(props: { line1: string; line2?: string; next?: string }): React.ReactElement {
  return (
    <div>
      <div style={{ fontWeight: 600, margin: '6px 0' }}>{props.line1}</div>
      {props.line2 !== undefined && <div className="pmwb-muted">{props.line2}</div>}
      {props.next !== undefined && <div style={{ marginTop: 8 }}><Badge tone="neutral">Next</Badge> <span style={{ fontSize: 13 }}>{props.next}</span></div>}
    </div>
  )
}
