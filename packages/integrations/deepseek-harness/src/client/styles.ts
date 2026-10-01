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

/* --- document-style headings (time + summary) --- */
.pmwb-doc-title { font-size: var(--tk-typography-size-title_medium, 20px); font-weight: var(--tk-typography-weight-semibold, 600); margin: 4px 0 2px; }
.pmwb-doc-sub { color: var(--tk-color-text-tertiary, rgba(0,0,0,.45)); font-size: 12.5px; margin-bottom: var(--tk-spacing-md, 12px); }
.pmwb-para { margin: 0 0 var(--tk-spacing-sm, 8px); max-width: 78em; }

/* --- progress / ratio pictograms --- */
.pmwb-progress { height: 10px; border-radius: 999px; background: var(--tk-color-border-subtle, #f0f0f0); overflow: hidden; }
.pmwb-progress > div { height: 100%; border-radius: 999px; background: var(--tk-color-brand-primary, #1677ff); transition: width var(--tk-motion-normal, .2s); }
.pmwb-progress[data-tone="warn"] > div { background: var(--tk-color-semantic-warning, #faad14); }
.pmwb-progress[data-tone="bad"] > div { background: var(--tk-color-semantic-error, #ff4d4f); }
.pmwb-progress-row { display: flex; align-items: center; gap: var(--tk-spacing-sm, 8px); }
.pmwb-progress-row .pmwb-progress { flex: 1; }
.pmwb-stacked { display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: var(--tk-color-border-subtle, #f0f0f0); }
.pmwb-stacked > span { display: block; height: 100%; }
.pmwb-legend { display: flex; flex-wrap: wrap; gap: var(--tk-spacing-sm, 8px) var(--tk-spacing-md, 12px); font-size: 12px; color: var(--tk-color-text-secondary, rgba(0,0,0,.65)); margin-top: 6px; }
.pmwb-legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
.pmwb-big-stat { font-size: 30px; font-weight: var(--tk-typography-weight-semibold, 600); line-height: 1.2; }
.pmwb-big-stat small { font-size: 13px; font-weight: 400; color: var(--tk-color-text-secondary, rgba(0,0,0,.65)); margin-left: 6px; }

/* --- checklist --- */
.pmwb-check { list-style: none; margin: 0; padding: 0; }
.pmwb-check li { display: flex; gap: var(--tk-spacing-sm, 8px); padding: var(--tk-spacing-xs, 4px) 0; align-items: flex-start; }
.pmwb-check .pmwb-check-mark { flex: none; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-top: 1px; }
.pmwb-check .pmwb-check-mark[data-ok="true"] { background: color-mix(in srgb, var(--tk-color-semantic-success, #52c41a) 15%, transparent); color: var(--tk-color-semantic-success, #52c41a); }
.pmwb-check .pmwb-check-mark[data-ok="false"] { background: color-mix(in srgb, var(--tk-color-semantic-warning, #faad14) 18%, transparent); color: var(--tk-color-semantic-warning, #faad14); }

/* --- gallery (Windows-explorer style) --- */
.pmwb-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--tk-spacing-sm, 8px); }
.pmwb-tile { border: 1px solid var(--tk-color-border-default, #d9d9d9); border-radius: var(--tk-radius-md, 6px); background: var(--tk-color-surface-container, #ffffff); cursor: pointer; text-align: center; padding: var(--tk-spacing-md, 12px) var(--tk-spacing-sm, 8px); transition: border-color var(--tk-motion-fast, .1s), box-shadow var(--tk-motion-fast, .1s); }
.pmwb-tile:hover { border-color: var(--tk-color-brand-primary, #1677ff); box-shadow: var(--tk-elevation-card, none); }
.pmwb-tile .pmwb-tile-icon { font-size: 30px; line-height: 1.3; }
.pmwb-tile .pmwb-tile-name { font-size: 12.5px; margin-top: 6px; color: var(--tk-color-text-primary, rgba(0,0,0,.88)); word-break: break-word; }
.pmwb-tile .pmwb-tile-count { font-size: 11px; color: var(--tk-color-text-tertiary, rgba(0,0,0,.45)); }
.pmwb-breadcrumb { font-size: 13px; color: var(--tk-color-text-secondary, rgba(0,0,0,.65)); margin-bottom: var(--tk-spacing-sm, 8px); }
.pmwb-breadcrumb b { color: var(--tk-color-text-primary, rgba(0,0,0,.88)); }
.pmwb-breadcrumb a { color: var(--tk-color-brand-primary, #1677ff); cursor: pointer; text-decoration: none; }
.pmwb-sample-frame { border: 1px dashed var(--tk-color-border-default, #d9d9d9); border-radius: var(--tk-radius-md, 6px); padding: var(--tk-spacing-md, 12px); display: flex; flex-direction: column; gap: var(--tk-spacing-sm, 8px); align-items: flex-start; background: var(--tk-color-surface-page, #f5f5f5); min-height: 92px; }
.pmwb-sample-name { font-size: 11.5px; color: var(--tk-color-text-tertiary, rgba(0,0,0,.45)); }
.pmwb-swatch { display: grid; grid-template-columns: repeat(auto-fill, minmax(128px, 1fr)); gap: var(--tk-spacing-sm, 8px); }
.pmwb-swatch > div { border: 1px solid var(--tk-color-border-subtle, #f0f0f0); border-radius: var(--tk-radius-md, 6px); overflow: hidden; font-size: 11px; }
.pmwb-swatch .sw-color { height: 44px; }
.pmwb-swatch .sw-name { padding: 4px 8px; color: var(--tk-color-text-secondary, rgba(0,0,0,.65)); word-break: break-all; }

/* --- collapsible sections (task detail) --- */
.pmwb-fold { border: 1px solid var(--tk-color-border-default, #d9d9d9); border-radius: var(--tk-radius-lg, 8px); background: var(--tk-color-surface-container, #ffffff); margin: var(--tk-spacing-sm, 8px) 0; }
.pmwb-fold > summary { cursor: pointer; padding: 10px var(--tk-spacing-md, 12px); font-weight: var(--tk-typography-weight-semibold, 600); font-size: 13.5px; list-style: none; display: flex; align-items: center; gap: 8px; }
.pmwb-fold > summary::before { content: '▸'; transition: transform var(--tk-motion-fast, .1s); color: var(--tk-color-text-tertiary, rgba(0,0,0,.45)); }
.pmwb-fold[open] > summary::before { transform: rotate(90deg); }
.pmwb-fold > .pmwb-fold-body { padding: 0 var(--tk-spacing-md, 12px) var(--tk-spacing-md, 12px); }

/* --- sample frames must never overflow their tile --- */
.pmwb-sample-frame { align-items: stretch; }
.pmwb-sample-frame .pmwb-input { min-width: 0; width: 100%; max-width: 200px; }
.pmwb-sample-frame .pmwb-table { min-width: 0; }

/* --- component args documentation --- */
.pmwb-args-title { font-size: 12px; color: var(--tk-color-text-tertiary, rgba(0,0,0,.45)); margin: 8px 0 4px; font-family: var(--tk-typography-family-mono, Consolas, monospace); }

/* --- icon tiles (SVG set) --- */
.pmwb-icon-row { display: flex; gap: var(--tk-spacing-sm, 8px); flex-wrap: wrap; }
.pmwb-icon-row svg { width: 26px; height: 26px; display: block; color: var(--tk-color-brand-primary, #1677ff); }
`
