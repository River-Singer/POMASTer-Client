/** Workbench styles — scoped under .pmwb, injected once at mount. */

export const WORKBENCH_CSS = `
.pmwb { font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; color: inherit; max-width: 1080px; margin: 0 auto; padding: 20px 24px 64px; }
.pmwb-tabs { display: flex; flex-wrap: wrap; gap: 4px; border-bottom: 1px solid var(--pmwb-line, rgba(128,128,144,.28)); margin-bottom: 16px; }
.pmwb-tab { appearance: none; background: none; border: none; border-bottom: 2px solid transparent; padding: 8px 12px; font: inherit; font-size: 13px; cursor: pointer; opacity: .72; color: inherit; }
.pmwb-tab[data-active="true"] { border-bottom-color: currentColor; opacity: 1; font-weight: 600; }
.pmwb-tab:hover { opacity: 1; }
.pmwb-card { border: 1px solid var(--pmwb-line, rgba(128,128,144,.28)); border-radius: 10px; padding: 14px 16px; margin: 10px 0; background: var(--pmwb-card, rgba(127,127,144,.05)); }
.pmwb-card h3 { margin: 0 0 8px; font-size: 14px; }
.pmwb-kv { display: grid; grid-template-columns: 160px 1fr; gap: 4px 12px; font-size: 13px; }
.pmwb-kv dt { opacity: .62; }
.pmwb-kv dd { margin: 0; }
.pmwb-badge { display: inline-block; font-size: 11px; padding: 1px 8px; border-radius: 999px; border: 1px solid currentColor; opacity: .8; margin-right: 6px; }
.pmwb-badge[data-tone="ok"] { color: #16a34a; border-color: #16a34a; opacity: 1; }
.pmwb-badge[data-tone="warn"] { color: #d97706; border-color: #d97706; opacity: 1; }
.pmwb-badge[data-tone="bad"] { color: #dc2626; border-color: #dc2626; opacity: 1; }
.pmwb-mono { font-family: ui-monospace, Consolas, monospace; font-size: 12.5px; }
.pmwb-list { margin: 4px 0; padding-left: 18px; font-size: 13px; }
.pmwb-list li { margin: 3px 0; }
.pmwb-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.pmwb-table th, .pmwb-table td { text-align: left; padding: 5px 8px; border-bottom: 1px solid var(--pmwb-line, rgba(128,128,144,.2)); vertical-align: top; }
.pmwb-table th { opacity: .62; font-weight: 600; }
.pmwb-actions { display: flex; align-items: center; gap: 10px; margin: 8px 0; }
.pmwb-btn { appearance: none; font: inherit; font-size: 13px; padding: 6px 14px; border-radius: 8px; border: 1px solid var(--pmwb-line, rgba(128,128,144,.35)); background: none; color: inherit; cursor: pointer; }
.pmwb-btn:hover { background: rgba(127,127,144,.12); }
.pmwb-btn[disabled] { opacity: .45; cursor: default; }
.pmwb-input { font: inherit; font-size: 13px; padding: 5px 9px; border-radius: 7px; border: 1px solid var(--pmwb-line, rgba(128,128,144,.35)); background: none; color: inherit; min-width: 220px; }
.pmwb-muted { opacity: .62; font-size: 12px; }
.pmwb-err { border-left: 3px solid #dc2626; padding: 6px 10px; margin: 6px 0; font-size: 12.5px; background: rgba(220,38,38,.06); }
.pmwb-sec-title { font-size: 15px; font-weight: 650; margin: 18px 0 6px; }
.pmwb-pre { background: var(--pmwb-card, rgba(127,127,144,.07)); padding: 10px 12px; border-radius: 8px; overflow: auto; max-height: 420px; font-size: 12px; }
.pmwb-empty { opacity: .55; font-size: 13px; padding: 14px 0; }
.pmwb-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 900px) { .pmwb-grid2 { grid-template-columns: 1fr; } }
.pmwb-node { display: inline-block; border: 1px solid var(--pmwb-line, rgba(128,128,144,.35)); border-radius: 7px; padding: 3px 9px; margin: 3px 4px 3px 0; font-size: 12px; }
.pmwb-node[data-root="true"] { border-width: 2px; font-weight: 650; }
`
