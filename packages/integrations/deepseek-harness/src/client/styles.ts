/** Workbench styles — scoped under .pmwb, injected once at mount.
 * Every visual value consumes the POMaster design-token presets
 * (baseline/frontend/design-tokens.yaml via `preset preview --family
 * design-tokens`, applied as --tk-* custom properties by the app root),
 * with the seeded official theme as fallback. */

export const WORKBENCH_CSS = `
.pmwb {
  width: 100%;
  box-sizing: border-box;
  font-family: var(--tk-typography-family-sans, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif);
  font-size: var(--tk-typography-size-body, 14px);
  line-height: var(--tk-typography-line-height-normal, 1.57);
  color: var(--tk-color-text-primary, rgba(0, 0, 0, 0.88));
  max-width: 1080px;
  margin: 0 auto;
  padding: var(--tk-spacing-lg, 16px) var(--tk-spacing-lg, 16px) 64px;
}
.pmwb-tabs { display: flex; flex-wrap: wrap; gap: var(--tk-spacing-xs, 4px); border-bottom: 1px solid var(--tk-color-border-subtle, #f0f0f0); margin-bottom: var(--tk-spacing-md, 12px); }
.pmwb-tab { appearance: none; background: none; border: none; border-bottom: 2px solid transparent; padding: var(--tk-spacing-sm, 8px) var(--tk-spacing-md, 12px); font: inherit; font-size: 13px; cursor: pointer; opacity: .72; color: inherit; transition: color var(--tk-motion-fast, .1s); }
.pmwb-tab[data-active="true"] { border-bottom-color: var(--tk-color-brand-primary, #1677ff); opacity: 1; font-weight: var(--tk-typography-weight-semibold, 600); color: var(--tk-color-brand-primary, #1677ff); }
.pmwb-tab:hover { opacity: 1; }
.pmwb-card { border: 1px solid var(--tk-color-border-default, #d9d9d9); border-radius: var(--tk-radius-lg, 8px); padding: var(--tk-spacing-md, 12px) var(--tk-spacing-md, 12px) var(--tk-spacing-sm, 8px); margin: var(--tk-spacing-sm, 8px) 0; background: var(--tk-color-surface-container, #ffffff); box-shadow: var(--tk-elevation-card, none); }
.pmwb-card h3 { margin: 0 0 var(--tk-spacing-sm, 8px); font-size: var(--tk-typography-size-body, 14px); font-weight: var(--tk-typography-weight-semibold, 600); }
.pmwb-kv { display: grid; grid-template-columns: 170px 1fr; gap: 4px var(--tk-spacing-md, 12px); font-size: 13px; margin: 0; }
.pmwb-kv dt { color: var(--tk-color-text-secondary, rgba(0, 0, 0, 0.65)); }
.pmwb-kv dd { margin: 0; }
.pmwb-badge { display: inline-block; font-size: 12px; line-height: 20px; padding: 0 8px; border-radius: var(--tk-radius-sm, 4px); margin-right: var(--tk-spacing-xs, 4px); }
.pmwb-badge[data-tone="ok"] { color: var(--tk-color-semantic-success, #52c41a); background: color-mix(in srgb, var(--tk-color-semantic-success, #52c41a) 12%, transparent); }
.pmwb-badge[data-tone="warn"] { color: var(--tk-color-semantic-warning, #faad14); background: color-mix(in srgb, var(--tk-color-semantic-warning, #faad14) 14%, transparent); }
.pmwb-badge[data-tone="bad"] { color: var(--tk-color-semantic-error, #ff4d4f); background: color-mix(in srgb, var(--tk-color-semantic-error, #ff4d4f) 10%, transparent); }
.pmwb-badge[data-tone="neutral"] { color: var(--tk-color-text-secondary, rgba(0, 0, 0, 0.65)); background: var(--tk-color-surface-page, #f5f5f5); }
.pmwb-mono { font-family: var(--tk-typography-family-mono, Consolas, monospace); font-size: 12.5px; }
.pmwb-list { margin: var(--tk-spacing-xs, 4px) 0; padding-left: 18px; font-size: 13px; }
.pmwb-list li { margin: 3px 0; }
.pmwb-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.pmwb-table th, .pmwb-table td { text-align: left; padding: 5px var(--tk-spacing-sm, 8px); border-bottom: 1px solid var(--tk-color-border-subtle, #f0f0f0); vertical-align: top; }
.pmwb-table th { color: var(--tk-color-text-secondary, rgba(0, 0, 0, 0.65)); font-weight: var(--tk-typography-weight-semibold, 600); }
.pmwb-actions { display: flex; align-items: center; gap: var(--tk-spacing-sm, 8px); margin: var(--tk-spacing-sm, 8px) 0; }
.pmwb-btn { appearance: none; font: inherit; font-size: 13px; padding: 4px var(--tk-spacing-md, 12px); height: var(--tk-density-control_height, 32px); border-radius: var(--tk-radius-md, 6px); border: 1px solid var(--tk-color-border-default, #d9d9d9); background: var(--tk-color-surface-container, #ffffff); color: inherit; cursor: pointer; transition: all var(--tk-motion-fast, .1s); }
.pmwb-btn:hover { border-color: var(--tk-color-brand-primary, #1677ff); color: var(--tk-color-brand-primary, #1677ff); }
.pmwb-btn[disabled] { opacity: .45; cursor: default; }
.pmwb-input { font: inherit; font-size: 13px; padding: 4px var(--tk-spacing-sm, 8px); height: var(--tk-density-control_height, 32px); border-radius: var(--tk-radius-md, 6px); border: 1px solid var(--tk-color-border-default, #d9d9d9); background: var(--tk-color-surface-container, #ffffff); color: inherit; min-width: 220px; }
.pmwb-input:focus { outline: none; border-color: var(--tk-color-brand-primary, #1677ff); }
.pmwb-muted { color: var(--tk-color-text-tertiary, rgba(0, 0, 0, 0.45)); font-size: 12px; }
.pmwb-err { border-left: 3px solid var(--tk-color-semantic-error, #ff4d4f); padding: 6px var(--tk-spacing-sm, 8px); margin: var(--tk-spacing-xs, 4px) 0; font-size: 12.5px; background: color-mix(in srgb, var(--tk-color-semantic-error, #ff4d4f) 6%, transparent); border-radius: 0 var(--tk-radius-sm, 4px) var(--tk-radius-sm, 4px) 0; }
.pmwb-sec-title { font-size: var(--tk-typography-size-body_large, 16px); font-weight: var(--tk-typography-weight-semibold, 600); margin: var(--tk-spacing-lg, 16px) 0 var(--tk-spacing-xs, 4px); }
.pmwb-pre { background: var(--tk-color-surface-page, #f5f5f5); padding: var(--tk-spacing-sm, 8px) var(--tk-spacing-md, 12px); border-radius: var(--tk-radius-md, 6px); overflow: auto; max-height: 420px; font-size: 12px; font-family: var(--tk-typography-family-mono, Consolas, monospace); }
.pmwb-empty { color: var(--tk-color-text-disabled, rgba(0, 0, 0, 0.25)); font-size: 13px; padding: 14px 0; }
.pmwb-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--tk-spacing-md, 12px); }
@media (max-width: 900px) { .pmwb-grid2 { grid-template-columns: 1fr; } }
.pmwb-node { display: inline-block; border: 1px solid var(--tk-color-border-default, #d9d9d9); border-radius: var(--tk-radius-md, 6px); padding: 2px var(--tk-spacing-sm, 8px); margin: 3px var(--tk-spacing-xs, 4px) 3px 0; font-size: 12px; background: var(--tk-color-surface-container, #ffffff); }
.pmwb-node[data-root="true"] { border: 2px solid var(--tk-color-brand-primary, #1677ff); font-weight: var(--tk-typography-weight-semibold, 600); color: var(--tk-color-brand-primary, #1677ff); }
`
