/**
 * POMaster host plugin (DSH half): a cordis Service exposing the read-only
 * overview projection to agent tools. Follows the voice-input/ui-plugin-manager
 * recipe: class default export, static Config validated against the patch row's
 * config, `super(ctx, '<serviceKey>')` so consumers inject `ctx.pomasterHost`.
 * The service NEVER mutates .pomaster — every invocation is a read-only CLI
 * subprocess (DECISION.DSH06/DSH07).
 */
import { Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { buildProjectOverview, runPomasterJson } from '@pomaster/workbench-model'
import type { ProjectOverview } from '@pomaster/client-contract'

export interface PomasterHostConfig {
  /** Project root whose .pomaster is projected (spike: static config; M6 replaces with session-cwd detection). */
  workspaceRoot: string
  /** Absolute path to pomaster's dist/bin.js — bypasses cmd.exe shim quoting entirely. */
  pomasterScriptPath?: string
}

export class PomasterHostService extends Service {
  static Config = z.object({
    workspaceRoot: z.string().required(),
    pomasterScriptPath: z.string(),
  })

  declare config: PomasterHostConfig

  constructor(ctx: unknown, config: PomasterHostConfig) {
    super(ctx, 'pomasterHost')
    this.config = config
  }

  /**
   * Same-source overview projection (PRD §61): `pomaster status --json` +
   * `pomaster alerts --json` fused by workbench-model. Read-only whitelist
   * enforced by construction — only these two commands are ever spawned.
   */
  async overview(): Promise<ProjectOverview> {
    const cliOpts = {
      cwd: this.config.workspaceRoot,
      scriptPath: this.config.pomasterScriptPath || undefined,
    }
    const [status, alerts] = await Promise.all([
      runPomasterJson(['status'], cliOpts),
      runPomasterJson(['alerts'], cliOpts),
    ])
    return buildProjectOverview({ status, alerts })
  }
}

export const name = 'pomaster-host'
export default PomasterHostService
