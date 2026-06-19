export const SHEET_ID   = '1-s9YgLHaGx87h528JAvW2dLX4XSrkq7eQeABHIdvzCo'
export const SHEET_NAME = 'Agents Info'
export const POLL_MS    = 60000
export const CSV_URL    = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`

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

export const COMP_COLORS = [
  '#6366f1','#8b5cf6','#a855f7','#d946ef','#ec4899',
  '#f97316','#eab308','#22c55e','#06b6d4','#3b82f6',
]
