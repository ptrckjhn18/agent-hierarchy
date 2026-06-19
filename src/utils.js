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

// Build a complete lookup map and wire up parent→children
export function buildFullTree(allAgents) {
  const byName = new Map()
  allAgents.forEach(a => byName.set(a.name, { ...a, children: [] }))
  const roots = []
  allAgents.forEach(a => {
    const node = byName.get(a.name)
    if (a.directUpline && byName.has(a.directUpline)) {
      byName.get(a.directUpline).children.push(node)
    } else {
      roots.push(node)
    }
  })
  return { byName, roots }
}

// Given a set of matching agent names, prune the full tree so only
// branches that lead to a match are kept. Non-matching ancestors are
// kept as dimmed "path" nodes; non-matching nodes with no matching
// descendants are removed entirely.
export function pruneToMatches(roots, matchingNames) {
  function prune(node) {
    const selfMatches = matchingNames.has(node.name)
    const prunedChildren = node.children.map(c => prune(c)).filter(Boolean)

    if (!selfMatches && prunedChildren.length === 0) return null

    return {
      ...node,
      isMatch:    selfMatches,
      isPathNode: !selfMatches,   // ancestor shown only as path connector
      children:   selfMatches
        // If this node itself matches, show ALL its children (full downline)
        ? node.children
        // Otherwise only show the pruned path children
        : prunedChildren,
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
