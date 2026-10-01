import { describe, expect, it } from 'vitest'
import { isPomasterEnvelope, type PomasterEnvelope } from '../src/envelope.ts'

const valid: PomasterEnvelope<{ generation_seq: number }> = {
  command: 'status',
  ok: true,
  result: { generation_seq: 21 },
  warnings: [],
  errors: [],
}

describe('isPomasterEnvelope', () => {
  it('accepts the §45 envelope shape', () => {
    expect(isPomasterEnvelope(valid)).toBe(true)
  })

  it('accepts an error envelope with warnings as first-class signals', () => {
    const err = {
      command: 'tools',
      ok: false,
      result: null,
      warnings: [{ code: 'SOME_WARN', message: 'w' }],
      errors: [{ code: 'TOOLBINDING_REGISTRY_ABSENT', message: 'm', hint: 'h' }],
    }
    expect(isPomasterEnvelope(err)).toBe(true)
  })

  it('rejects the {ok,data,error} shape (common wrong guess)', () => {
    expect(isPomasterEnvelope({ ok: true, data: {}, error: null })).toBe(false)
  })

  it('rejects non-objects and missing arrays', () => {
    expect(isPomasterEnvelope(null)).toBe(false)
    expect(isPomasterEnvelope('status ok')).toBe(false)
    expect(isPomasterEnvelope({ command: 'status', ok: true, result: {} })).toBe(false)
  })
})
