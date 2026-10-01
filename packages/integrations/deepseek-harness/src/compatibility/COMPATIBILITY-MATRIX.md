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

1. **§33 `*.changed` observables** — DSH `ctx.remote.$on` is a CLOSED forwarded-event allowlist (`packages/api/remotes/src/remote-events.ts`); external bundles cannot add `pomaster/*` events without forking. Restated per PRD §51: M1 chooses `@Remote({mode:'stream'})` follow vs `generation_seq` polling (DECISION.DSH08). Note DSH git-diff workspace-changes is blind to `.pomaster` (gitignored).
2. **§36 batch-1 tools** — trimmed to read-only sub-forms (DECISION.DSH07): only `pomaster_project_overview` in PR-1; no plan/finalize/command.invoke (Phase-1 read-only DoD §64.16). `context compile` writes by default; only `--check` is zero-write — not exposed at all in PR-1.
3. **§38 agent bootstrap injection** — session text embeds model-directed instruction blocks (POMaster `session.ts`), so bootstrap rides the TOOL result, not prompt injection. System-prompt extension point research deferred to M6 (DECISION.DSH09).
4. **Node launcher quirk** — published `bin.js` gates on `import.meta.main` (Bun API; undefined under Node). Spike drives the exported `runCli()` from a wrapper script. Re-check on every DSH upgrade.

## Spike workspace config (static, M6 supersedes)

`cordis.patch.yml` pins `workspaceRoot: 'D:/Vscode Documents/pomaster client'` — session-cwd workspace detection (PRD §32) is unimplemented by design in PR-1; the host API for session workspace resolution is an open research item (FACT.DSH.SESSION_WORKSPACE_API).

## Typert status (should-tier)

`project.overview()` typed remote + panel data channel blocked on out-of-tree Typert codegen (generator documented for in-repo builds only; client refuses source-mode descriptors). Tiered DoD (DECISION.DSH03): must = tool leg (shipped); should = remote+panel (pending research); stretch = live refresh (M1).
