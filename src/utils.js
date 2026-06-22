import { COMP_COLORS } from './config'

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

    const name = row['Agent Name'] || ''
    if (!name) continue

    const uplines = []
    for (let u = 1; u <= 10; u++) {
      const val = row[`Upline ${u}`] || ''
      if (val) uplines.push(val)
    }

    agents.push({
      id:           i,
      name,
      npn:          row['NPN']           || '—',
      status:       row['Status']         || '—',
      compLevel:    row['Comp Level']     || '—',
      email:        row['Email']          || '—',
      team:         row['Team']           || '—',
      directUpline: row['Direct Upline']  || null,
      uplines,
    })
  }
  return agents
}

// Build full tree from ALL agents
// Virtual root nodes are created for any upline name
// (e.g. "Pinnacle Life Group") that has no agent row
export function buildFullTree(allAgents) {
  const byName = new Map()
  allAgents.forEach(a => byName.set(a.name, { ...a, children: [] }))

  // Create virtual node for Pinnacle Life Group if not in sheet
  if (!byName.has('Pinnacle Life Group')) {
    byName.set('Pinnacle Life Group', {
      id: 'root',
      name: 'Pinnacle Life Group',
      npn: '—', status: '—', compLevel: '—',
      email: '—', team: '—',
      directUpline: null, uplines: [],
      children: [],
      isVirtual: true,
    })
  }

  // Wire up parent → children
  allAgents.forEach(a => {
    const node = byName.get(a.name)
    const parentName = a.directUpline
    if (parentName && byName.has(parentName)) {
      byName.get(parentName).children.push(node)
    } else if (!parentName) {
      // No direct upline → attach to Pinnacle Life Group
      byName.get('Pinnacle Life Group').children.push(node)
    }
    // If directUpline doesn't exist in map at all, treat as root-level under PLG
    else {
      byName.get('Pinnacle Life Group').children.push(node)
    }
  })

  // Root = Pinnacle Life Group only
  const plg = byName.get('Pinnacle Life Group')
  return { byName, roots: [plg] }
}

// Prune tree to only show branches containing matching agents
// Matched nodes show full downline; path ancestors are dimmed
export function pruneToMatches(roots, matchingNames) {
  function prune(node) {
    const selfMatches = matchingNames.has(node.name)
    const prunedChildren = node.children.map(c => prune(c)).filter(Boolean)
    if (!selfMatches && prunedChildren.length === 0) return null
    return {
      ...node,
      isMatch:    selfMatches,
      isPathNode: !selfMatches,
      children:   selfMatches ? node.children : prunedChildren,
    }
  }
  return roots.map(r => prune(r)).filter(Boolean)
}

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
