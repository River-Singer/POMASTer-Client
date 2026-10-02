/** Overview (PR-IA-2): 30-second answer to "how is the project doing". */
import React, { useEffect } from 'react'
import { getJSON } from '../api.ts'
import { Badge, Card, EmptyState, ProgressBar, SectionTitle, str, usePageData, type AnyRecord } from '../ui.tsx'
import type { Translate } from '../i18n.ts'
import { GroupDiagram } from '../diagram.tsx'
import type { DiagEdge, DiagGroup } from '../diagram.tsx'

interface Overview2 {
  project: { name: string; pomasterVersion: string | null }
  baseline: { state: string }
  activeTask: { present: boolean; count: number }
  attention: { total: number; byCode: Record<string, number> }
  objects: { total: number; byKind: Record<string, number>; byLifecycle: Record<string, number> }
  nextAction: { routeId: string; beat: string; command: string; reason: string } | null
  errors: Array<{ code: string; message: string }>
}

interface Work2 {
  review: { expected?: { acceptance?: Array<{ criterion?: string; satisfied?: boolean }> } } | null
  executions: { executions?: Array<{ execution_id: string; status: string; role: string; started_at?: string }> } | null
}

export function OverviewPage2(props: { t: Translate; onOpenWork: () => void }): React.ReactElement {
  const { t } = props
  const overview = usePageData<Overview2>(() => getJSON('/api/pomaster/overview'), [])
  const work = usePageData<Work2>(() => getJSON('/api/pomaster/work'), [])
  const { data } = overview
  if (overview.error !== null) return <div className="pmwb-err">{t('tab.overview')}: {overview.error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>

  const acceptance = work.data?.review?.expected?.acceptance ?? []
  const verified = acceptance.filter((a) => a.satisfied === true).length
  const attentionTotal = data.attention.total

  return (
    <div>
      <div className="pmwb-actions">
        <button className="pmwb-btn" onClick={overview.reload}>{t('common.refresh')}</button>
      </div>
      <Card title={t('ov2.summary')}>
        <div style={{ fontSize: 15 }}>
          <b>{data.project.name}</b> — {t('overview.governedBy')}: POMaster · <Badge tone={data.baseline.state === 'confirmed' ? 'ok' : 'warn'}>{data.baseline.state}</Badge>
        </div>
      </Card>
      <Card title={t('ov2.currentTask')}>
        {data.activeTask.present ? (
          <>
            <div style={{ fontSize: 15, fontWeight: 600 }}>TASK.DSH_WORKBENCH</div>
            <div className="pmwb-muted" style={{ margin: '4px 0 8px' }}>{t('ov2.phaseWrapup')} · {verified}/{acceptance.length} {t('tasks.verified')}</div>
            <ProgressBar value={verified} total={Math.max(acceptance.length, 1)} />
            <div className="pmwb-actions" style={{ marginTop: 10 }}>
              <button className="pmwb-btn" onClick={props.onOpenWork}>{t('ov2.openWork')}</button>
            </div>
          </>
        ) : (
          <EmptyState line1={t('overview.none')} next={data.nextAction?.command} />
        )}
      </Card>
      <div className="pmwb-grid2">
        <Card title={t('ov2.humanAttention')}>
          {attentionTotal === 0 ? (
            <EmptyState line1={t('common.clean')} line2={t('ov2.attentionNone')} next={data.nextAction?.command} />
          ) : (
            <Badge tone="warn">{attentionTotal}</Badge>
          )}
        </Card>
        <Card title={t('ov2.verification')}>
          <ProgressBar value={verified} total={Math.max(acceptance.length, 1)} tone={verified === acceptance.length ? 'ok' : 'warn'} />
          <div className="pmwb-muted" style={{ marginTop: 6 }}>
            {t('ov2.verifiedN', { n: verified })} · {acceptance.length - verified} {t('ov2.pendingN')}
          </div>
        </Card>
      </div>
      <Card title={t('ov2.agentActivity')}>
        {(work.data?.executions?.executions ?? []).slice(-3).reverse().map((e) => (
          <div key={e.execution_id} className="pmwb-mono pmwb-muted" style={{ margin: '2px 0' }}>
            {e.execution_id} · {e.status} · {str(e.role)}
          </div>
        ))}
        {(work.data?.executions?.executions ?? []).length === 0 && <div className="pmwb-empty">{t('common.empty')}</div>}
      </Card>
      {data.nextAction !== null && (
        <Card title={t('overview.nextAction')}>
          <div>{data.nextAction.reason}</div>
          <div className="pmwb-mono pmwb-muted" style={{ marginTop: 6 }}>{data.nextAction.command}</div>
        </Card>
      )}
      <SectionTitle>{t('overview.architecture')}</SectionTitle>
      <Card>
        <OverviewArch />
      </Card>
    </div>
  )
}

function OverviewArch(): React.ReactElement {
  const groups: DiagGroup[] = [
    { id: 'ui', title: 'DSH Web · Workbench', tone: '#1677ff', col: 1, nodes: [{ id: 'panel', title: 'Workbench UI' }, { id: 'tools', title: 'Agent Tools' }] },
    { id: 'host', title: 'DSH Host 插件层', tone: '#722ed1', col: 2, nodes: [{ id: 'ctrl', title: 'PomasterController' }, { id: 'allow', title: 'Typed Actions' }] },
    { id: 'core', title: 'POMaster CLI / Kernel', tone: '#52c41a', col: 3, nodes: [{ id: 'cli', title: 'pomaster --json' }, { id: 'state', title: '.pomaster state' }] },
  ]
  const edges: DiagEdge[] = [
    { from: 'panel', to: 'ctrl', label: 'fetch /api/pomaster/*' },
    { from: 'tools', to: 'ctrl' },
    { from: 'ctrl', to: 'cli', label: 'subprocess --json' },
  ]
  return <GroupDiagram groups={groups} edges={edges} compact />
}

// re-exported for shell convenience
export { str as _str, type AnyRecord as _AnyRecord }
