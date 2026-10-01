/**
 * Attention projection (PRD §24-26): the alerts payload IS the signal —
 * `pomaster alerts --json` always exits 0 (hook contract), so exit codes carry
 * no information. Phase-1 attention is read-only: view / locate / explain.
 */
import type { AttentionItem, AttentionList, PomasterEnvelope } from '@pomaster/client-contract'
import type { RawAlertsResult } from './overview.ts'

function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {}
}

export function buildAttentionList(alerts: PomasterEnvelope<RawAlertsResult>): AttentionList {
  const items = Array.isArray(alerts.result?.alerts) ? alerts.result.alerts : []
  const mapped: AttentionItem[] = items.map((item) => {
    const rec = asRecord(item)
    const code = typeof rec['code'] === 'string' ? rec['code'] : 'UNKNOWN'
    const message = typeof rec['message'] === 'string' ? rec['message'] : JSON.stringify(item)
    const hint = typeof rec['hint'] === 'string' ? rec['hint'] : undefined
    const command = typeof rec['command'] === 'string' ? rec['command'] : undefined
    return { code, message, hint, actionable: command !== undefined || hint !== undefined }
  })
  const byCode: Record<string, number> = {}
  for (const item of mapped) byCode[item.code] = (byCode[item.code] ?? 0) + 1
  return {
    schema: 'pomaster.workbench.attention/v1-spike',
    items: mapped,
    count: mapped.length,
    byCode,
    warnings: alerts.warnings,
    errors: alerts.errors,
  }
}
