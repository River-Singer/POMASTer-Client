# DSH Compatibility Matrix (PRD §50)

## Pinned versions

| Side | Artifact | Version | Provenance |
|---|---|---|---|
| DeepSeek Harness | `@deepseek-ai/dsh` (npm, apps/cli launcher) | **0.2.0-rc.2** | npm registry; matches the local source snapshot `deepseek-harness-master/deepseek-harness-master` (zip extract, no `.git` — commit unrecordable, version string is the pin) |
| POMaster CLI | `pomaster` | **0.10.0** (tag v0.10.0, 2026-10-01) | global npm install; release cadence ~3/week, NO CHANGELOG — re-verify command surface on every upgrade |
| Node | ≥22.19 required by DSH engines; spike machine runs 22.13.1 | deviation | launcher boots via the `runCli` export driver (see notes); revisit on engine errors |
| pnpm | DSH 11.7.0 / POMaster 9.15.9 | both present | profile plugin installs forward to pnpm |

## Supported host APIs used by this bundle (0.2.0-rc.2)

| API | Where pinned | Notes |
|---|---|---|
| `dsh.bundle.patch` + `cordis.patch.yml` `- insert:` rows | package.json + cordis.patch.yml | patch-relative paths; rows replace whole config per id |
| host plugin: class default export extends cordis `Service`, `static Config` (schemastery), `super(ctx, 'pomasterHost')` | src/host/index.ts | consumers inject `ctx.pomasterHost` |
| `ctx.tools.register(defineTool(...))` | src/tools/index.ts | `defineTool` from `@deepseek-ai/dsh-tools` (peer) |
| `dsh.client` manifest + `exports["./client"]` | package.json | browser kernel serves `/plugins/<id>/client.js`, boots loudly on failure |
| `ctx.slots.inject('main', …)` keyed by branded `MainPanelId` ('pomaster') | src/client | mirrors ui-plugin-manager PANEL_ID pattern |
| `ctx.slots.inject('sidebar.panellist', …)` list entry (id/order/label/icon) | src/client | |
| `ctx.locale.register/bind` | src/client | NS `pomasterWorkbench` |

## Supported client APIs

`ctx.slots`, `ctx.locale`, `ctx.effect` — see src/compatibility/dsh-api-surface.ts (the single file to edit on a DSH breaking change; the bundle imports zero `@deepseek-ai/*` packages).

## Recorded deviations from the PRD

1. **§33 `*.changed` observables + §34 data channel** — DSH `ctx.remote.$on` is a CLOSED forwarded-event allowlist (`packages/api/remotes/src/remote-events.ts`); external bundles cannot add `pomaster/*` events without forking. **M1 resolution (implemented)**: the data channel is authenticated Connection Fetch routes — `ctx.connection.fetch.register` (the public surface session-controller uses for `/api/file`), GET projections + POST typed-command allowlist; refresh = 10s polling on generation_seq (DECISION.DSH08). Typert typed remote remains the PRD-canonical evolution path (generator `@deepseek-ai/dsh-typert-generator@0.0.1-rc.1` exists on npm; package-mode via tsdown plugin — future research).
2. **§36 batch tools** — implemented M6 batch (9 tools): overview / attention / next_action / context (zero-write `--check` only) / knowledge_search / topology_query / component_search / plan (closeout judge — never run) / finalize (status only). Authority note (§58): tools surface kernel adjudication; plan/finalize cannot bypass gates or the human ACCEPT receipt.
3. **§38 agent bootstrap injection** — session text embeds model-directed instruction blocks (POMaster `session.ts`), so bootstrap rides TOOL results (neutral `status/alerts --json` data), not prompt injection. System-prompt extension point research deferred (DECISION.DSH09).
4. **Node launcher quirk** — published `bin.js` gates on `import.meta.main` (Bun API; undefined under Node). Drive the exported `runCli()` from a wrapper. Re-check on every DSH upgrade.
5. **Dual-half self-contained bundle layout** — root `.` export is a no-op placeholder (the `ui-*` client row imports it host-side); the controller lives at `./host` with its own patch row + config; class plugins declare `static inject` (module-level `inject` export is not read for class rows).
6. **Windows/environment** — node-pty native build fails (no MSVC; PowerShell 5 lacks `||`) → `--ignore-scripts` install; `session-persistence-jsonl` then fails to import (7-entry session cascade) — environment constraint, unrelated to the bundle. Node 22.13 < DSH engines ^22.19 (works via the runCli driver).

## Spike workspace config (static, M6 supersedes)

`cordis.patch.yml` pins `workspaceRoot: 'D:/Vscode Documents/pomaster client'` — session-cwd workspace detection (PRD §32) is unimplemented by design in PR-1; the host API for session workspace resolution is an open research item (FACT.DSH.SESSION_WORKSPACE_API).

## Typert status (should-tier)

`project.overview()` typed remote + panel data channel blocked on out-of-tree Typert codegen (generator documented for in-repo builds only; client refuses source-mode descriptors). Tiered DoD (DECISION.DSH03): must = tool leg (shipped); should = remote+panel (pending research); stretch = live refresh (M1).
