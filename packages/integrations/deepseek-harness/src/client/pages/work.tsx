/** Work (PR-IA-2): the task workspace — what/why/where-the-AI-is/context/attention. */
import React, { useState } from 'react'
import { getJSON, postCommand, type CommandEnvelope } from '../api.ts'
import { Badge, Card, DocTitle, EmptyState, EnvelopeErrors, ProgressBar, SectionTitle, isRec, str, usePageData, type AnyRecord } from '../ui.tsx'
import type { Translate } from '../i18n.ts'

interface WorkPayload {
  review: { task?: string; expected?: { intent?: string; acceptance?: Array<{ criterion?: string; claim?: string; satisfied?: boolean; claim_verdict?: string }> } } | null
  routing: { result?: { manifest?: { must_entries?: Array<{ ref?: string; reason?: string }>; advisory_entries?: unknown[] }; counts?: Record<string, unknown> } } | null
  executions: { executions?: Array<{ execution_id: string; status: string; role: string }> } | null
  alerts: { alerts?: Array<{ code?: string; message?: string; hint?: string }> } | null
}

export function WorkPage(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const { data, error, reload } = usePageData<WorkPayload>(() => getJSON('/api/pomaster/work'), [])
  const [ackNote, setAckNote] = useState('')
  const [ackResult, setAckResult] = useState<CommandEnvelope | null>(null)
  if (error !== null) return <div className="pmwb-err">{t('tab.work')}: {error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>

  const review = isRec(data.review) ? (data.review as AnyRecord) : null
  const expected = isRec(review?.['expected']) ? (review?.['expected'] as AnyRecord) : null
  const intent = str(expected?.['intent'])
  const acceptance = Array.isArray(expected?.['acceptance']) ? (expected?.['acceptance'] as Array<{ criterion?: string; claim?: string; satisfied?: boolean; claim_verdict?: string }>) : []
  const verified = acceptance.filter((a) => a.satisfied === true).length

  const routing = isRec(data.routing) ? (data.routing as AnyRecord) : null
  const routingResult = isRec(routing?.['result']) ? (routing?.['result'] as AnyRecord) : null
  const manifest = isRec(routingResult?.['manifest']) ? (routingResult?.['manifest'] as AnyRecord) : null
  const must = Array.isArray(manifest?.['must_entries']) ? (manifest?.['must_entries'] as AnyRecord[]) : []
  const advisory = Array.isArray(manifest?.['advisory_entries']) ? (manifest?.['advisory_entries'] as AnyRecord[]) : []

  const alerts = Array.isArray(data.alerts?.alerts) ? (data.alerts?.alerts as AnyRecord[]) : []
  const executions = Array.isArray(data.executions?.executions) ? (data.executions?.executions as AnyRecord[]) : []
  const latest = executions[0]

  const baselineAlert = alerts.find((a) => str(a['code']).toUpperCase().includes('BASELINE'))

  return (
    <div>
      <div className="pmwb-actions"><button className="pmwb-btn" onClick={reload}>{t('common.refresh')}</button></div>
      <DocTitle summary="POMaster 工作台 · 客户端化插件" sub="这条任务在做什么、AI 到哪一步、用了哪些资料、需要我做什么" />

      <Card title={t('wk.header')}>
        <p className="pmwb-para">{intent}</p>
        <div className="pmwb-actions">
          <Badge tone="warn">{t('ov2.phaseWrapup')}</Badge>
          <span className="pmwb-mono pmwb-muted">{str(review?.['task'])}</span>
        </div>
      </Card>

      <Card title={t('tasks.acceptance')}>
        <ProgressBar value={verified} total={Math.max(acceptance.length, 1)} tone={verified === acceptance.length ? 'ok' : 'warn'} />
        <ul className="pmwb-check" style={{ marginTop: 10 }}>
          {acceptance.map((a, i) => (
            <li key={i}>
              <span className="pmwb-check-mark" data-ok={String(a.satisfied === true)}>{a.satisfied === true ? '✓' : '…'}</span>
              <div>
                <div>{str(a['criterion'])}</div>
                <div className="pmwb-muted">{a.satisfied === true ? t('tasks.verified') : t('tasks.pending')} · {str(a['claim_verdict'])}</div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <SectionTitle>{t('wk.context')}</SectionTitle>
      <Card title={t('wk.selectedInjected')} meta={`Available ${str(manifest !== null ? '77' : null)} — ${t('wk.whyHint')}`}>
        <div className="pmwb-progress-row">
          <Badge tone="ok">{t('routing.selected')} {must.length}</Badge>
          <Badge tone="neutral">{t('routing.injected')} {must.length}</Badge>
          <Badge tone="warn">{t('routing.advisory')} {advisory.length}</Badge>
        </div>
        {must.length > 0 && (
          <ul className="pmwb-check" style={{ marginTop: 10 }}>
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

      <SectionTitle>{t('wk.agentActivity')}</SectionTitle>
      <Card>
        {latest !== undefined ? (
          <KV rows={[
            ['Execution', <span className="pmwb-mono">{str(latest['execution_id'])}</span>],
            ['Status', str(latest['status'])],
            ['Role', str(latest['role'])],
          ]} />
        ) : <div className="pmwb-empty">{t('common.empty')}</div>}
        <div className="pmwb-muted" style={{ marginTop: 6 }}>{t('wk.noCoT')}</div>
      </Card>

      <SectionTitle>{t('tab.attention')}</SectionTitle>
      {alerts.length === 0 ? (
        <Card><EmptyState line1={t('common.clean')} line2={t('ov2.attentionNone')} /></Card>
      ) : (
        <Card>
          <ul className="pmwb-list">
            {alerts.map((a, i) => <li key={i}>{str(a['message'])} {a['hint'] !== undefined && <span className="pmwb-muted">— {str(a['hint'])}</span>}</li>)}
          </ul>
        </Card>
      )}
      {baselineAlert !== undefined && (
        <Card title={t('wk.baselineContext')}>
          <div>{str(baselineAlert['message'])}</div>
          <div className="pmwb-muted" style={{ margin: '6px 0' }}>{t('wk.baselineImpact')}</div>
          <div className="pmwb-actions">
            <input className="pmwb-input" placeholder={t('wk.ackNotePlaceholder')} value={ackNote} onChange={(e) => setAckNote(e.target.value)} />
            <button
              className="pmwb-btn"
              onClick={() => {
                void postCommand('baseline.ackDrifted', { note: ackNote || 'acknowledged via workbench' }).then(setAckResult)
              }}
            >
              {t('wk.acknowledge')}
            </button>
          </div>
          <div className="pmwb-muted">{t('wk.requiresOwner')}</div>
          {ackResult !== null && (
            <div style={{ marginTop: 6 }}>
              <Badge tone={ackResult.ok ? 'ok' : 'bad'}>{ackResult.ok ? t('common.ok') : t('common.rejected')}</Badge>
              <EnvelopeErrors errors={ackResult.errors} />
            </div>
          )}
        </Card>
      )}
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
