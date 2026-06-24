import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SHEET_ID = '1-2BMyb3i2G8ivhUnkIHJmC8Y1FOuooX7ioOUPgevcgo'
const SHEET_NAME = 'AgentsInfo'
const DEV_PASSWORD = process.env.DEV_PASSWORD || 'pinnacle'

// Minimal CSV -> rows (array of arrays) parser for the dev mock only.
function csvToRows(text) {
  return text.trim().split('\n').map(line => {
    const cells = []; let cur = '', q = false
    for (const ch of line) {
      if (ch === '"') q = !q
      else if (ch === ',' && !q) { cells.push(cur); cur = '' }
      else cur += ch
    }
    cells.push(cur)
    return cells.map(c => c.replace(/^"|"$/g, '').trim())
  })
}
const readBody = req => new Promise(res => { let b = ''; req.on('data', c => (b += c)); req.on('end', () => res(b)) })
const send = (res, code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)) }

// Stands in for the Netlify Functions during `vite dev` so the auth + data flow
// is testable locally. Production uses the real functions in /netlify/functions.
function devFunctionsMock() {
  return {
    name: 'dev-functions-mock',
    configureServer(server) {
      server.middlewares.use('/.netlify/functions/login', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        let pw = ''
        try { pw = JSON.parse(await readBody(req) || '{}').password || '' } catch { /* ignore */ }
        if (pw !== DEV_PASSWORD) { await new Promise(r => setTimeout(r, 300)); return send(res, 401, { error: 'Incorrect password.' }) }
        const exp = Date.now() + 12 * 3600 * 1000
        return send(res, 200, { token: `dev.${exp}`, exp })
      })
      server.middlewares.use('/.netlify/functions/agents', async (req, res, next) => {
        const auth = req.headers.authorization || ''
        const token = auth.replace(/^Bearer\s+/i, '')
        if (!/^dev\.\d+$/.test(token) || Number(token.slice(4)) < Date.now()) return send(res, 401, { error: 'Unauthorized' })
        try {
          const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`
          const r = await fetch(url)
          const text = await r.text()
          return send(res, 200, { values: csvToRows(text) })
        } catch (e) { return send(res, 502, { error: 'dev fetch failed', detail: String(e) }) }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), devFunctionsMock()],
})
