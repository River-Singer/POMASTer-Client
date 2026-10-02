/**
 * Workbench shell v3 (IA Reset, PR-IA-1): formal navigation is exactly six —
 * Overview / Work / Knowledge / System Map / Components / Verification.
 * The previous 11-tab CLI dashboard is preserved behind a Developer Mode
 * toggle (LegacyWorkbenchApp) — debug value kept, product IA clean (PRD §3/§14).
 */
import React, { useState } from 'react'
import { WORKBENCH_CSS } from './styles.ts'
import { Badge } from './ui.tsx'
import type { Translate } from './i18n.ts'
import { OverviewPage2 } from './pages/overview.tsx'
import { WorkPage2 } from './pages/work.tsx'
import { KnowledgePage2 } from './pages/knowledge.tsx'
import { SystemMapPage } from './pages/sysmap.tsx'
import { ComponentsPage2 } from './pages/components2.tsx'
import { VerificationPage2 } from './pages/verify2.tsx'
import { LegacyWorkbenchApp } from './legacy.tsx'

const FORMAL: Array<{ id: string; labelKey: string }> = [
  { id: 'overview', labelKey: 'tab.overview' },
  { id: 'work', labelKey: 'tab.work' },
  { id: 'knowledge', labelKey: 'tab.knowledge' },
  { id: 'map', labelKey: 'tab.map' },
  { id: 'components', labelKey: 'tab.components' },
  { id: 'verification', labelKey: 'tab.verification' },
]

export function WorkbenchApp(props: { t: Translate }): React.ReactElement {
  const { t } = props
  const [active, setActive] = useState('overview')
  const [devMode, setDevMode] = useState(false)

  if (devMode) {
    return (
      <div className="pmwb">
        <style>{WORKBENCH_CSS}</style>
        <div className="pmwb-actions">
          <Badge tone="warn">DEVELOPER MODE</Badge>
          <button className="pmwb-btn" onClick={() => setDevMode(false)}>{t('dm.exit')}</button>
        </div>
        <LegacyWorkbenchApp t={t} />
      </div>
    )
  }

  const page = (): React.ReactElement => {
    switch (active) {
      case 'work': return <WorkPage2 t={t} />
      case 'knowledge': return <KnowledgePage2 t={t} routingManifestRefs={[]} />
      case 'map': return <SystemMapPage t={t} />
      case 'components': return <ComponentsPage2 t={t} />
      case 'verification': return <VerificationPage2 t={t} />
      case 'overview':
      default: return <OverviewPage2 t={t} onOpenWork={() => setActive('work')} onGoto={(tab) => setActive(tab)} />
    }
  }

  return (
    <div className="pmwb">
      <style>{WORKBENCH_CSS}</style>
      <div className="pmwb-tabs" role="tablist">
        {FORMAL.map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === active} data-active={x.id === active} className="pmwb-tab" onClick={() => setActive(x.id)}>
            {t(x.labelKey)}
          </button>
        ))}
      </div>
      {page()}
      <div className="pmwb-actions" style={{ marginTop: 28, justifyContent: 'space-between' }}>
        <span className="pmwb-muted">{t('footer.note')}</span>
        <button className="pmwb-btn" style={{ fontSize: 11, opacity: 0.55 }} onClick={() => setDevMode(true)}>{t('dm.enter')}</button>
      </div>
    </div>
  )
}

// Badge imported at top — kept for the dev-mode banner

