// GET (Authorization: Bearer <token>) -> { values: [[...row], ...] }
// Verifies the session token, then reads the PRIVATE Google Sheet via a service
// account. The sheet is never publicly reachable; this is the only way in.
const crypto = require('crypto')
const { JWT } = require('google-auth-library')

function hmac(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest()
}
function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return false
  const dot = token.lastIndexOf('.')
  if (dot < 0) return false
  const exp = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  let expected, given
  try {
    expected = hmac(exp, secret)
    given = Buffer.from(sig, 'base64url')
  } catch { return false }
  if (expected.length !== given.length) return false
  if (!crypto.timingSafeEqual(expected, given)) return false
  return Number(exp) > Date.now()
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
})

let sheetClient // reused across warm invocations
function getClient(email, key) {
  if (!sheetClient) {
    sheetClient = new JWT({
      email,
      key: key.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
  }
  return sheetClient
}

exports.handler = async (event) => {
  const {
    SESSION_SECRET, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY,
    SHEET_ID, SHEET_RANGE,
  } = process.env

  if (!SESSION_SECRET || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !SHEET_ID) {
    return json(500, { error: 'Server not configured (missing env vars).' })
  }

  const auth = event.headers.authorization || event.headers.Authorization || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (!verifyToken(token, SESSION_SECRET)) return json(401, { error: 'Unauthorized' })

  try {
    const client = getClient(GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY)
    const { token: accessToken } = await client.getAccessToken()
    const range = SHEET_RANGE || 'AgentsInfo'
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return json(502, { error: `Sheet read failed (${res.status}).`, detail: detail.slice(0, 300) })
    }
    const data = await res.json()
    return json(200, { values: data.values || [] })
  } catch (e) {
    return json(502, { error: 'Could not read the sheet.', detail: String(e.message || e).slice(0, 300) })
  }
}
