/**
 * POMaster Workbench web client (M2-M7): sidebar entry + keyed main surface
 * hosting the multi-page WorkbenchApp. Copy lives in the DSH locale runtime
 * (zh/en dictionaries) so the whole panel follows the harness language switch
 * (Settings → General); the inject face hands the live translator to the
 * component tree — slot-rendered copy updates without a reload.
 * Data flows through the host's authenticated Connection Fetch routes — the
 * UI never touches .pomaster.
 */
import React from 'react'
import { WorkbenchApp } from './app.tsx'
import { PanelIcon } from './panel.tsx'
import { EN, ZH } from './i18n.ts'
import { SLOT_MAIN, SLOT_SIDEBAR_PANELLIST, brandPanelId, type DshClientContext, type MainPanelId } from '../compatibility/dsh-api-surface.ts'

export const NS = 'pomasterWorkbench'

/** The id shared by the sidebar entry and the main panel it opens. */
export const PANEL_ID: MainPanelId = brandPanelId('pomaster')

/** Services required by the registrations below. */
export const inject = ['slots', 'locale']

export function apply(ctx: DshClientContext): void {
  try {
    ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'pomaster: dictionaries')

    // Live translator: bind(ns) resolves through the ACTIVE locale at call
    // time; the slot framework re-renders locale-bound faces on revision
    // bumps, so a language switch applies without reload.
    const t = (key: string, vars?: Record<string, string | number>): string => {
      let text = ctx.locale.bind(NS)(key)
      if (vars !== undefined) {
        for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v))
      }
      return text
    }

    ctx.slots.inject(SLOT_MAIN, () =>
      ctx.slots.register(
        {
          name: SLOT_MAIN,
          key: PANEL_ID,
          locale: NS,
          inject: () => ({ t }),
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
