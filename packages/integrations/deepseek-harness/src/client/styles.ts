/** Workbench styles v4 — white-dominant, clean modern (Linear-ish product surface).
 * Token-mapped: POMaster design presets still drive color/radius/spacing;
 * accent blue appears only where meaning lives (active tab, links, progress). */

export const WORKBENCH_CSS = `
.pmwb {
  width: 100%;
  box-sizing: border-box;
  font-family: var(--tk-typography-family-sans, system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif);
  font-size: var(--tk-typography-size-body, 14px);
  line-height: var(--tk-typography-line-height-normal, 1.6);
  color: #111827;
  padding: 20px 24px 56px;
  height: calc(100vh - var(--tk-layout-header-height, 64px) - 20px);
  overflow-y: auto;
}
.pmwb-tabs { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 2px; border-bottom: 1px solid #e5e7eb; margin-bottom: 18px; background: #ffffff; }
.pmwb-tab { appearance: none; background: none; border: none; border-bottom: 2px solid transparent; padding: 9px 14px 7px; font: inherit; font-size: 13.5px; cursor: pointer; color: #6b7280; transition: color .12s ease; }
.pmwb-tab[data-active="true"] { border-bottom-color: var(--tk-color-brand-primary, #1677ff); color: #111827; font-weight: 600; }
.pmwb-tab:hover { color: #111827; }
.pmwb-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; margin: 10px 0; background: #ffffff; }
.pmwb-card h3 { margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #6b7280; text-transform: none; letter-spacing: .01em; }
.pmwb-kv { display: grid; grid-template-columns: 150px 1fr; gap: 5px 14px; font-size: 13px; margin: 0; }
.pmwb-kv dt { color: #6b7280; }
.pmwb-kv dd { margin: 0; color: #111827; }
.pmwb-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; line-height: 20px; padding: 0 8px; border-radius: 5px; }
.pmwb-badge::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.pmwb-badge[data-tone="ok"] { color: #15803d; background: #f0fdf4; }
.pmwb-badge[data-tone="warn"] { color: #b45309; background: #fffbeb; }
.pmwb-badge[data-tone="bad"] { color: #b91c1c; background: #fef2f2; }
.pmwb-badge[data-tone="neutral"] { color: #4b5563; background: #f3f4f6; }
.pmwb-mono { font-family: var(--tk-typography-family-mono, Consolas, monospace); font-size: 12px; }
.pmwb-list { margin: 4px 0; padding-left: 18px; font-size: 13px; }
.pmwb-list li { margin: 4px 0; }
.pmwb-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pmwb-table th { text-align: left; padding: 7px 10px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-weight: 600; font-size: 12px; }
.pmwb-table td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
.pmwb-table tr:hover td { background: #f9fafb; }
.pmwb-actions { display: flex; align-items: center; gap: 10px; margin: 8px 0; }
.pmwb-btn { appearance: none; font: inherit; font-size: 13px; padding: 5px 14px; height: 32px; border-radius: 7px; border: 1px solid #d1d5db; background: #ffffff; color: #111827; cursor: pointer; transition: all .12s ease; }
.pmwb-btn:hover { border-color: #6b7280; background: #f9fafb; }
.pmwb-btn:active { transform: translateY(1px); }
.pmwb-btn[disabled] { opacity: .45; cursor: default; }
.pmwb-input { font: inherit; font-size: 13px; padding: 5px 10px; height: 32px; border-radius: 7px; border: 1px solid #d1d5db; background: #ffffff; color: inherit; min-width: 200px; }
.pmwb-input:focus { outline: none; border-color: var(--tk-color-brand-primary, #1677ff); box-shadow: 0 0 0 3px rgba(22,119,255,.08); }
.pmwb-muted { color: #6b7280; font-size: 12px; }
.pmwb-faint { color: #6b7280; font-size: 12px; }
.pmwb-err { border-left: 3px solid #ef4444; padding: 6px 10px; margin: 6px 0; font-size: 12.5px; background: #fef2f2; border-radius: 0 6px 6px 0; color: #7f1d1d; }
.pmwb-sec-title { font-size: 15px; font-weight: 600; margin: 20px 0 8px; color: #111827; }
.pmwb-pre { background: #f9fafb; padding: 10px 12px; border-radius: 8px; overflow: auto; max-height: 420px; font-size: 12px; font-family: var(--tk-typography-family-mono, Consolas, monospace); border: 1px solid #f3f4f6; }
.pmwb-empty { color: #6b7280; font-size: 13px; padding: 16px 0; }
.pmwb-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 900px) { .pmwb-grid2 { grid-template-columns: 1fr; } }
.pmwb-node { display: inline-block; border: 1px solid #e5e7eb; border-radius: 7px; padding: 3px 10px; margin: 3px 5px 3px 0; font-size: 12px; background: #ffffff; }
.pmwb-node[data-root="true"] { border: 1.5px solid var(--tk-color-brand-primary, #1677ff); font-weight: 600; color: var(--tk-color-brand-primary, #1677ff); }

/* --- document pages --- */
.pmwb-doc-title { font-size: var(--tk-typography-size-title_medium, 20px); font-weight: 600; margin: 2px 0 2px; color: #111827; }
.pmwb-doc-sub { color: #6b7280; font-size: 12.5px; margin-bottom: 14px; }
.pmwb-para { margin: 0 0 8px; }

/* --- pictograms --- */
.pmwb-progress { height: 8px; border-radius: 999px; background: #f3f4f6; overflow: hidden; }
.pmwb-progress > div { height: 100%; border-radius: 999px; background: var(--tk-color-brand-primary, #1677ff); transition: width .2s ease; }
.pmwb-progress[data-tone="warn"] > div { background: #f59e0b; }
.pmwb-progress[data-tone="bad"] > div { background: #ef4444; }
.pmwb-progress-row { display: flex; align-items: center; gap: 10px; }
.pmwb-progress-row .pmwb-progress { flex: 1; }
.pmwb-stacked { display: flex; height: 10px; border-radius: 999px; overflow: hidden; background: #f3f4f6; }
.pmwb-stacked > span { display: block; height: 100%; }
.pmwb-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; color: #6b7280; margin-top: 8px; }
.pmwb-legend i { display: inline-block; width: 9px; height: 9px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }

/* --- checklist --- */
.pmwb-check { list-style: none; margin: 0; padding: 0; }
.pmwb-check li { display: flex; gap: 10px; padding: 6px 0; align-items: flex-start; }
.pmwb-check .pmwb-check-mark { flex: none; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; margin-top: 1px; }
.pmwb-check .pmwb-check-mark[data-ok="true"] { background: #f0fdf4; color: #15803d; }
.pmwb-check .pmwb-check-mark[data-ok="false"] { background: #fffbeb; color: #b45309; }

/* --- explorer gallery --- */
.pmwb-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 10px; }
.pmwb-tile { border: 1px solid #e5e7eb; border-radius: 9px; background: #ffffff; cursor: pointer; text-align: center; padding: 12px 10px; transition: border-color .12s ease, box-shadow .12s ease; }
.pmwb-tile:hover { border-color: #d1d5db; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.pmwb-tile .pmwb-tile-icon { color: #374151; }
.pmwb-tile .pmwb-tile-name { font-size: 12.5px; margin-top: 6px; color: #111827; word-break: break-word; }
.pmwb-tile .pmwb-tile-count { font-size: 11px; color: #6b7280; }
.pmwb-breadcrumb { font-size: 13px; color: #6b7280; margin-bottom: 10px; }
.pmwb-breadcrumb b { color: #111827; }
.pmwb-breadcrumb a { color: var(--tk-color-brand-primary, #1677ff); cursor: pointer; text-decoration: none; }
.pmwb-sample-frame { border: 1px solid #f3f4f6; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; background: #ffffff; min-height: 92px; }
.pmwb-sample-name { font-size: 11.5px; color: #6b7280; }
.pmwb-swatch { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; }
.pmwb-swatch > div { border: 1px solid #f3f4f6; border-radius: 8px; overflow: hidden; font-size: 11px; }
.pmwb-swatch .sw-color { height: 42px; }
.pmwb-swatch .sw-name { padding: 4px 8px; color: #6b7280; word-break: break-all; }

/* --- collapsible sections --- */
.pmwb-fold { border: 1px solid #e5e7eb; border-radius: 9px; background: #ffffff; margin: 8px 0; }
.pmwb-fold > summary { cursor: pointer; padding: 10px 14px; font-weight: 600; font-size: 13.5px; list-style: none; display: flex; align-items: center; gap: 8px; color: #374151; }
.pmwb-fold > summary::before { content: '▸'; transition: transform .12s ease; color: #6b7280; }
.pmwb-fold[open] > summary::before { transform: rotate(90deg); }
.pmwb-fold > .pmwb-fold-body { padding: 0 14px 12px; }

/* --- component args docs --- */
.pmwb-args-title { font-size: 12px; color: #6b7280; margin: 8px 0 4px; font-family: var(--tk-typography-family-mono, Consolas, monospace); }

/* --- story tree (storybook workbench) --- */
.pmwb-tree-panel { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px; }
.pmwb-tree-group { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #6b7280; margin: 10px 4px 3px; font-weight: 600; }
.pmwb-tree-item { display: flex; align-items: center; gap: 7px; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 12.5px; color: #374151; border-left: 2px solid transparent; }
.pmwb-tree-item:hover { background: #eceef1; }
.pmwb-tree-item[data-active="true"] { background: #ffffff; border-left-color: var(--tk-color-brand-primary, #1677ff); color: #111827; font-weight: 600; box-shadow: 0 1px 2px rgba(17,24,39,.05); }
.pmwb-tree-item .ti-icon { width: 14px; height: 14px; flex: none; color: #6b7280; }
.pmwb-tree-item .ti-sub { font-size: 11px; color: #9ca3af; margin-left: auto; }
.pmwb-toolbar { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-bottom: 1px solid #f3f4f6; }
.pmwb-skel { border-radius: 8px; background: linear-gradient(90deg, #f3f4f6 25%, #e9eaec 37%, #f3f4f6 63%); background-size: 400% 100%; animation: pmwb-skel 1.2s ease infinite; }
@keyframes pmwb-skel { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
.pmwb-cmp-head { display: flex; gap: 12px; align-items: stretch; margin-bottom: 14px; }
.pmwb-cmp-stat { flex: 1; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 16px; background: #ffffff; }
.pmwb-cmp-stat .n { font-size: 26px; font-weight: 650; color: #111827; line-height: 1.2; }
.pmwb-cmp-stat .l { font-size: 12px; color: #6b7280; }

/* --- icon row --- */
.pmwb-icon-row { display: flex; gap: 12px; flex-wrap: wrap; }
.pmwb-icon-row svg { width: 26px; height: 26px; display: block; color: #374151; }

/* --- diagram (grouped architecture) --- */
.pmwb-diag { position: relative; }
.pmwb-diag-grid { display: grid; gap: 12px; }
.pmwb-diag-group { border: 1px solid var(--g-tone, #1677ff); border-radius: 10px; background: #ffffff; padding: 10px; min-width: 0; }
.pmwb-diag-group-title { color: var(--g-tone, #1677ff); font-weight: 600; font-size: 12.5px; margin: 2px 2px 6px; }
.pmwb-diag-node { border: 1px solid #e5e7eb; background: #ffffff; border-radius: 7px; padding: 6px 10px; margin: 5px 0; }
.pmwb-diag-node .nn { font-size: 12.5px; font-weight: 600; color: #111827; }
.pmwb-diag-node .ns { font-size: 11px; color: #6b7280; margin-top: 1px; word-break: break-word; }
.pmwb-diag-edges { position: absolute; inset: 0; pointer-events: none; }
.pmwb-diag-edges .edge-label { font-size: 11px; fill: #6b7280; }
.pmwb-diag-edges .edge-line { fill: none; stroke: #9ca3af; stroke-width: 1.3; }
.pmwb-diag-edges .edge-arrow { fill: #9ca3af; }

/* --- domain portal cards (three-domain gateway) --- */
.pmwb-portal { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 18px; }
.pmwb-portal-card { border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff; padding: 16px 18px; cursor: pointer; transition: border-color .12s ease, box-shadow .12s ease; }
.pmwb-portal-card:hover { border-color: var(--tk-color-brand-primary, #1677ff); box-shadow: 0 2px 8px rgba(17,24,39,.06); }
.pmwb-portal-card .pc-icon { color: #374151; margin-bottom: 10px; }
.pmwb-portal-card .pc-title { font-size: 14.5px; font-weight: 600; color: #111827; }
.pmwb-portal-card .pc-path { font-size: 11.5px; color: #6b7280; font-family: var(--tk-typography-family-mono, Consolas, monospace); margin: 2px 0 10px; }
.pmwb-portal-card .pc-stat { font-size: 12.5px; color: #374151; margin: 3px 0; }
.pmwb-portal-card .pc-stat b { color: #111827; }

/* --- sample frames must never overflow their tile --- */
.pmwb, .pmwb * { box-sizing: border-box; }
.pmwb-sample-frame { align-items: stretch; width: 100%; overflow: hidden; }
.pmwb-sample-frame .pmwb-input { min-width: 0; width: 100%; max-width: 240px; }
.pmwb-sample-frame .pmwb-table { min-width: 0; width: 100%; }
.pmwb-gallery .pmwb-tile { overflow: hidden; }
`