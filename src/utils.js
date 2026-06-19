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

// Always build the full tree from ALL agents.
// matchingNames = Set of agent names that pass the current filter.
// Prune branches that have zero matching descendants.
export function buildFilteredTree(allAgents, matchingNames) {
  // Build complete tree map from every agent
  const byName = new Map()
  allAgents.forEach(a => byName.set(a.name, { ...a, children: [], isMatch: false, isPathNode: false }))

  // Wire up parent→child relationships
  allAgents.forEach(a => {
    if (a.directUpline && byName.has(a.directUpline)) {
      byName.get(a.directUpline).children.push(byName.get(a.name))
    }
  })

  // If no filter, return all true roots
  if (!matchingNames) {
    return allAgents
      .filter(a => !a.directUpline || !byName.has(a.directUpline))
      .map(a => byName.get(a.name))
  }

  // Mark matching nodes
  matchingNames.forEach(name => {
    if (byName.has(name)) byName.get(name).isMatch = true
  })

  // Recursively check if a node or any descendant is a match
  function hasMatch(node) {
    if (node.isMatch) return true
    return node.children.some(c => hasMatch(c))
  }

  // Prune tree: keep only branches that lead to a match
  // Preserve full upline path — never drop a parent node
  function pruneNode(node) {
    if (!hasMatch(node)) return null
    return {
      ...node,
      isMatch: node.isMatch,
      // Mark non-matching nodes that are only shown as path connectors
      isPathNode: !node.isMatch,
      children: node.children
        .map(c => pruneNode(c))
        .filter(Boolean),
    }
  }

  // Get all true roots (no parent, or parent not in dataset)
  const roots = allAgents
    .filter(a => !a.directUpline || !byName.has(a.directUpline))
    .map(a => byName.get(a.name))

  return roots.map(r => pruneNode(r)).filter(Boolean)
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
