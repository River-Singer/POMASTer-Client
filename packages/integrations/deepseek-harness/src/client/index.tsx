/**
 * POMaster Workbench web client (M2-M7): sidebar entry + keyed main surface
 * hosting the multi-page WorkbenchApp. Mirrors ui-plugin-manager's registration
 * shape (see COMPATIBILITY-MATRIX.md). Data flows through the host's
 * authenticated Connection Fetch routes — the UI never touches .pomaster.
 */
import React from 'react'
import { WorkbenchApp } from './app.tsx'
import { PanelIcon } from './panel.tsx'
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
        WorkbenchApp,
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
