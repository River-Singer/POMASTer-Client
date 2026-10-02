/** System Map (PR-IA-5): graph + inspector + impact + why-edge (Observed Candidate discipline). */
import React, { useState } from 'react'
import { getJSON } from '../api.ts'
import { Badge, Card, DocTitle, SectionTitle, isRec, str, usePageData, type AnyRecord } from '../ui.tsx'
import { GroupDiagram, type DiagEdge, type DiagGroup } from '../diagram.tsx'
import type { Translate } from '../i18n.ts'

interface MasterPayload {
  identity: { name: string; root: string }
  trellis: { tasks: AnyRecord[]; manifestLines: number; specDirs: string[] }
  architecture: { title: string; groups: DiagGroup[]; edges: DiagEdge[] }
}

export function SystemMapPage(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const master = usePageData<MasterPayload>(() => getJSON('/api/pomaster/master'), [])
  const [selected, setSelected] = useState<string | null>(null)

  if (master.error !== null) return <div className="pmwb-err">{t('tab.map')}: {master.error}</div>
  if (master.data === null) return <div className="pmwb-empty">{t('common.loading')}</div>

  const arch = master.data.architecture
  const allNodes = arch.groups.flatMap((g) => g.nodes.map((n) => ({ ...n, group: g.title, tone: g.tone })))
  const selectedNode = allNodes.find((n) => n.id === selected) ?? null
  const edgeFor = (nid: string): DiagEdge[] => arch.edges.filter((e) => e.from === nid || e.to === nid)

  return (
    <div>
      <DocTitle summary={t('map.title')} sub={`${master.data.identity.name} — ${t('map.observed')}`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 12 }}>
        <Card>
          <GroupDiagram groups={arch.groups} edges={arch.edges} />
          <div className="pmwb-muted" style={{ marginTop: 8 }}>
            {t('map.observedNote')} · {t('map.clickNode')}
          </div>
        </Card>
        <Card title={t('map.inspector')}>
          {selectedNode === null ? (
            <div className="pmwb-empty">{t('map.pickNode')}</div>
          ) : (
            <>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{selectedNode.title}</div>
              {selectedNode.sub !== undefined && <div className="pmwb-muted" style={{ marginBottom: 6 }}>{selectedNode.sub}</div>}
              <dl className="pmwb-kv">
                <dt>Type</dt><dd>{t('map.nodeGroup')} {selectedNode.group}</dd>
                <dt>Source</dt><dd className="pmwb-mono" style={{ fontSize: 11 }}>Observed Candidate · fs recon</dd>
                <dt>{t('kn.selectedByTask')}</dt><dd>—</dd>
              </dl>
              <SectionTitle>{t('topology.forward')}</SectionTitle>
              <ul className="pmwb-list">
                {edgeFor(selectedNode.id).filter((e) => e.from === selectedNode.id).map((e, i) => <li key={i}>{e.to} {e.label !== undefined && <span className="pmwb-muted">· {e.label}</span>}</li>)}
              </ul>
              <SectionTitle>{t('topology.reverse')}</SectionTitle>
              <ul className="pmwb-list">
                {edgeFor(selectedNode.id).filter((e) => e.to === selectedNode.id).map((e, i) => <li key={i}>{e.from} {e.label !== undefined && <span className="pmwb-muted">· {e.label}</span>}</li>)}
              </ul>
              <div className="pmwb-actions" style={{ marginTop: 8 }}>
                <button className="pmwb-btn" style={{ fontSize: 12 }} onClick={() => { void navigator.clipboard?.writeText(`system-map:${selectedNode.id}`) }}>{t('askAgent')}</button>
              </div>
            </>
          )}
        </Card>
      </div>
      <SectionTitle>{t('map.impactTitle')}</SectionTitle>
      <ImpactProbe t={t} />
    </div>
  )
}

function ImpactProbe(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const { data } = usePageData<AnyRecord>(() => getJSON('/api/pomaster/topology?ref=TASK.DSH_WORKBENCH'), [])
  if (data === null) return <div className="pmwb-empty">{t('common.loading')}</div>
  const impact = isRec(data['impact']) ? ((data['impact'] as AnyRecord)['impact'] as AnyRecord | undefined) : null
  const affected = Array.isArray(impact?.['affected']) ? (impact?.['affected'] as AnyRecord[]) : []
  return (
    <Card title={t('map.impact')} meta={t('map.impactNote')}>
      <div className="pmwb-progress-row">
        <Badge tone="neutral">{t('map.depth')} {str(impact?.['max_depth'])}</Badge>
        <Badge tone={impact?.['max_depth_reached'] === true ? 'warn' : 'ok'}>{impact?.['max_depth_reached'] === true ? 'truncated' : 'complete'}</Badge>
      </div>
      <div style={{ marginTop: 8 }}>
        {affected.map((a, i) => <span key={i} className="pmwb-node">{str(a['id'] ?? JSON.stringify(a))}</span>)}
        {affected.length === 0 && <span className="pmwb-muted">{t('topology.noDownstream', { d: str(impact?.['max_depth']) })}</span>}
      </div>
    </Card>
  )
}
