/**
 * POMaster CLI subprocess runner (DECISION.DSH06): the published pomaster@0.10.x
 * artifact exposes only a bin bundle (no exports/main/types), so subprocess
 * `pomaster … --json` is the only sanctioned integration channel.
 *
 * Windows notes (compatibility matrix): the global install ships `pomaster.cmd`
 * shims — spawning those requires shell semantics, and cmd.exe joins arguments
 * with spaces, so any argument containing whitespace is double-quoted here
 * (project paths like `D:\Vscode Documents\pomaster client` must survive).
 * `scriptPath` mode (node + dist/bin.js) avoids cmd.exe entirely and is the
 * preferred spike configuration. stdout is always decoded as UTF-8 so Chinese
 * payload text survives console code-page differences.
 */
import { spawn } from 'node:child_process'
import { isPomasterEnvelope, type PomasterEnvelope } from '@pomaster/client-contract'

export interface PomasterCliOptions {
  /** Project root handed to the CLI via explicit per-invocation cwd. */
  cwd: string
  /** Absolute path to pomaster's dist/bin.js — runs node directly, no cmd.exe. */
  scriptPath?: string
  /** CLI binary name when scriptPath is absent (default `pomaster`). */
  binName?: string
  /** Kill the child after this many ms (default 15_000). */
  timeoutMs?: number
}

export interface SpawnSpec {
  file: string
  args: string[]
  shell: boolean
}

const DEFAULT_TIMEOUT_MS = 15_000

/** Double-quote an argument that cmd.exe would otherwise split on whitespace. */
export function quoteForShell(arg: string): string {
  return /\s/.test(arg) ? `"${arg.replaceAll('"', '\\"')}"` : arg
}

export function buildSpawnSpec(args: readonly string[], opts: PomasterCliOptions): SpawnSpec {
  if (opts.scriptPath !== undefined) {
    return { file: process.execPath, args: [opts.scriptPath, ...args], shell: false }
  }
  const shell = process.platform === 'win32'
  return {
    file: opts.binName ?? 'pomaster',
    args: shell ? args.map(quoteForShell) : [...args],
    shell,
  }
}

/** Enforce the §45 machine-readable channel on every invocation. */
export function ensureJsonArg(args: readonly string[]): string[] {
  return args.includes('--json') ? [...args] : [...args, '--json']
}

export function parseEnvelope(raw: string): PomasterEnvelope<unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    return {
      command: '(unknown)',
      ok: false,
      result: null,
      warnings: [],
      errors: [
        {
          code: 'POMASTER_ENVELOPE_PARSE',
          message: `CLI stdout is not JSON: ${(error as Error).message}`,
          hint: 'every host invocation must pass --json (§45); check for interactive TTY paths',
        },
      ],
    }
  }
  if (!isPomasterEnvelope(parsed)) {
    return {
      command: '(unknown)',
      ok: false,
      result: null,
      warnings: [],
      errors: [
        {
          code: 'POMASTER_ENVELOPE_SHAPE',
          message: 'CLI stdout parsed as JSON but does not match the §45 envelope {command, ok, result, warnings, errors}',
          hint: 'version mismatch? re-verify the command surface against the pinned pomaster version',
        },
      ],
    }
  }
  return parsed
}

/** Run one read-only pomaster command and resolve its §45 envelope. Never throws for CLI failures — failures ride the envelope. */
export function runPomasterJson(args: readonly string[], opts: PomasterCliOptions): Promise<PomasterEnvelope<unknown>> {
  const fullArgs = ensureJsonArg(args)
  const spec = buildSpawnSpec(fullArgs, opts)
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  return new Promise((resolve) => {
    const child = spawn(spec.file, spec.args, {
      cwd: opts.cwd,
      shell: spec.shell,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill()
      resolve({
        command: fullArgs.join(' '),
        ok: false,
        result: null,
        warnings: [],
        errors: [
          {
            code: 'POMASTER_TIMEOUT',
            message: `pomaster CLI exceeded ${timeoutMs}ms`,
            hint: 'check for interactive TTY prompts (init questionnaire blocks automation); always pass --json',
          },
        ],
      })
    }, timeoutMs)
    child.stdout?.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.stderr?.on('data', (chunk: Buffer) => stderr.push(chunk))
    child.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        command: fullArgs.join(' '),
        ok: false,
        result: null,
        warnings: [],
        errors: [
          {
            code: 'POMASTER_SPAWN_FAILED',
            message: String(error),
            hint: 'pomaster absent from PATH? pass PomasterCliOptions.scriptPath (node + dist/bin.js) in the bundle config',
          },
        ],
      })
    })
    child.on('close', () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      const rawStdout = Buffer.concat(stdout).toString('utf8')
      const envelope = parseEnvelope(rawStdout)
      if (!envelope.ok && stderr.length > 0 && envelope.errors.length === 0) {
        envelope.errors.push({
          code: 'POMASTER_CLI_STDERR',
          message: Buffer.concat(stderr).toString('utf8').slice(0, 2000),
        })
      }
      resolve(envelope)
    })
  })
}
