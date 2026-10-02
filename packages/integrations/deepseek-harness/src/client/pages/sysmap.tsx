/** System Map (PR-IA-5): graph + inspector + impact + why-edge (Observed Candidate discipline). */
import React, { useState } from 'react'
import { getJSON } from '../api.ts'
import { Badge, Card, DocTitle, SectionTitle, isRec, str, usePageData, type AnyRecord } from '../ui.tsx'
import { GroupDiagram, type DiagEdge, type DiagGroup } from '../diagram.tsx'
import type { Translate } from '../i18n.ts'

/* --- archify-style standalone interactive architecture HTML (MASTer field data) --- */

interface ArchGroup { id: string; title: string; tone: string; col: number; nodes: Array<{ id: string; title: string; sub?: string }> }
interface ArchEdge { from: string; to: string; label?: string; dashed?: boolean }
interface ArchData { title: string; groups: ArchGroup[]; edges: ArchEdge[] }

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Build a standalone interactive HTML (dark/light toggle, zoom, SVG export) from the
 * MASTer field-mapped architecture. Pure string templating — no runtime deps. */
export function buildArchifyStyleHtml(data: ArchData): string {
  const COL_X = [48, 540, 1032]
  const GROUP_W = 456
  const NODE_W = 400
  const NODE_H_BASE = 46
  const HEAD = 34
  const GAP = 12

  // layout: per column, stack groups; per group, stack nodes
  const pos: Record<string, { x: number; y: number; w: number; h: number }> = {}
  const groupRects: Array<{ id: string; title: string; tone: string; x: number; y: number; w: number; h: number }> = []
  let maxBottom = 0
  const colBottom: number[] = []
  for (const g of data.groups) {
    const ci = g.col - 1
    const x0 = COL_X[ci] ?? COL_X[0] ?? 40
    const y0 = colBottom[ci] ?? 40
    let y = y0 + HEAD + GAP
    for (const n of g.nodes) {
      const h = n.sub ? NODE_H_BASE + 18 : NODE_H_BASE
      pos[n.id] = { x: x0 + GAP, y, w: NODE_W, h }
      y += h + GAP
    }
    const gh = y - y0
    groupRects.push({ id: g.id, title: g.title, tone: g.tone, x: x0, y: y0, w: GROUP_W, h: gh })
    colBottom[ci] = y0 + gh + 44
    maxBottom = Math.max(maxBottom, y0 + gh)
  }

  const width = (COL_X[COL_X.length - 1] ?? 40) + GROUP_W + 48
  const height = maxBottom + 56

  const nodeSvg = data.groups.flatMap((g) => g.nodes.map((n) => {
    const p = pos[n.id]!
    return `<g class="node"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="8"/><text class="nt" x="${p.x + 14}" y="${p.y + (n.sub ? 22 : 29)}">${esc(n.title)}</text>${n.sub ? `<text class="ns" x="${p.x + 14}" y="${p.y + 40}">${esc(n.sub)}</text>` : ''}</g>`
  })).join('\n')
  const groupSvg = groupRects.map((r) => `<g class="group" data-tone="${r.tone}"><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="12"/><text class="gt" x="${r.x + 16}" y="${r.y + 24}">${esc(r.title)}</text></g>`).join('\n')

  const edgeSvg = data.edges.flatMap((e) => {
    const a = pos[e.from]
    const b = pos[e.to]
    if (a === undefined || b === undefined) return []
    const sx = a.x + a.w, sy = a.y + a.h / 2
    const ex = b.x, ey = b.y + b.h / 2
    const midX = (sx + ex) / 2
    const d = `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ey} L ${ex} ${ey}`
    const label = e.label ? `<text class="el" x="${midX}" y="${(sy + ey) / 2 - 6}" text-anchor="middle">${esc(e.label)}</text>` : ''
    return [`<path class="edge${e.dashed ? ' dashed' : ''}" d="${d}" marker-end="url(#arr)"/>${label}`]
  }).join('\n')

  const template = `<!DOCTYPE html>
<html lang="zh" data-theme="light">
<head>
<meta charset="utf-8"/>
<title>${esc(data.title)}</title>
<style>
:root { --bg:#f5f5f5; --surface:#ffffff; --text:#111827; --muted:#6b7280; --line:#e5e7eb; }
html[data-theme="dark"] { --bg:#0f172a; --surface:#1e293b; --text:#e2e8f0; --muted:#94a3b8; --line:#334155; }
body { margin:0; font-family: var(--tk-typography-family-sans, system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif); background: var(--bg); color: var(--text); }
.toolbar { display:flex; gap:10px; align-items:center; padding:12px 18px; border-bottom:1px solid var(--line); position:sticky; top:0; background:var(--surface); z-index:3; }
.toolbar .title { font-weight:650; font-size:15px; margin-right:auto; }
.btn { font:inherit; font-size:12.5px; padding:5px 12px; border-radius:7px; border:1px solid var(--line); background:var(--surface); color:var(--text); cursor:pointer; }
.btn:hover { border-color: var(--tk-color-brand-primary,#1677ff); }
#viewport { overflow:auto; padding:8px; }
svg { display:block; }
svg .group rect { fill: var(--surface); stroke: var(--g-tone); stroke-width:2; }
svg .group .gt { font-size:13px; font-weight:650; fill: var(--g-tone); }
svg .node rect { fill: var(--surface); stroke: var(--line); stroke-width:1.2; }
svg .node .nt { font-size:12.5px; font-weight:600; fill: var(--text); }
svg .node .ns { font-size:11px; fill: var(--muted); }
svg .edge { fill:none; stroke: var(--muted); stroke-width:1.4; }
svg .edge.dashed { stroke-dasharray: 5 4; }
svg .el { font-size:11px; fill: var(--muted); }
svg .edge-arrow { fill: var(--muted); }
</style>
</head>
<body>
<div class="toolbar">
  <span class="title">${esc(data.title)}</span>
  <button class="btn" onclick="var h=document.documentElement; h.setAttribute('data-theme', h.getAttribute('data-theme')==='dark'?'light':'dark')">Dark / Light</button>
  <button class="btn" onclick="zoom(0.85)">−</button>
  <button class="btn" onclick="zoom(1.18)">+</button>
  <button class="btn" onclick="exportSvg()">Export SVG</button>
  <span class="zoom-label" style="font-size:12px;color:var(--muted)">100%</span>
</div>
<div id="viewport">
<svg id="arch" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
<defs><marker id="arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><polygon class="edge-arrow" points="0 0, 7 3.5, 0 7"/></marker></defs>
${groupSvg}
${nodeSvg}
${edgeSvg}
</svg>
</div>
<script>
var scale = 1;
function zoom(factor) {
  scale = Math.min(2.5, Math.max(0.4, scale * factor));
  var svg = document.getElementById('arch');
  svg.style.transform = 'scale(' + scale + ')';
  svg.style.transformOrigin = '0 0';
  document.querySelector('.zoom-label').textContent = Math.round(scale * 100) + '%';
}
function exportSvg() {
  var svg = document.getElementById('arch');
  var clone = svg.cloneNode(true);
  clone.setAttribute('data-theme', document.documentElement.getAttribute('data-theme'));
  var source = '<?xml version="1.0" encoding="UTF-8"?>\\n' + clone.outerHTML;
  var blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'master-architecture.svg';
  a.click();
  URL.revokeObjectURL(a.href);
}
</script>
</body>
</html>`

  return template
}

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
      <Card title={t('map.interactive')} meta={t('map.interactiveNote')}>
        <ArchifyPreview html={buildArchifyStyleHtml(arch)} t={t} />
      </Card>
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

/** Interactive archify-style preview: renders the standalone HTML in a sandboxed
 * same-document iframe (srcdoc) with an open-in-tab escape hatch. */
function ArchifyPreview(props: { html: string; t: Translate }): React.ReactElement {
  const { t } = props
  const [open, setOpen] = useState(true)
  const blobRef = React.useRef<string | null>(null)
  const openInTab = (): void => {
    if (blobRef.current !== null) URL.revokeObjectURL(blobRef.current)
    blobRef.current = URL.createObjectURL(new Blob([props.html], { type: 'text/html;charset=utf-8' }))
    window.open(blobRef.current, '_blank')
  }
  return (
    <div>
      <div className="pmwb-actions">
        <button className="pmwb-btn" onClick={() => setOpen(!open)}>{open ? t('map.collapse') : t('map.expand')}</button>
        <button className="pmwb-btn" onClick={openInTab}>{t('map.openTab')}</button>
      </div>
      {open && (
        <iframe
          srcDoc={props.html}
          title="MASTer architecture"
          style={{ width: '100%', height: 720, border: '1px solid #e5e7eb', borderRadius: 8, display: 'block', background: '#fff' }}
        />
      )}
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
