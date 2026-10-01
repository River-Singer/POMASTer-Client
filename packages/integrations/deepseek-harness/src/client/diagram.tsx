import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'

export interface DiagNode { id: string; title: string; sub?: string }
export interface DiagGroup { id: string; title: string; tone: string; col: number; nodes: DiagNode[] }
export interface DiagEdge { from: string; to: string; label?: string; dashed?: boolean }

const DIAG_CSS = `
.pmwb-diag { position: relative; }
.pmwb-diag-grid { display: grid; gap: var(--tk-spacing-md, 12px); }
.pmwb-diag-group { border: 2px solid var(--g-tone, #1677ff); border-radius: var(--tk-radius-lg, 8px); background: var(--tk-color-surface-container, #ffffff); padding: var(--tk-spacing-sm, 8px); min-width: 0; }
.pmwb-diag-group-title { color: var(--g-tone, #1677ff); font-weight: var(--tk-typography-weight-semibold, 600); font-size: 12.5px; margin: 2px 2px var(--tk-spacing-xs, 4px); }
.pmwb-diag-node { border: 1px solid var(--tk-color-border-default, #d9d9d9); background: var(--tk-color-surface-page, #f5f5f5); border-radius: var(--tk-radius-md, 6px); padding: 5px 10px; margin: var(--tk-spacing-xs, 4px) 0; }
.pmwb-diag-node .nn { font-size: 12.5px; font-weight: var(--tk-typography-weight-semibold, 600); }
.pmwb-diag-node .ns { font-size: 11px; color: var(--tk-color-text-tertiary, rgba(0,0,0,.45)); margin-top: 1px; word-break: break-word; }
.pmwb-diag-edges { position: absolute; inset: 0; pointer-events: none; }
.pmwb-diag-edges .edge-label { font-size: 11px; fill: var(--tk-color-text-secondary, rgba(0,0,0,.65)); }
.pmwb-diag-edges .edge-line { fill: none; stroke: var(--tk-color-text-tertiary, rgba(0,0,0,.45)); stroke-width: 1.4; }
.pmwb-diag-edges .edge-arrow { fill: var(--tk-color-text-tertiary, rgba(0,0,0,.45)); }
`

interface Props {
  groups: Array<{ id: string; title: string; tone: string; col: number; nodes: Array<{ id: string; title: string; sub?: string }> }>
  edges: Array<{ from: string; to: string; label?: string; dashed?: boolean }>
  /** px column gap tuning */
  compact?: boolean
}

/**
 * Grouped architecture diagram (grouper boxes + node cards + labelled edges),
 * our own design tokens — the M4 topology look. Nodes are laid out in columns;
 * edges are measured from the DOM and drawn as elbow polylines with arrows.
 */
export function GroupDiagram(props: Props): React.ReactElement {
  const { groups, edges, compact } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const [routes, setRoutes] = useState<Array<{ d: string; label: string; lx: number; ly: number; dashed: boolean }>>([])
  const maxCol = useMemo(() => Math.max(...groups.map((g) => g.col), 1), [groups])

  const measure = useLayoutEffect(() => {
    const container = containerRef.current
    if (container === null) return
    const compute = (): void => {
      const cRect = container.getBoundingClientRect()
      const next: Array<{ d: string; label: string; lx: number; ly: number; dashed: boolean }> = []
      for (const edge of edges) {
        const fromEl = container.querySelector(`[data-nid="${edge.from}"]`)
        const toEl = container.querySelector(`[data-nid="${edge.to}"]`)
        if (fromEl === null || toEl === null) continue
        const a = fromEl.getBoundingClientRect()
        const b = toEl.getBoundingClientRect()
        // anchor: right-center of source, left-center of target (or top/bottom when stacked)
        const sameCol = Math.abs(a.left - b.left) < 8
        const sx = sameCol ? a.left + a.width / 2 - cRect.left : (b.left > a.left ? a.right : a.left) - cRect.left
        const sy = a.top + a.height / 2 - cRect.top
        const ex = sameCol ? b.left + b.width / 2 - cRect.left : (b.left > a.left ? b.left : b.right) - cRect.left
        const ey = b.top + b.height / 2 - cRect.top
        const midX = (sx + ex) / 2
        const d = sameCol
          ? `M ${sx} ${sy} L ${ex} ${ey}`
          : `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ey} L ${ex} ${ey}`
        next.push({ d, label: edge.label ?? '', lx: midX, ly: (sy + ey) / 2, dashed: edge.dashed === true })
      }
      setRoutes(next)
    }
    compute()
    const observer = new ResizeObserver(compute)
    observer.observe(container)
    return () => observer.disconnect()
  }, [groups, edges])

  const cols: Array<Array<(typeof groups)[number]>> = []
  for (const g of groups) {
    ;(cols[g.col - 1] ??= []).push(g)
  }

  return (
    <div className="pmwb-diag">
      <style>{DIAG_CSS}</style>
      <div
        ref={containerRef}
        className="pmwb-diag-grid"
        style={{ gridTemplateColumns: `repeat(${maxCol}, minmax(0, 1fr))`, fontSize: compact ? 12 : undefined }}
      >
        {cols.map((columnGroups, ci) => (
          <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 12, minWidth: 0 }}>
            {columnGroups.map((g) => (
              <div key={g.id} className="pmwb-diag-group" style={{ '--g-tone': g.tone } as React.CSSProperties}>
                <div className="pmwb-diag-group-title">{g.title}</div>
                {g.nodes.map((n) => (
                  <div key={n.id} className="pmwb-diag-node" data-nid={n.id}>
                    <div className="nn">{n.title}</div>
                    {n.sub !== undefined && <div className="ns">{n.sub}</div>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
      <svg className="pmwb-diag-edges" width="100%" height="100%">
        <defs>
          <marker id="pmwb-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon className="edge-arrow" points="0 0, 7 3.5, 0 7" />
          </marker>
        </defs>
        {routes.map((r, i) => (
          <g key={i}>
            <path className="edge-line" d={r.d} markerEnd="url(#pmwb-arrow)" strokeDasharray={r.dashed ? '5 4' : undefined} />
            {r.label !== '' && (
              <text className="edge-label" x={r.lx} y={r.ly - 6} textAnchor="middle">{r.label}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
