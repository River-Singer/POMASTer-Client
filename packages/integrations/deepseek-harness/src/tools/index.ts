/**
 * Agent tool plugin (PRD §36/§37): exactly ONE high-level tool in PR-1 —
 * pomaster_project_overview — returning {summary, machine state, next action,
 * references}, never the whole .pomaster. Phase-1 read-only discipline
 * (DECISION.DSH07): no plan/finalize/command tools in this batch.
 *
 * Self-contained by design: a plain cordis plugin (name/inject/apply), raw
 * tool-definition registration (accepted directly by ctx.tools.register), and
 * the projection logic inlined from @pomaster/workbench-model at build time.
 * Config arrives from the patch row (workspaceRoot, pomasterScriptPath).
 */
import { basename } from 'node:path'
import { buildProjectOverview, runPomasterJson } from '@pomaster/workbench-model'
import type { ProjectOverview } from '@pomaster/client-contract'
import type { RawAlertsResult, RawStatusResult } from '@pomaster/workbench-model'

export const name = 'pomaster-tools'
export const inject = ['tools']

interface ToolsConfig {
  /** Project root whose .pomaster is projected (spike: static config; M6 replaces with session-cwd detection). */
  workspaceRoot?: string
  /** Absolute path to pomaster's dist/bin.js — bypasses cmd.exe shim quoting entirely. */
  pomasterScriptPath?: string
}

async function buildOverview(config: ToolsConfig): Promise<ProjectOverview> {
  const workspaceRoot = config.workspaceRoot ?? process.cwd()
  const cliOpts = {
    cwd: workspaceRoot,
    scriptPath: config.pomasterScriptPath || undefined,
  }
  const [status, alerts] = await Promise.all([
    runPomasterJson<RawStatusResult>(['status'], cliOpts),
    runPomasterJson<RawAlertsResult>(['alerts'], cliOpts),
  ])
  return buildProjectOverview({ status, alerts, projectName: basename(workspaceRoot) })
}

export function apply(ctx: {
  tools: { register(definition: unknown): () => void }
}, config: ToolsConfig = {}): void {
  ctx.tools.register({
    name: 'pomaster_project_overview',
    description:
      'Read-only POMaster governance overview for the current project: baseline state, active task, attention (alerts) summary, permit refs, object counts, and the kernel-computed next action. ' +
      'Returns {summary, state, next_action, references} per PRD §37 — never the raw .pomaster tree.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
      },
      render: (_args: unknown, value: { summary?: string } | undefined) => [
        { type: 'text', text: String(value?.summary ?? JSON.stringify(value)) },
      ],
    },
    execute: async () => {
      const overview = await buildOverview(config)
      const nextCommand = overview.nextAction?.command ?? 'none'
      return {
        summary:
          `POMaster ${overview.project.name}: baseline ${overview.baseline.state}; ` +
          `active task ${overview.activeTask.count ? 'present' : 'none'}; ` +
          `attention ${overview.attention.total}; next action: ${nextCommand}`,
        state: overview,
        next_action: overview.nextAction,
        references: overview.sources.commands,
      }
    },
  })
}
