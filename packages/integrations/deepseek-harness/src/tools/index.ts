/**
 * Agent tool registration (PRD §36/§37): exactly ONE high-level tool in PR-1 —
 * pomaster_project_overview — returning {summary, machine state, next action,
 * references}, never the whole .pomaster. Phase-1 read-only discipline
 * (DECISION.DSH07): no plan/finalize/command tools in this batch.
 */
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'pomaster-tools'
export const inject = ['tools', 'pomasterHost']

export function apply(ctx: {
  tools: { register(definition: unknown): () => void }
  pomasterHost: { overview(): Promise<import('@pomaster/client-contract').ProjectOverview> }
}): void {
  ctx.tools.register(
    defineTool({
      name: 'pomaster_project_overview',
      description:
        'Read-only POMaster governance overview for the current project: baseline state, active task, attention (alerts) summary, permit refs, object counts, and the kernel-computed next action. ' +
        'Returns {summary, state, next_action, references} per PRD §37 — never the raw .pomaster tree.',
      parameters: {},
      output: {
        schema: {
          type: 'object',
          additionalProperties: true,
        },
      },
      execute: async () => {
        const overview = await ctx.pomasterHost.overview()
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
    }),
  )
}
