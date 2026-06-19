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

// Builds tree from ALL agents, but only returns roots that contain
// at least one matching agent (by name set). This prevents unrelated
// root nodes (like Kayden Moreno) from appearing in search results.
export function buildTree(allAgents, matchingNames) {
  // Build full tree from all agents so hierarchy is intact
  const byName = new Map()
  allAgents.forEach(a => byName.set(a.name, { ...a, children: [] }))

  allAgents.forEach(a => {
    const node = byName.get(a.name)
    if (a.directUpline && byName.has(a.directUpline)) {
      byName.get(a.directUpline).children.push(node)
    }
  })

  // If no filter active, return all roots
  if (!matchingNames) {
    return allAgents
      .filter(a => !a.directUpline || !byName.has(a.directUpline))
      .map(a => byName.get(a.name))
  }

  // Otherwise find the true root of each matching agent
  // and only include roots that have a matching descendant
  function nodeContainsMatch(node) {
    if (matchingNames.has(node.name)) return true
    return (node.children || []).some(c => nodeContainsMatch(c))
  }

  // For each matching agent, walk up to find its true root
  const rootsToShow = new Set()
  matchingNames.forEach(name => {
    let current = allAgents.find(a => a.name === name)
    if (!current) return
    // Walk up upline chain to find the root
    while (current.directUpline && byName.has(current.directUpline)) {
      current = byName.get(current.directUpline)
    }
    rootsToShow.add(current.name)
  })

  return [...rootsToShow]
    .map(name => byName.get(name))
    .filter(Boolean)
}

// Prune tree to only show branches containing matching agents
export function pruneTree(node, matchingNames) {
  if (matchingNames.has(node.name)) {
    // This node matches — show it with all its children collapsed
    return { ...node, isMatch: true, children: node.children || [] }
  }
  // Check children for matches
  const prunedChildren = (node.children || [])
    .map(c => pruneTree(c, matchingNames))
    .filter(Boolean)

  if (prunedChildren.length > 0) {
    return { ...node, isMatch: false, children: prunedChildren, forceExpand: true }
  }
  return null
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
