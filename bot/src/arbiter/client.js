export function createArbiterClient({ baseUrl, token, fetch = globalThis.fetch, nextGraceMs = 5000 }) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  async function call(method, path, { body, timeoutMs }) {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(Math.max(1, Math.floor(timeoutMs))),
    })
    let data
    try {
      data = await res.json()
    } catch {
      throw new Error(`Respuesta no JSON del árbitro (${res.status}) en ${method} ${path}`)
    }
    return { status: res.status, body: data }
  }

  return {
    next: (waitS) => call('GET', `/api/next?wait=${waitS}`, { timeoutMs: waitS * 1000 + nextGraceMs }),
    move: (gameId, column, timeoutMs) => call('POST', '/api/move', { body: { game_id: gameId, column }, timeoutMs }),
    me: () => call('GET', '/api/me', { timeoutMs: 10_000 }),
    practice: (opponent, first) => call('POST', '/api/practice', { body: { opponent, first }, timeoutMs: 10_000 }),
    submission: (repoUrl, commit) =>
      call('PUT', '/api/me/submission', { body: { repo_url: repoUrl, commit }, timeoutMs: 10_000 }),
  }
}
