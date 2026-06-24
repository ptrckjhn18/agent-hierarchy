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

// Build agent objects from a header row + data rows (array-of-arrays).
// Shared by the CSV path and the Sheets-API path (which returns `values`).
export function agentsFromRows(rows) {
  if (!rows || rows.length < 2) return []
  const headers = rows[0].map(h => (h || '').toString().trim())
  const agents = []
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i] || []
    const row = {}
    headers.forEach((h, j) => { row[h] = (cols[j] || '').toString().trim() })
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

export function parseCSV(text) {
  return agentsFromRows(text.trim().split('\n').map(parseCSVLine))
}

// Stable, unique identity for an agent. NPN is unique across the sheet, so two
// people who happen to share a name (different NPN/email) stay distinct instead
// of collapsing into one node. The ~20 rows with no NPN fall back to row id.
export function agentKey(a) {
  return a.npn && a.npn !== '—' ? `npn:${a.npn}` : `row:${a.id}`
}

// Comp levels that always sink to the bottom regardless of value.
const COMP_BOTTOM = new Set(['HEALTH ONLY', 'LOA'])
function compSortValue(comp) {
  const n = parseFloat(comp)
  return Number.isFinite(n) ? n : -Infinity // blanks/unknowns sit below numbers
}
// Order siblings: Founders & Owners pinned on top, then Comp Level high→low,
// with HEALTH ONLY / LOA always at the very bottom. Name breaks ties.
function compareSiblings(a, b) {
  const fa = a.status === 'Founders & Owners' ? 0 : 1
  const fb = b.status === 'Founders & Owners' ? 0 : 1
  if (fa !== fb) return fa - fb
  const ba = COMP_BOTTOM.has((a.compLevel || '').toUpperCase()) ? 1 : 0
  const bb = COMP_BOTTOM.has((b.compLevel || '').toUpperCase()) ? 1 : 0
  if (ba !== bb) return ba - bb
  const na = compSortValue(a.compLevel), nb = compSortValue(b.compLevel)
  if (na !== nb) return nb - na
  return a.name.localeCompare(b.name)
}
function sortTree(node, depth = 0) {
  if (depth > 30 || !node.children.length) return
  node.children.sort(compareSiblings)
  node.children.forEach(c => sortTree(c, depth + 1))
}

// Single post-order pass that records each node's total downline on the node,
// so AgentCard never has to re-walk its subtree while rendering.
function computeDescendantCounts(node, depth = 0) {
  if (depth > 30) { node.descendantCount = 0; return 0 }
  let c = 0
  for (const ch of node.children) c += 1 + computeDescendantCounts(ch, depth + 1)
  node.descendantCount = c
  return c
}

export function buildFullTree(allAgents) {
  // Identity is the unique key; byName only resolves uplines (which are stored
  // by name in the sheet). First occurrence wins when a name is ambiguous.
  const byKey  = new Map()
  const byName = new Map()

  allAgents.forEach(a => {
    const node = { ...a, key: agentKey(a), children: [] }
    byKey.set(node.key, node)
    if (!byName.has(a.name)) byName.set(a.name, node)
  })

  // Virtual Pinnacle Life Group root, unless a real row already provides it
  let plgNode = byName.get('Pinnacle Life Group')
  if (!plgNode) {
    plgNode = {
      id: 'root', key: 'root',
      name: 'Pinnacle Life Group',
      npn: '—', status: 'Founders & Owners',
      compLevel: '—', email: '—', team: '—',
      directUpline: null, uplines: [],
      children: [], isVirtual: true,
    }
    byKey.set('root', plgNode)
    byName.set('Pinnacle Life Group', plgNode)
  }

  // Wire each agent to its parent strictly via directUpline (by name).
  const attached = new Set()
  allAgents.forEach(a => {
    if (a.name === 'Pinnacle Life Group') return
    const node = byKey.get(agentKey(a))
    const parentName = a.directUpline

    if (parentName && parentName !== a.name && byName.has(parentName)) {
      byName.get(parentName).children.push(node)
      attached.add(node.key)
    } else if (parentName === 'Pinnacle Life Group' || !parentName) {
      plgNode.children.push(node)
      attached.add(node.key)
    }
    // directUpline set but missing from the sheet → handled below
  })

  // Any agent not yet attached hangs directly off PLG
  allAgents.forEach(a => {
    if (a.name === 'Pinnacle Life Group') return
    const node = byKey.get(agentKey(a))
    if (!attached.has(node.key)) plgNode.children.push(node)
  })

  sortTree(plgNode)
  computeDescendantCounts(plgNode)

  return { byKey, byName, roots: [plgNode] }
}

// Prune the tree to only branches containing matching agents.
// Non-matching ancestors become dimmed "path" nodes that anchor matches in place.
//   strict = true  → matched nodes show only their *matching* descendants
//                    (honest counts; hides off-filter agents like inactive ones).
//   strict = false → matched nodes show their *full* downline (full-hierarchy view).
export function pruneToMatches(roots, matchingKeys, strict = true) {
  function prune(node, depth = 0) {
    if (depth > 30) return null
    const selfMatches = matchingKeys.has(node.key)
    const prunedChildren = node.children
      .map(c => prune(c, depth + 1))
      .filter(Boolean)
    if (!selfMatches && prunedChildren.length === 0) return null

    const useFull = !strict && selfMatches
    return {
      ...node,
      isMatch:    selfMatches,
      isPathNode: !selfMatches,
      children:   useFull ? node.children : prunedChildren,
      descendantCount: useFull
        ? node.descendantCount
        : prunedChildren.reduce((s, c) => s + 1 + (c.descendantCount || 0), 0),
    }
  }
  return roots.map(r => prune(r)).filter(Boolean)
}

// Agents that share a name with another agent (distinct people — NPN is unique).
// Uplines are stored by name, so a shared name can wire a downline to the wrong
// person; `usedAsUpline` flags the names where that actually bites.
export function findNameConflicts(allAgents) {
  const byName = new Map()
  allAgents.forEach(a => {
    if (!byName.has(a.name)) byName.set(a.name, [])
    byName.get(a.name).push(a)
  })
  const uplineNames = new Set(allAgents.map(a => a.directUpline).filter(Boolean))

  const conflicts = []
  byName.forEach((agents, name) => {
    if (agents.length > 1) {
      conflicts.push({ name, agents, usedAsUpline: uplineNames.has(name) })
    }
  })
  // Risky ones (a shared name that someone points to as upline) first.
  return conflicts.sort((a, b) =>
    (Number(b.usedAsUpline) - Number(a.usedAsUpline)) || a.name.localeCompare(b.name)
  )
}

export function getInitials(name) {
  const p = name.split(' ').filter(Boolean)
  return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

export function timeAgo(date) {
  if (!date) return null
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 10)  return 'just now'
  if (s < 60)  return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return date.toLocaleDateString()
}

const compColorMap = {}
export function getCompColor(level) {
  if (!level || level === '—') return '#94a3b8'
  if (!compColorMap[level]) {
    compColorMap[level] = COMP_COLORS[Object.keys(compColorMap).length % COMP_COLORS.length]
  }
  return compColorMap[level]
}
