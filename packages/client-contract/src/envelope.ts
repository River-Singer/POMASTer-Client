/**
 * POMaster CLI JSON envelope contract (§45).
 * Verified shape from POMaster_VNext/packages/cli/src/envelope.ts (toEnvelope):
 *   { command, ok, result, warnings: CliWarning[], errors: CliError[] }
 * NOT {ok,data,error}. Warnings are first-class signals; errors carry a hint
 * field meant for agents. Hook-contract commands (session/alerts) always exit 0 —
 * exit codes carry no signal, the payload does.
 */

export interface CliError {
  code: string
  message: string
  hint?: string
}

export interface CliWarning {
  code: string
  message: string
  hint?: string
}

export interface PomasterEnvelope<T = unknown> {
  command: string
  ok: boolean
  result: T
  warnings: CliWarning[]
  errors: CliError[]
}

/** Structural guard for untrusted CLI stdout before projection code touches it. */
export function isPomasterEnvelope(value: unknown): value is PomasterEnvelope<unknown> {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v['command'] === 'string' &&
    typeof v['ok'] === 'boolean' &&
    'result' in v &&
    Array.isArray(v['warnings']) &&
    Array.isArray(v['errors'])
  )
}
