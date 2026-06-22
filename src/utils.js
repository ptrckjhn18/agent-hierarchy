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
      npn:          row['NPN']          || '—',
      status:       row['Status']        || '—',
      compLevel:    row['Comp Level']    || '—',
      email:        row['Email']         || '—',
      team:         row['Team']          || '—',
      directUpline: row['Direct Upline'] || null,
      uplines,
    })
  }
  return agents
}

export function buildFullTree(allAgents) {
  // Step 1: build a map of name → node (with empty children)
  const byName = new Map()
  allAgents.forEach(a => byName.set(a.name, { ...a, children: [] }))

  // Step 2: create virtual Pinnacle Life Group root if not already a real agent row
  if (!byName.has('Pinnacle Life Group')) {
    byName.set('Pinnacle Life Group', {
      id: 'root',
      name: 'Pinnacle Life Group',
      npn: '—', status: 'Founders & Owners',
      compLevel: '—', email: '—', team: '—',
      directUpline: null, uplines: [],
      children: [],
      isVirtual: true,
    })
  }

  const plgNode = byName.get('Pinnacle Life Group')

  // Step 3: wire each agent to its parent — strictly using directUpline only
  // Never fall back to Pinnacle Life Group automatically to avoid runaway trees
  const attached = new Set()
  allAgents.forEach(a => {
    if (a.name === 'Pinnacle Life Group') return
    const node = byName.get(a.name)
    const parentName = a.directUpline

    if (parentName && parentName !== a.name && byName.has(parentName)) {
      // Normal case: parent exists in map
      byName.get(parentName).children.push(node)
      attached.add(a.name)
    } else if (parentName === 'Pinnacle Life Group' || !parentName) {
      // Explicitly rooted at PLG or no upline
      plgNode.children.push(node)
      attached.add(a.name)
    }
    // If directUpline is set but doesn't exist in map — skip wiring,
    // they'll be caught as unattached below
  })

  // Step 4: any agent not yet attached goes directly under PLG
  allAgents.forEach(a => {
    if (a.name === 'Pinnacle Life Group') return
    if (!attached.has(a.name)) {
      plgNode.children.push(byName.get(a.name))
    }
  })

  return { byName, roots: [plgNode] }
}

// Prune tree to only branches containing matching agents
// Matched agents show full downline; ancestors are dimmed path nodes
export function pruneToMatches(roots, matchingNames) {
  function prune(node, depth = 0) {
    // Safety: prevent infinite recursion (shouldn't happen with clean data)
    if (depth > 20) return null
    const selfMatches = matchingNames.has(node.name)
    const prunedChildren = node.children
      .map(c => prune(c, depth + 1))
      .filter(Boolean)
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

export function countDescendants(node, depth = 0) {
  // Safety cap to prevent stack overflow
  if (depth > 20) return 0
  let c = 0
  ;(node.children || []).forEach(ch => { c += 1 + countDescendants(ch, depth + 1) })
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
