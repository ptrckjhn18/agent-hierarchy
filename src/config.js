export const POLL_MS    = 60000

// Authenticated serverless proxy endpoints (Netlify Functions).
// The sheet ID/credentials live only on the server (Netlify env vars), never
// in the client bundle.
export const LOGIN_ENDPOINT  = '/.netlify/functions/login'
export const AGENTS_ENDPOINT = '/.netlify/functions/agents'

export const STATUS_CONFIG = {
  'Active Agent':          { bg:'#dcfce7', text:'#15803d', dot:'#22c55e' },
  'Admin':                 { bg:'#dbeafe', text:'#1d4ed8', dot:'#3b82f6' },
  'Agent Pending Release': { bg:'#fef9c3', text:'#a16207', dot:'#eab308' },
  'Entity':                { bg:'#e0e7ff', text:'#4338ca', dot:'#6366f1' },
  'Founders & Owners':     { bg:'#fce7f3', text:'#be185d', dot:'#ec4899' },
  'Inactive Agent':        { bg:'#fee2e2', text:'#b91c1c', dot:'#ef4444' },
  'New Agent':             { bg:'#cffafe', text:'#0e7490', dot:'#06b6d4' },
  'Staff':                 { bg:'#f3e8ff', text:'#7e22ce', dot:'#a855f7' },
  'Team Leader':           { bg:'#ffedd5', text:'#c2410c', dot:'#f97316' },
  'Terminated':            { bg:'#f1f5f9', text:'#64748b', dot:'#94a3b8' },
}
export const DEFAULT_STATUS = { bg:'#f1f5f9', text:'#64748b', dot:'#94a3b8' }

// Grouped status buckets that power the four top-level stat cards.
// `statuses: null` on "all" means "every agent regardless of status".
export const STATUS_GROUPS = [
  { key:'all',        label:'All Agents', color:'#6366f1', icon:'◍', statuses: null },
  { key:'active',     label:'Active',     color:'#10b981', icon:'●',
    statuses:['Founders & Owners', 'Team Leader', 'Entity', 'Active Agent'] },
  { key:'inactive',   label:'Inactive',   color:'#f59e0b', icon:'◐',
    statuses:['Agent Pending Release', 'Agent Release Approved', 'Inactive Agent'] },
  { key:'terminated', label:'Terminated', color:'#ef4444', icon:'○',
    statuses:['Terminated'] },
]

// Fast lookup: status string -> group key (excludes the "all" bucket)
export const STATUS_TO_GROUP = STATUS_GROUPS.reduce((map, g) => {
  if (g.statuses) g.statuses.forEach(s => { map[s] = g.key })
  return map
}, {})

export const COMP_COLORS = [
  '#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899',
  '#f97316','#eab308','#22c55e','#06b6d4','#3b82f6',
]
