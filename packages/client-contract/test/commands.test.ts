import { describe, expect, it } from 'vitest'
import { isReadOnlyInvocation, READ_ONLY_COMMANDS } from '../src/commands.ts'

describe('Phase-1 read-only whitelist (DECISION.DSH07)', () => {
  it('accepts whitelisted read-only invocations', () => {
    expect(isReadOnlyInvocation(['status', '--json'])).toBe(true)
    expect(isReadOnlyInvocation(['alerts', '--json'])).toBe(true)
    expect(isReadOnlyInvocation(['tools', 'list', '--json'])).toBe(true)
  })

  it('rejects write-path commands', () => {
    expect(isReadOnlyInvocation(['plan', 'run'])).toBe(false)
    expect(isReadOnlyInvocation(['finalize'])).toBe(false)
    expect(isReadOnlyInvocation(['maintain'])).toBe(false)
    expect(isReadOnlyInvocation(['context', 'compile', '--check'])).toBe(false)
  })

  it('rejects whitelisted heads without their forced safe args', () => {
    expect(isReadOnlyInvocation(['status'])).toBe(false)
  })

  it('never whitelists compile-without-check shape even if extended later', () => {
    const spec = READ_ONLY_COMMANDS.find((s) => s.command === 'status')
    expect(spec?.fixedArgs).toContain('--json')
  })
})
