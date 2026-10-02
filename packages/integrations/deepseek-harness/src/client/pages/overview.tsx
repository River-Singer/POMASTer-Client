/** Overview (PR-IA-2 + three-domain portal): 30-second project answer + gateway to the three domains. */
import React, { useEffect } from 'react'
import { getJSON } from '../api.ts'
import { Badge, Card, EmptyState, ProgressBar, SectionTitle, str, usePageData } from '../ui.tsx'
import type { Translate } from '../i18n.ts'
import { GroupDiagram } from '../diagram.tsx'
import type { DiagEdge, DiagGroup } from '../diagram.tsx'

interface Overview2 {
  project: { name: string; pomasterVersion: string | null }
  baseline: { state: string }
  activeTask: { present: boolean; count: number }
  attention: { total: number; byCode: Record<string, number> }
  nextAction: { routeId: string; beat: string; command: string; reason: string } | null
}

interface Work2 {
  review: { expected?: { acceptance?: Array<{ criterion?: string; satisfied?: boolean }> } } | null
  executions: { executions?: Array<{ execution_id: string; status: string; role: string }> } | null
}

interface Master2 {
  identity: { name: string }
  storeStatus: { routeId: string | null; objects: { total: number } | null }
  trellis: { tasks: unknown[]; tasksByStatus: Record<string, number>; manifestLines: number }
  srcTsFiles: number
}

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  tasks: (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M4 5h16v15H4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M4 5l2-2h12l2 2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
  ),
  outputs: (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" /></svg>
  ),
  code: (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="m8 6-5 6 5 6M16 6l5 6-5 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
}

export function OverviewPage2(props: { t: Translate; onOpenWork: () => void; onGoto: (tab: string) => void }): React.ReactElement {
  const { t } = props
  const overview = usePageData<Overview2>(() => getJSON('/api/pomaster/overview'), [])
  const work = usePageData<Work2>(() => getJSON('/api/pomaster/work'), [])
  const master = usePageData<Master2>(() => getJSON('/api/pomaster/master'), [])
  const { data } = overview
  if (overview.error !== null) return <div className="pmwb-err">{t('tab.overview')}: {overview.error}</div>
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>

  const acceptance = work.data?.review?.expected?.acceptance ?? []
  const verified = acceptance.filter((a) => a.satisfied === true).length
  const tasksTotal = master.data?.trellis.tasks.length ?? 0
  const tasksInProgress = master.data?.trellis.tasksByStatus['in_progress'] ?? 0

  return (
    <div>
      <div className="pmwb-actions">
        <button className="pmwb-btn" onClick={overview.reload}>{t('common.refresh')}</button>
      </div>

      {/* three-domain portal — 一目了然 */}
      <div className="pmwb-portal">
        <div className="pmwb-portal-card" onClick={props.onOpenWork} role="button">
          <div className="pc-icon">{DOMAIN_ICONS.tasks}</div>
          <div className="pc-title">{t('portal.tasks')}</div>
          <div className="pc-path">.trellis/tasks</div>
          <div className="pc-stat"><b>{tasksTotal}</b> 个任务 · <b>{tasksInProgress}</b> 进行中</div>
        </div>
        <div className="pmwb-portal-card" onClick={() => props.onGoto('knowledge')} role="button">
          <div className="pc-icon">{DOMAIN_ICONS.outputs}</div>
          <div className="pc-title">{t('portal.facts')}</div>
          <div className="pc-path">outputs · doc</div>
          <div className="pc-stat"><b>BP 1.4.0</b> approved · <b>{master.data?.trellis.manifestLines ?? '—'}</b> 规范条目 · <b>3</b> 文档</div>
        </div>
        <div className="pmwb-portal-card" onClick={() => props.onGoto('map')} role="button">
          <div className="pc-icon">{DOMAIN_ICONS.code}</div>
          <div className="pc-title">{t('portal.code')}</div>
          <div className="pc-path">src · Feature-Sliced</div>
          <div className="pc-stat"><b>{master.data?.srcTsFiles ?? '—'}</b> TS 文件 · 5 层分层</div>
        </div>
      </div>

      <Card title={t('ov2.summary')}>
        <div style={{ fontSize: 15 }}>
          <b>{data.project.name}</b> — <Badge tone={data.baseline.state === 'confirmed' ? 'ok' : 'warn'}>{data.baseline.state}</Badge>
          {'  '}· {t('overview.stage')}: <b>{t('overview.stageName')}</b>
        </div>
      </Card>
      <div className="pmwb-grid2">
        <Card title={t('ov2.currentTask')}>
          {data.activeTask.present ? (
            <>
              <div style={{ fontWeight: 600 }}>TASK.DSH_WORKBENCH</div>
              <div className="pmwb-muted" style={{ margin: '4px 0 8px' }}>{t('ov2.phaseWrapup')}</div>
              <ProgressBar value={verified} total={Math.max(acceptance.length, 1)} />
              <div className="pmwb-actions" style={{ marginTop: 10 }}>
                <button className="pmwb-btn" onClick={props.onOpenWork}>{t('ov2.openWork')}</button>
              </div>
            </>
          ) : <EmptyState line1={t('overview.none')} next={data.nextAction?.command} />}
        </Card>
        <Card title={t('ov2.humanAttention')}>
          {data.attention.total === 0
            ? <EmptyState line1={t('common.clean')} line2={t('ov2.attentionNone')} next={data.nextAction?.command} />
            : <Badge tone="warn">{data.attention.total}</Badge>}
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
