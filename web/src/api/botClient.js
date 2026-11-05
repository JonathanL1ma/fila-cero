export const BOT_TIMEOUT_MS = 10_000

export async function askBot({ board, player, timeMs, maxDepth }, { signal, timeoutMs = BOT_TIMEOUT_MS, fetch = globalThis.fetch } = {}) {
  const res = await fetch('/api/play', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ board, player, timeMs, maxDepth }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.message ?? `El bot respondió ${res.status}`)
  return body
}
