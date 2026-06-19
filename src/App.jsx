import React, { useState, useMemo } from 'react'
import { STATUS_CONFIG } from './config'
import { buildTree, pruneTree } from './utils'
import { useDebounce, useSheetData } from './hooks'
import AgentCard from './AgentCard'

const DEFAULT_TEAM = 'Pinnacle Core'

export default function App() {
  const { allAgents, loading, error, lastUpdated, refetch } = useSheetData()

  const [searchInput, setSearchInput]   = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterTeam, setFilterTeam]     = useState(DEFAULT_TEAM)

  const search = useDebounce(searchInput, 350)

  const allTeams = useMemo(() =>
    ['All', ...new Set(allAgents.map(a => a.team).filter(t => t && t !== '—').sort())],
    [allAgents]
  )
  const allStatuses = useMemo(() =>
    ['All', ...Object.keys(STATUS_CONFIG).filter(s => allAgents.some(a => a.status === s))],
    [allAgents]
  )

  // Step 1: apply status + team filters to get candidate agents
  const teamAndStatusFiltered = useMemo(() => {
    return allAgents.filter(a => {
      const mSt = filterStatus === 'All' || a.status === filterStatus
      const mT  = filterTeam   === 'All' || a.team   === filterTeam
      return mSt && mT
    })
  }, [allAgents, filterStatus, filterTeam])

  // Step 2: find which agents match the search
  const matchingNames = useMemo(() => {
    if (!search) return null
    const sl = search.toLowerCase()
    const names = new Set()
    // Search across ALL agents (not just filtered) so we find them in any team
    allAgents.forEach(a => {
      if (
        a.name.toLowerCase().includes(sl) ||
        a.npn.toLowerCase().includes(sl) ||
        a.email.toLowerCase().includes(sl)
      ) names.add(a.name)
    })
    return names
  }, [allAgents, search])

  // Step 3: build tree and prune to only matching branches
  const tree = useMemo(() => {
    // Use all agents for tree building so hierarchy is always intact
    // but pass matchingNames to control which roots appear
    const agentsForTree = search ? allAgents : teamAndStatusFiltered
    const roots = buildTree(agentsForTree, matchingNames || undefined)

    if (!matchingNames) return roots

    // Prune each root to only show branches with matches
    return roots
      .map(root => pruneTree(root, matchingNames))
      .filter(Boolean)
  }, [allAgents, teamAndStatusFiltered, matchingNames, search])

  const statCounts = useMemo(() => {
    const counts = {}
    allAgents.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1 })
    return counts
  }, [allAgents])

  // Stats — removed New Agents as requested
  const topStats = [
    { label:'Total Agents',    value: allAgents.length,                          color:'#6366f1' },
    { label:'Active Agents',   value: statCounts['Active Agent']          || 0,  color:'#22c55e' },
    { label:'Team Leaders',    value: statCounts['Team Leader']           || 0,  color:'#f97316' },
    { label:'Pending Release', value: statCounts['Agent Pending Release'] || 0,  color:'#eab308' },
    { label:'Terminated',      value: statCounts['Terminated']            || 0,  color:'#ef4444' },
  ]

  const hasFilters = search || filterStatus !== 'All' || filterTeam !== DEFAULT_TEAM
  const clearFilters = () => {
    setSearchInput('')
    setFilterStatus('All')
    setFilterTeam(DEFAULT_TEAM)
  }

  const matchCount = matchingNames ? matchingNames.size : null

  return (
    <div style={{ minHeight:'100vh', background:'#f1f5f9', paddingBottom:48 }}>

      {/* HEADER */}
      <div style={{ background:'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)', padding:'22px 32px 20px' }}>
        <div style={{ maxWidth:1040, margin:'0 auto' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:5 }}>
                <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#6366f1,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🏢</div>
                <h1 style={{ fontSize:21, fontWeight:700, color:'#fff', letterSpacing:-0.3 }}>Agent Hierarchy</h1>
              </div>
              <p style={{ fontSize:12, color:'#64748b' }}>
                Live · auto-refreshes every 60s
                {lastUpdated && <span style={{ color:'#475569' }}> · Last sync: {lastUpdated.toLocaleTimeString()}</span>}
              </p>
            </div>
            <button
              onClick={() => refetch(true)}
              disabled={loading}
              style={{
                padding:'9px 18px', borderRadius:9,
                border:'1.5px solid rgba(255,255,255,0.15)',
                background:'rgba(255,255,255,0.08)', color:'#e2e8f0',
                fontSize:13, fontWeight:600, cursor: loading ? 'wait' : 'pointer',
                display:'flex', alignItems:'center', gap:6,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? '⏳ Loading…' : '↻ Refresh now'}
            </button>
          </div>

          {/* Stats */}
          <div style={{ display:'flex', gap:10, marginTop:16, flexWrap:'wrap' }}>
            {topStats.map(s => (
              <div key={s.label} style={{ background:'rgba(255,255,255,0.06)', borderRadius:10, padding:'8px 14px', border:'1px solid rgba(255,255,255,0.07)', minWidth:80 }}>
                <div style={{ fontSize:19, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:10, color:'#64748b', fontWeight:500, marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ maxWidth:1040, margin:'0 auto', padding:'22px 24px 0' }}>

        {/* Filters */}
        <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:220, position:'relative' }}>
            <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, color:'#94a3b8', pointerEvents:'none' }}>🔍</span>
            <input
              type="text"
              placeholder="Search by name, NPN, or email…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{ width:'100%', padding:'10px 34px 10px 34px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:13, outline:'none', background:'#fff', color:'#0f172a' }}
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:18, lineHeight:1, padding:2 }}>×</button>
            )}
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{ padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:13, background:'#fff', color:'#0f172a', cursor:'pointer', minWidth:160 }}>
            {allStatuses.map(s => <option key={s}>{s}</option>)}
          </select>
          <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)}
            style={{ padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:13, background:'#fff', color:'#0f172a', cursor:'pointer', minWidth:160 }}>
            {allTeams.map(t => <option key={t}>{t}</option>)}
          </select>
          {hasFilters && (
            <button onClick={clearFilters}
              style={{ padding:'10px 14px', borderRadius:10, border:'1.5px solid #fca5a5', background:'#fff', color:'#ef4444', fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* Result info */}
        {!loading && !error && (
          <div style={{ fontSize:12, color:'#64748b', marginBottom:12, minHeight:18 }}>
            {search && matchingNames ? (
              matchCount === 0
                ? <span style={{ color:'#ef4444' }}>No agents found matching "<strong>{search}</strong>"</span>
                : <span>Found <strong style={{ color:'#0f172a' }}>{matchCount}</strong> agent{matchCount !== 1 ? 's' : ''} matching "<strong>{search}</strong>"</span>
            ) : filterTeam !== 'All' ? (
              <span>Showing <strong style={{ color:'#0f172a' }}>{teamAndStatusFiltered.length}</strong> agents in <strong style={{ color:'#0f172a' }}>{filterTeam}</strong></span>
            ) : null}
          </div>
        )}

        {/* Tree */}
        <div style={{ background:'#fff', borderRadius:16, border:'1.5px solid #e2e8f0', padding:'18px 18px 22px 14px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', minHeight:200 }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'48px 20px', color:'#94a3b8' }}>
              <div style={{ fontSize:28, marginBottom:10 }}>⏳</div>
              <div style={{ fontSize:14, fontWeight:500 }}>Loading from Google Sheets…</div>
              <div style={{ fontSize:12, marginTop:6 }}>This may take a moment for large sheets</div>
            </div>
          ) : error ? (
            <div style={{ textAlign:'center', padding:'48px 20px' }}>
              <div style={{ fontSize:28, marginBottom:10 }}>⚠️</div>
              <div style={{ fontSize:14, color:'#ef4444', fontWeight:600, marginBottom:8 }}>{error}</div>
              <div style={{ fontSize:12, color:'#94a3b8', lineHeight:1.7 }}>
                Make sure your sheet is shared:<br/>
                <strong>Share → Anyone with the link → Viewer</strong>
              </div>
              <button onClick={() => refetch(true)} style={{ marginTop:14, padding:'8px 18px', borderRadius:8, border:'1.5px solid #e2e8f0', background:'#f8fafc', fontSize:13, cursor:'pointer', color:'#334155', fontWeight:600 }}>
                Try again
              </button>
            </div>
          ) : tree.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 20px', color:'#94a3b8' }}>
              <div style={{ fontSize:28, marginBottom:10 }}>🔍</div>
              <div style={{ fontSize:14 }}>
                {search ? `No agents found matching "${search}"` : 'No agents match your current filters.'}
              </div>
              <button onClick={clearFilters} style={{ marginTop:12, padding:'8px 16px', borderRadius:8, border:'1.5px solid #e2e8f0', background:'#f8fafc', fontSize:13, cursor:'pointer', color:'#334155', fontWeight:600 }}>
                Clear filters
              </button>
            </div>
          ) : (
            tree.map(root => (
              <AgentCard key={root.name} agent={root} depth={0} searchTerm={search} />
            ))
          )}
        </div>

        {/* Clickable status legend */}
        {!loading && !error && allAgents.length > 0 && (
          <div style={{ marginTop:12, display:'flex', flexWrap:'wrap', gap:6 }}>
            {Object.entries(STATUS_CONFIG).map(([label, cfg]) =>
              statCounts[label] ? (
                <div
                  key={label}
                  onClick={() => setFilterStatus(filterStatus === label ? 'All' : label)}
                  style={{
                    display:'flex', alignItems:'center', gap:5,
                    background: filterStatus === label ? cfg.bg : '#fff',
                    border:`1px solid ${filterStatus === label ? cfg.dot : '#e2e8f0'}`,
                    borderRadius:20, padding:'3px 10px', cursor:'pointer',
                    transition:'all 0.12s',
                  }}
                >
                  <div style={{ width:6, height:6, borderRadius:'50%', background:cfg.dot }} />
                  <span style={{ fontSize:11, color:cfg.text, fontWeight:600 }}>{label}</span>
                  <span style={{ fontSize:11, color:'#94a3b8' }}>({statCounts[label]})</span>
                </div>
              ) : null
            )}
          </div>
        )}

        <p style={{ fontSize:11, color:'#94a3b8', textAlign:'center', marginTop:16, lineHeight:1.7 }}>
          Click any card to expand details &nbsp;·&nbsp; +/− to expand downline &nbsp;·&nbsp; ↓ = total downline &nbsp;·&nbsp; Click a status badge to filter
        </p>
      </div>
    </div>
  )
}
