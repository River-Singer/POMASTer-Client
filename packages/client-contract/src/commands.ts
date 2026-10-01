/**
 * Phase-1 read-only command whitelist (DECISION.DSH07): PRD §39/§64.16 declare
 * Phase 1 fully read-only, so the spike exposes only read-only sub-forms.
 * `pomaster context compile` WRITES .pomaster/state/contexts/ by default —
 * only `--check` is zero-write (verified: POMaster_VNext/packages/cli/src/context.ts).
 * plan is compile-only (never run); finalize/command.invoke are NOT exposed in Phase 1.
 */

export interface ReadOnlyCommandSpec {
  /** CLI sub-command head, e.g. `status`. */
  command: string
  /** Forced arguments appended to every invocation of this command. */
  fixedArgs: string[]
  why: string
}

export const READ_ONLY_COMMANDS: readonly ReadOnlyCommandSpec[] = [
  { command: 'status', fixedArgs: ['--json'], why: 'governance status projection' },
  { command: 'alerts', fixedArgs: ['--json'], why: 'actionable alerts (payload is the signal; always exit 0)' },
  { command: 'tools', fixedArgs: ['list', '--json'], why: 'ToolBinding registry projection' },
] as const

/** Guard: is this CLI invocation inside the Phase-1 read-only whitelist? */
export function isReadOnlyInvocation(args: readonly string[]): boolean {
  const head = args[0]
  if (head === undefined) return false
  const spec = READ_ONLY_COMMANDS.find((s) => s.command === head)
  if (spec === undefined) return false
  return spec.fixedArgs.every((fixed) => args.includes(fixed))
}
