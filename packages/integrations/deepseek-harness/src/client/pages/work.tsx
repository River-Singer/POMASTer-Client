/** Work v2 (task center): full task list, progress, per-task detail with agent dispatch records. */
import React, { useState } from 'react'
import { getJSON } from '../api.ts'
import { Badge, Card, DocTitle, ProgressBar, SectionTitle, isRec, str, toneFor, usePageData, type AnyRecord } from '../ui.tsx'
import type { Translate } from '../i18n.ts'

interface MasterTasks {
  identity: { name: string; root: string }
  trellis: { tasks: AnyRecord[]; tasksByStatus: Record<string, number>; manifestLines: number }
}
interface TaskDetail {
  dir: string
  task: Record<string, unknown> | null
  prd: string
  implementRefs: Array<{ file: string; reason: string }>
  checkRefs: Array<{ file: string; reason: string }>
}

const STATUS_TONE: Record<string, 'ok' | 'warn' | 'bad' | 'neutral'> = {
  in_progress: 'warn',
  done: 'ok',
  planning: 'neutral',
  blocked: 'bad',
}

export function WorkPage2(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const master = usePageData<MasterTasks>(() => getJSON('/api/pomaster/master'), [])
  const [openDir, setOpenDir] = useState<string | null>(null)
  const detail = usePageData<TaskDetail | null>(
    () => (openDir !== null ? getJSON(`/api/pomaster/master-task?dir=${encodeURIComponent(openDir)}`) : Promise.resolve(null)),
    [openDir],
  )

  if (master.error !== null) return <div className="pmwb-err">{t('tab.work')}: {master.error}</div>
  if (master.data === null) return <div className="pmwb-empty">{t('common.loading')}</div>

  const tasks = master.data.trellis.tasks
  const byStatus = master.data.trellis.tasksByStatus

  return (
    <div>
      <DocTitle summary="任务中心 · MASTer 开发任务" sub={master.data.identity.root} />
      <div className="pmwb-actions" style={{ marginBottom: 4 }}>
        {Object.entries(byStatus).map(([s, n]) => (
          <Badge key={s} tone={STATUS_TONE[s] ?? 'neutral'}>{s} · {n}</Badge>
        ))}
        <span className="pmwb-muted">共 {tasks.length} 个任务 · 来源 .trellis/tasks（实际治理数据，只读映射）</span>
      </div>

      <table className="pmwb-table">
        <thead>
          <tr>
            <th>任务</th><th>状态</th><th>优先级</th><th>负责人</th><th>创建</th><th>实现依据</th><th>检查依据</th><th>父任务</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const dir = str(task['dir'])
            const isOpen = openDir === dir
            const status = str(task['status']) || 'unknown'
            return (
              <React.Fragment key={dir}>
                <tr
                  style={{ cursor: 'pointer' }}
                  onClick={() => setOpenDir(isOpen ? null : dir)}
                >
                  <td>
                    <b>{str(task['title'])}</b>
                    <div className="pmwb-mono pmwb-muted" style={{ fontSize: 11 }}>{dir}</div>
                  </td>
                  <td><Badge tone={STATUS_TONE[status] ?? 'neutral'}>{status}</Badge></td>
                  <td className="pmwb-mono">{str(task['priority'])}</td>
                  <td>{str(task['assignee'])}</td>
                  <td className="pmwb-muted">{str(task['createdAt'])}</td>
                  <td>{str(task['implementRefs'])}</td>
                  <td>{str(task['checkRefs'])}</td>
                  <td className="pmwb-muted">{str(task['parent'])}</td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={8} style={{ background: '#f9fafb' }}>
                      {detail.error !== null && <div className="pmwb-err">{detail.error}</div>}
                      {detail.data === null ? <div className="pmwb-empty">{t('common.loading')}</div> : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <div className="pmwb-args-title">description</div>
                            <div style={{ fontSize: 13, marginBottom: 10 }}>{str(detail.data.task?.['description'])}</div>
                            <div className="pmwb-args-title">prd.md（节选）</div>
                            <pre className="pmwb-pre" style={{ maxHeight: 220 }}>{detail.data.prd || '—'}</pre>
                            <div className="pmwb-args-title">分支 / 创建者</div>
                            <div style={{ fontSize: 12.5 }}>
                              {str(detail.data.task?.['base_branch'])} · {str(detail.data.task?.['creator'])}
                            </div>
                          </div>
                          <div>
                            <div className="pmwb-args-title">实现依据（agent 派遣引用 · implement.jsonl {detail.data.implementRefs.length}）</div>
                            <ul className="pmwb-list">
                              {detail.data.implementRefs.map((r, i) => (
                                <li key={i}><span className="pmwb-mono" style={{ fontSize: 11 }}>{r.file}</span><div className="pmwb-muted">{r.reason}</div></li>
                              ))}
                              {detail.data.implementRefs.length === 0 && <div className="pmwb-empty">—</div>}
                            </ul>
                            <div className="pmwb-args-title">检查依据（check.jsonl {detail.data.checkRefs.length}）</div>
                            <ul className="pmwb-list">
                              {detail.data.checkRefs.map((r, i) => (
                                <li key={i}><span className="pmwb-mono" style={{ fontSize: 11 }}>{r.file}</span><div className="pmwb-muted">{r.reason}</div></li>
                              ))}
                              {detail.data.checkRefs.length === 0 && <div className="pmwb-empty">—</div>}
                            </ul>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>

      <SectionTitle>{t('ov2.currentTask')}（本工作区 · 插件治理中）</SectionTitle>
      <CurrentWorkspaceTask t={t} />
    </div>
  )
}

function CurrentWorkspaceTask(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const { data } = usePageData<WorkPayload>(() => getJSON('/api/pomaster/work'), [])
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  const review = isRec(data.review) ? (data.review as AnyRecord) : null
  const expected = isRec(review?.['expected']) ? (review?.['expected'] as AnyRecord) : null
  const acceptance = Array.isArray(expected?.['acceptance']) ? (expected?.['acceptance'] as Array<Record<string, unknown>>) : []
  const verified = acceptance.filter((a) => a.satisfied === true).length
  return (
    <Card title={`TASK.DSH_WORKBENCH · ${str(review?.['task']) === '—' ? '' : 'review'}`} meta={t('wk.noCoT')}>
      <ProgressBar value={verified} total={Math.max(acceptance.length, 1)} tone={verified === acceptance.length ? 'ok' : 'warn'} />
      <ul className="pmwb-check" style={{ marginTop: 10 }}>
        {acceptance.map((a, i) => (
          <li key={i}>
            <span className="pmwb-check-mark" data-ok={String(a.satisfied === true)}>{a.satisfied === true ? '✓' : '…'}</span>
            <div>
              <div>{str(a['criterion'])}</div>
              <div className="pmwb-muted">{str(a['claim_verdict'])} · {str(a['claim'])}</div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

interface WorkPayload {
  review: { task?: string; expected?: { acceptance?: Array<{ criterion?: string; satisfied?: boolean; claim_verdict?: string }> } } | null
  alerts: { alerts?: Array<{ code?: string; message?: string }> } | null
}

