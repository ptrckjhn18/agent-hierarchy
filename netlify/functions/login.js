// POST { password } -> { token, exp }
// Validates the shared password server-side (constant-time) and issues a signed,
// expiring session token. The password itself never leaves the server.
const crypto = require('crypto')

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

function hmac(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest()
}
function signToken(exp, secret) {
  const sig = hmac(String(exp), secret).toString('base64url')
  return `${exp}.${sig}`
}
function constantTimeEqual(a, b, secret) {
  // Compare via fixed-length HMAC digests so length differences don't leak / throw
  const da = hmac(a, secret), db = hmac(b, secret)
  return crypto.timingSafeEqual(da, db)
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
})

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' })

  const { ACCESS_PASSWORD, SESSION_SECRET } = process.env
  if (!ACCESS_PASSWORD || !SESSION_SECRET) {
    return json(500, { error: 'Server not configured (missing ACCESS_PASSWORD / SESSION_SECRET).' })
  }

  let supplied = ''
  try { supplied = String(JSON.parse(event.body || '{}').password || '') } catch { /* ignore */ }

  const ok = supplied.length > 0 && constantTimeEqual(supplied, ACCESS_PASSWORD, SESSION_SECRET)
  if (!ok) {
    await new Promise(r => setTimeout(r, 400)) // throttle brute force a little
    return json(401, { error: 'Incorrect password.' })
  }

  const exp = Date.now() + TOKEN_TTL_MS
  return json(200, { token: signToken(exp, SESSION_SECRET), exp })
}
