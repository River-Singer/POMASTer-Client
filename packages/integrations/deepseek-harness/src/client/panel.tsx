import React from 'react'

const card: React.CSSProperties = {
  fontFamily: 'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  maxWidth: 720,
  margin: '48px auto',
  padding: '32px 36px',
  borderRadius: 14,
  border: '1px solid rgba(128,128,140,0.25)',
  background: 'rgba(127,127,140,0.06)',
  color: 'inherit',
  lineHeight: 1.65,
}

const badge: React.CSSProperties = {
  display: 'inline-block',
  fontSize: 12,
  letterSpacing: 1,
  padding: '2px 10px',
  borderRadius: 999,
  border: '1px solid rgba(128,128,140,0.4)',
  opacity: 0.75,
  marginBottom: 12,
}

const code: React.CSSProperties = {
  fontFamily: 'ui-monospace, Consolas, monospace',
  fontSize: 13,
  padding: '2px 6px',
  borderRadius: 6,
  background: 'rgba(127,127,160,0.18)',
}

const li: React.CSSProperties = { margin: '6px 0' }

/** Sidebar entry icon (list slot renders this component next to the label). */
export function PanelIcon(): React.ReactElement {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden>
      <rect x={1.5} y={1.5} width={13} height={13} rx={3} fill="none" stroke="currentColor" strokeWidth={1.5} />
      <rect x={4} y={4.5} width={8} height={2} rx={1} fill="currentColor" />
      <rect x={4} y={9.5} width={5} height={2} rx={1} fill="currentColor" opacity={0.6} />
    </svg>
  )
}

/**
 * PR-1 main surface: static shell in the must-tier. No host data channel is
 * wired yet (Typert out-of-tree codegen is the M1 gate — see compatibility
 * matrix); the projection is reachable today through the agent tool, which
 * shares the same workbench-model source.
 */
export function WorkbenchPanel(): React.ReactElement {
  return (
    <div style={card}>
      <span style={badge}>PR-1 SPIKE · READ-ONLY</span>
      <h1 style={{ fontSize: 22, margin: '4px 0 10px' }}>POMaster Workbench</h1>
      <p style={{ margin: '0 0 14px' }}>
        POMaster is the governing control plane for this workspace; the DeepSeek Harness is its runtime host.
        This panel is the Human projection surface — Phase 1 is read-only by design (PRD §39).
      </p>
      <div style={{ fontSize: 14 }}>
        <div style={{ fontWeight: 600, margin: '10px 0 4px' }}>How to read live project state</div>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          <li style={li}>
            Ask the agent: <span style={code}>use pomaster_project_overview</span> — it returns baseline, active
            task, attention summary and the kernel-computed next action.
          </li>
          <li style={li}>
            Data flows only through <span style={code}>pomaster status/alerts --json</span> subprocesses — the UI
            never writes <span style={code}>.pomaster</span> (PRD §1).
          </li>
          <li style={li}>
            Live refresh (typed remote + <span style={code}>*.changed</span>) lands in M1 — see the compatibility
            matrix inside this package.
          </li>
        </ul>
      </div>
      <p style={{ fontSize: 12, opacity: 0.65, margin: '18px 0 0' }}>
        @pomaster/dsh-bundle · POMaster Workbench × DeepSeek Harness integration · same-source projection contract
      </p>
    </div>
  )
}
