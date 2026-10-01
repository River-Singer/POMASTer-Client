import { describe, expect, it } from 'vitest'
import type { PomasterEnvelope } from '@pomaster/client-contract'
import { buildAttentionList } from '../src/projections/attention.ts'
import { buildProjectOverview, projectNameFromStatePath } from '../src/projections/overview.ts'
import type { RawAlertsResult, RawStatusResult } from '../src/projections/overview.ts'

function envelope<T>(result: T, ok = true): PomasterEnvelope<T> {
  return { command: 'x', ok, result, warnings: [], errors: ok ? [] : [{ code: 'E1', message: 'm', hint: 'h' }] }
}

const statusFixture: RawStatusResult = {
  state_path: 'D:\\Vscode Documents\\pomaster client\\.pomaster\\state\\truth-index.json',
  generation_seq: 3,
  objects: { total: 20, by_kind: { business_rule: 19, task_object: 1 }, by_lifecycle: { PROPOSED: 20 } },
  permits: { unique_active_refs: ['PERMIT.TASK_DSH_WORKBENCH.1'] },
  baseline_confirmation: { state: 'confirmed' },
  next_action: { route_id: 'R_EXEC_IN_PROGRESS', beat: '4', command: 'pomaster exec-guard', reason: 'implementation in flight' },
  bootstrap_harness: { readiness: 'ok', capabilities: 8, tools: { ready: 3, gaps: 1 } },
  capability_tip: 'pomaster doctor --json',
}

const alertsFixture: RawAlertsResult = {
  alerts: [
    { code: 'PERMIT_EXPIRING', message: 'permit nears TTL', hint: 'renew via permit issue' },
    { code: 'PERMIT_EXPIRING', message: 'second ref' },
    { code: 'SPEC_DRIFT', message: 'drift detected' },
  ],
}

describe('buildProjectOverview', () => {
  const overview = buildProjectOverview({
    status: envelope(statusFixture),
    alerts: envelope(alertsFixture),
    pomasterVersion: '0.10.0',
  })

  it('projects project identity with governance marker', () => {
    expect(overview.project).toEqual({ name: 'pomaster client', governance: 'pomaster', pomasterVersion: '0.10.0' })
  })

  it('derives project name from the state path across separators', () => {
    expect(projectNameFromStatePath('C:/x/y/my-proj/.pomaster/state/truth-index.json')).toBe('my-proj')
    expect(projectNameFromStatePath('C:\\x\\win-proj\\.pomaster\\state\\truth-index.json')).toBe('win-proj')
    expect(projectNameFromStatePath(undefined)).toBe('POMaster project')
  })

  it('projects baseline, active task, permits and objects verbatim', () => {
    expect(overview.baseline.state).toBe('confirmed')
    expect(overview.activeTask).toEqual({ present: true, count: 1 })
    expect(overview.permits.uniqueActiveRefs).toEqual(['PERMIT.TASK_DSH_WORKBENCH.1'])
    expect(overview.objects.total).toBe(20)
    expect(overview.objects.byKind['business_rule']).toBe(19)
  })

  it('projects attention counts by code', () => {
    expect(overview.attention).toEqual({ total: 3, byCode: { PERMIT_EXPIRING: 2, SPEC_DRIFT: 1 } })
  })

  it('normalizes next_action and tool readiness', () => {
    expect(overview.nextAction).toEqual({
      routeId: 'R_EXEC_IN_PROGRESS',
      beat: '4',
      command: 'pomaster exec-guard',
      reason: 'implementation in flight',
    })
    expect(overview.tools).toEqual({ readiness: 'ok', capabilityTip: 'pomaster doctor --json', capabilities: 8, readyBindings: 3, gaps: 1 })
  })

  it('never invents state: missing fields degrade to null/unknown', () => {
    const bare = buildProjectOverview({ status: envelope({}), alerts: envelope({}) })
    expect(bare.baseline.state).toBe('unknown')
    expect(bare.nextAction).toBeNull()
    expect(bare.generationSeq).toBe(-1)
    expect(bare.project.name).toBe('POMaster project')
  })

  it('surfaces envelope failures through sources-tagged errors', () => {
    const failed = buildProjectOverview({ status: envelope<RawStatusResult>(null, false), alerts: envelope(alertsFixture) })
    expect(failed.errors.some((e) => e.code === 'status/E1')).toBe(true)
    expect(failed.warnings.length).toBe(0)
  })
})

describe('buildAttentionList', () => {
  it('maps alert items to read-only attention entries', () => {
    const list = buildAttentionList(envelope(alertsFixture))
    expect(list.count).toBe(3)
    expect(list.byCode['SPEC_DRIFT']).toBe(1)
    expect(list.items[0]).toMatchObject({ code: 'PERMIT_EXPIRING', actionable: true })
    expect(list.items[2]).toMatchObject({ code: 'SPEC_DRIFT', actionable: false, hint: undefined })
  })

  it('treats empty alerts as clean, not an error', () => {
    const list = buildAttentionList(envelope<RawAlertsResult>({}))
    expect(list).toMatchObject({ count: 0, items: [], byCode: {} })
  })
})
