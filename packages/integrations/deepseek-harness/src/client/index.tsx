/**
 * POMaster Workbench web panel (PR-1 must-tier): a global main-column page +
 * sidebar entry, mirroring ui-plugin-manager's registration shape.
 * PR-1 scope note (DECISION.DSH03 tiered DoD): this panel is the static shell —
 * the data channel in the should-tier is the Typert remote (project.overview),
 * which depends on out-of-tree Typert codegen (undocumented; see
 * COMPATIBILITY-MATRIX.md). Until it lands, the panel routes Humans to the
 * pomaster_project_overview agent tool, which serves the same projection from
 * the same workbench-model source — never a second truth.
 */
import React from 'react'
import { PanelIcon, WorkbenchPanel } from './panel.tsx'
import { SLOT_MAIN, SLOT_SIDEBAR_PANELLIST, brandPanelId, type DshClientContext, type MainPanelId } from '../compatibility/dsh-api-surface.ts'

export const NS = 'pomasterWorkbench'

/** The id shared by the sidebar entry and the main panel it opens. */
export const PANEL_ID: MainPanelId = brandPanelId('pomaster')

/** Services required by the registrations below. */
export const inject = ['slots', 'locale']

const zh = { panel: 'POMaster 工作台' }
const en = { panel: 'POMaster Workbench' }

export function apply(ctx: DshClientContext): void {
  try {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }))
    const t = ctx.locale.bind(NS)

    ctx.slots.inject(SLOT_MAIN, () =>
      ctx.slots.register(
        {
          name: SLOT_MAIN,
          key: PANEL_ID,
          locale: NS,
        },
        WorkbenchPanel,
      ),
    )

    ctx.slots.inject(SLOT_SIDEBAR_PANELLIST, () =>
      ctx.slots.register(
        {
          name: SLOT_SIDEBAR_PANELLIST,
          id: PANEL_ID,
          order: 42,
          label: () => t('panel'),
          locale: NS,
        },
        PanelIcon,
      ),
    )
  } catch (error) {
    const w = window as unknown as { __pomasterBootError?: string }
    w.__pomasterBootError = String((error as Error)?.stack ?? error)
    console.error('[pomaster] client apply failed:', error)
    throw error
  }
}
