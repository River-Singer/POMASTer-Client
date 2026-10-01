/**
 * Compatibility layer (PRD §51/§52): the ONLY place that names DSH client API
 * surface shapes. All @deepseek-ai/* knowledge lives here as minimal local
 * types — the bundle imports zero @deepseek-ai packages (value or type), so
 * the client build passes the module-table purity gate by construction and a
 * DSH breaking change edits exactly one file.
 *
 * Pinned surface (DSH @deepseek-ai/dsh-root 0.2.0-rc.2):
 * - ctx.slots.inject(ownerSlot, () => ctx.slots.register(decl, Component))
 *   — cross-package contribution path; direct register into an undeclared
 *   slot throws at activation (fail-loud boot).
 * - 'main' is a keyed slot owned by ui-layout (MainPanelId branded string).
 * - 'sidebar.panellist' is a list slot owned by ui-sidebar (id/order/label).
 * - ctx.locale.register(NS, {zh, en}) + ctx.locale.bind(NS).
 */

export type MainPanelId = string & { readonly __brand: 'MainPanelId' }

export interface SlotDecl {
  name: string
  /** list-slot entry id (sidebar.panellist). */
  id?: string
  /** keyed-slot key (main). */
  key?: MainPanelId
  order?: number
  label?: () => string
  locale?: string
  inject?: () => unknown
  store?: unknown
  children?: Record<string, { kind: string; scope?: string }>
}

export interface LocaleSnapshot {
  active: string
  locales: Array<{ id: string; label?: string }>
  revision: number
}

export interface DshClientContext {
  slots: {
    inject(ownerSlot: string, registration: () => unknown): void
    register(decl: SlotDecl, component: unknown): unknown
  }
  locale: {
    register(namespace: string, dictionaries: Record<string, Record<string, string>>): () => void
    bind(namespace: string): (key: string) => string
    /** LocaleFace reactivity (0.2.0-rc.2): snapshot + subscribe; optional on older builds. */
    getSnapshot?(): LocaleSnapshot
    subscribe?(fn: () => void): () => void
  }
  effect(dispose: () => () => void, name?: string): void
}

export const SLOT_MAIN = 'main'
export const SLOT_SIDEBAR_PANELLIST = 'sidebar.panellist'

export function brandPanelId(id: string): MainPanelId {
  return id as MainPanelId
}
