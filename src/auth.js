// Client-side session token storage. The token is server-issued and
// server-verified on every data request; this is just where the browser keeps
// it between page loads. Expiry here is a UX hint — the server is the authority.
const KEY = 'agentHierarchy.session.v1'

export function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY))
    if (s && s.token && s.exp && s.exp > Date.now()) return s
  } catch { /* ignore */ }
  return null
}
export function saveSession(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ }
}
export function clearSession() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
