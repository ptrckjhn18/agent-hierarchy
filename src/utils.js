import { COMP_COLORS } from './config'

// ── CSV PARSER ────────────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const cols = []; let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { inQ = !inQ }
    else if (c === ',' && !inQ) { cols.push(cur); cur = '' }
    else { cur += c }
  }
  cols.push(cur)
  return cols.map(c => c.replace(/^"|"$/g, '').trim())
}

export function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0])
  const agents = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const row = {}
    headers.forEach((h, j) => { row[h] = (cols[j] || '').trim() })
    const name = row['Agent Name'] || row['Name'] || ''
    if (!name) continue
    const uplines = []
    for (let u = 1; u <= 10; u++) {
      const val = row[`Upline ${u}`] || ''
      if (val) uplines.push(val)
    }
    agents.push({
      id:           i,
      name,
      npn:          row['NPN']          || '—',
      status:       row['Status']        || '—',
      compLevel:    row['Comp Level']    || row['Comp level'] || row['Comp'] || '—',
      email:        row['Email']         || '—',
      team:         row['Team']          || '—',
      directUpline: row['Direct Upline'] || null,
      uplines,
    })
  }
  return agents
}

// ── TREE BUILDER ──────────────────────────────────────────────────────────────
export function buildTree(agents) {
  const byName = new Map()
  agents.forEach(a => byName.set(a.name, { ...a, children: [] }))
  const roots = []
  agents.forEach(a => {
    const node = byName.get(a.name)
    if (!a.directUpline || !byName.has(a.directUpline)) {
      roots.push(node)
    } else {
      byName.get(a.directUpline).children.push(node)
    }
  })
  return roots
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
export function getInitials(name) {
  const p = name.split(' ').filter(Boolean)
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

export function countDescendants(node) {
  let c = 0
  ;(node.children || []).forEach(ch => { c += 1 + countDescendants(ch) })
  return c
}

const compColorMap = {}
export function getCompColor(level) {
  if (!level || level === '—') return '#94a3b8'
  if (!compColorMap[level]) {
    compColorMap[level] = COMP_COLORS[Object.keys(compColorMap).length % COMP_COLORS.length]
  }
  return compColorMap[level]
}
