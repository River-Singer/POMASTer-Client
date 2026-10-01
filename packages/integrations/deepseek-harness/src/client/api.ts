/** Same-origin fetch helpers for the POMaster host routes (connection layer authenticates). */

export async function getJSON<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { Accept: 'application/json' } })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`GET ${path} → ${response.status}: ${text.slice(0, 300)}`)
  }
  return (await response.json()) as T
}

export interface CommandEnvelope<T = unknown> {
  ok: boolean
  result: T | null
  warnings: Array<{ code: string; message: string; hint?: string }>
  errors: Array<{ code: string; message: string; hint?: string }>
}

export async function postCommand<T = unknown>(actionId: string, params: Record<string, string> = {}): Promise<CommandEnvelope<T>> {
  const response = await fetch('/api/pomaster/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ actionId, params }),
  })
  const body = (await response.json()) as CommandEnvelope<T>
  return body
}
