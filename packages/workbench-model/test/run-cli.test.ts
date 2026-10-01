import { describe, expect, it } from 'vitest'
import { buildSpawnSpec, ensureJsonArg, parseEnvelope, quoteForShell } from '../src/run-cli.ts'
import type { PomasterCliOptions } from '../src/run-cli.ts'

describe('buildSpawnSpec', () => {
  const opts: PomasterCliOptions = { cwd: 'D:/w' }

  it('prefers scriptPath mode: node + dist/bin.js, no shell', () => {
    const spec = buildSpawnSpec(['status', '--json'], { ...opts, scriptPath: 'C:/npm/pomaster/dist/bin.js' })
    expect(spec.shell).toBe(false)
    expect(spec.file).toBe(process.execPath)
    expect(spec.args).toEqual(['C:/npm/pomaster/dist/bin.js', 'status', '--json'])
  })

  it('quotes whitespace args when a shell joins the command line (Windows paths with spaces)', () => {
    const spec = buildSpawnSpec(['--dir', 'D:\\Vscode Documents\\pomaster client', 'status', '--json'], opts)
    expect(spec.shell).toBe(true)
    expect(spec.args).toContain('"D:\\Vscode Documents\\pomaster client"')
  })

  it('leaves clean args untouched', () => {
    expect(quoteForShell('--json')).toBe('--json')
    expect(quoteForShell('status')).toBe('status')
  })
})

describe('ensureJsonArg', () => {
  it('appends --json when missing (§45 machine channel)', () => {
    expect(ensureJsonArg(['status'])).toEqual(['status', '--json'])
  })
  it('does not duplicate', () => {
    expect(ensureJsonArg(['alerts', '--json'])).toEqual(['alerts', '--json'])
  })
})

describe('parseEnvelope', () => {
  it('parses a real §45 envelope', () => {
    const env = parseEnvelope('{"command":"status","ok":true,"result":{"a":1},"warnings":[],"errors":[]}')
    expect(env.ok).toBe(true)
  })

  it('degrades non-JSON stdout to a PARSE error envelope instead of throwing', () => {
    const env = parseEnvelope('欢迎语或彩色文本')
    expect(env.ok).toBe(false)
    expect(env.errors[0]?.code).toBe('POMASTER_ENVELOPE_PARSE')
  })

  it('degrades wrong-shape JSON to a SHAPE error envelope', () => {
    const env = parseEnvelope('{"ok":true,"data":{}}')
    expect(env.errors[0]?.code).toBe('POMASTER_ENVELOPE_SHAPE')
  })
})
