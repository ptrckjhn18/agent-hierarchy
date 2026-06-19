import React, { useState, useMemo } from 'react'
import { STATUS_CONFIG } from './config'
import { buildFullTree, pruneToMatches } from './utils'
import { useDebounce, useSheetData } from './hooks'
import AgentCard from './AgentCard'

const DEFAULT_TEAM = 'Pinnacle Core'

export default function App() {
  const { allAgents, loading, error, refetch } = useSheetData()

  const [searchInput, setSearchInput]       = useState('')
  const [filterStatus, setFilterStatus]     = useState('All')
  const [filterTeam, setFilterTeam]         = useState(DEFAULT_TEAM)
  const [activeStatCard, setActiveStatCard] = useState(null)

  const search = useDebounce(searchInput, 350)

  // Build the full tree once when agents load — never rebuild on filter
  const { byName, roots } = useMemo(
    () => buildFullTree(allAgents),
    [allAgents]
  )

  const allTeams = useMemo(() =>
    ['All', ...new Set(allAgents.map(a => a.team).filter(t => t && t !== '—').sort())],
    [allAgents]
  )

  const statCounts = useMemo(() => {
    const counts = {}
    allAgents.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1 })
    return counts
  }, [allAgents])

  const topStats = useMemo(() => [
    { label:'Total Agents',      value: allAgents.length,                          color:'#6366f1', status: null,                      key:'total'      },
    { label:'Active Agents',     value: statCounts['Active Agent']          || 0,  color:'#22c55e', status: 'Active Agent',            key:'active'     },
    { label:'Entity',            value: statCounts['Entity']                || 0,  color:'#818cf8', status: 'Entity',                  key:'entity'     },
    { label:'Team Leaders',      value: statCounts['Team Leader']           || 0,  color:'#f97316', status: 'Team Leader',             key:'leaders'    },
    { label:'Founders & Owners', value: statCounts['Founders & Owners']    || 0,  color:'#ec4899', status: 'Founders & Owners',       key:'founders'   },
    { label:'Pending Release',   value: statCounts['Agent Pending Release'] || 0,  color:'#eab308', status: 'Agent Pending Release',   key:'pending'    },
    { label:'Inactive',          value: statCounts['Inactive Agent']        || 0,  color:'#f97316', status: 'Inactive Agent',          key:'inactive'   },
    { label:'Terminated',        value: statCounts['Terminated']            || 0,  color:'#ef4444', status: 'Terminated',              key:'terminated' },
  ], [allAgents, statCounts])

  function handleStatCardClick(stat) {
    if (stat.key === 'total') {
      setActiveStatCard(null)
      setFilterStatus('All')
    } else if (activeStatCard === stat.key) {
      setActiveStatCard(null)
      setFilterStatus('All')
    } else {
      setActiveStatCard(stat.key)
      setFilterStatus(stat.status)
    }
  }

  // Determine the set of agent names that pass ALL active filters
  const matchingNames = useMemo(() => {
    const sl = search.toLowerCase()
    const names = new Set()
    allAgents.forEach(a => {
      const matchesSearch = !search
        || a.name.toLowerCase().includes(sl)
        || a.npn.toLowerCase().includes(sl)
        || a.email.toLowerCase().includes(sl)
      const matchesStatus = filterStatus === 'All' || a.status === filterStatus
      const matchesTeam   = filterTeam   === 'All' || a.team   === filterTeam
      if (matchesSearch && matchesStatus && matchesTeam) names.add(a.name)
    })
    return names
  }, [allAgents, search, filterStatus, filterTeam])

  const noFiltersActive = !search && filterStatus === 'All' && filterTeam === DEFAULT_TEAM

  // Prune the pre-built tree — never rebuild it from scratch
  const tree = useMemo(() => {
    if (noFiltersActive) return roots
    return pruneToMatches(roots, matchingNames)
  }, [roots, matchingNames, noFiltersActive])

  const hasFilters = search || filterStatus !== 'All' || filterTeam !== DEFAULT_TEAM
  const clearFilters = () => {
    setSearchInput('')
    setFilterStatus('All')
    setFilterTeam(DEFAULT_TEAM)
    setActiveStatCard(null)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f1f5f9', paddingBottom:48 }}>

      {/* HEADER */}
      <div style={{ background:'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)', padding:'22px 32px 20px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>

          {/* Title + Refresh */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, flexWrap:'wrap', marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:'linear-gradient(135deg,#6366f1,#a855f7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🏢</div>
              <h1 style={{ fontSize:21, fontWeight:700, color:'#fff', letterSpacing:-0.3 }}>Agent Hierarchy</h1>
            </div>
            <button
              onClick={() => refetch(true)}
              disabled={loading}
              style={{
                padding:'9px 18px', borderRadius:9,
                border:'1.5px solid rgba(255,255,255,0.15)',
                background:'rgba(255,255,255,0.08)', color:'#e2e8f0',
                fontSize:13, fontWeight:600, cursor: loading ? 'wait' : 'pointer',
                display:'flex', alignItems:'center', gap:6, opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? '⏳ Loading…' : '↻ Refresh now'}
            </button>
          </div>

          {/* Interactive stat cards */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {topStats.map(s => {
              const isActive = s.key === 'total' ? !activeStatCard : activeStatCard === s.key
              return (
                <button key={s.key} onClick={() => handleStatCardClick(s)} style={{
                  background: isActive ? s.color : 'rgba(255,255,255,0.06)',
                  borderRadius:10, padding:'10px 16px',
                  border: isActive ? `2px solid ${s.color}` : '1.5px solid rgba(255,255,255,0.09)',
                  cursor:'pointer', textAlign:'left', transition:'all 0.15s', minWidth:90,
                  boxShadow: isActive ? `0 0 0 3px ${s.color}33` : 'none',
                }}>
                  <div style={{ fontSize:20, fontWeight:700, color: isActive ? '#fff' : s.color, lineHeight:1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize:10, color: isActive ? 'rgba(255,255,255,0.85)' : '#64748b', fontWeight:500, marginTop:4, whiteSpace:'nowrap' }}>
                    {s.label}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'22px 24px 0' }}>

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
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setActiveStatCard(null) }}
            style={{ padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:13, background:'#fff', color: filterStatus === 'All' ? '#94a3b8' : '#0f172a', cursor:'pointer', minWidth:170 }}
          >
            <option value="All">Filter by Status</option>
            {Object.keys(STATUS_CONFIG).filter(s => allAgents.some(a => a.status === s)).map(s =>
              <option key={s} value={s}>{s}</option>
            )}
          </select>
          <select
            value={filterTeam}
            onChange={e => setFilterTeam(e.target.value)}
            style={{ padding:'10px 12px', borderRadius:10, border:'1.5px solid #e2e8f0', fontSize:13, background:'#fff', color: filterTeam === 'All' ? '#94a3b8' : '#0f172a', cursor:'pointer', minWidth:170 }}
          >
            <option value="All">Filter by Team</option>
            {allTeams.filter(t => t !== 'All').map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {hasFilters && (
            <button onClick={clearFilters}
              style={{ padding:'10px 14px', borderRadius:10, border:'1.5px solid #fca5a5', background:'#fff', color:'#ef4444', fontSize:13, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
              ✕ Clear
            </button>
          )}
        </div>

        {/* Result info */}
        {!loading && !error && hasFilters && (
          <div style={{ fontSize:12, color:'#64748b', marginBottom:12 }}>
            Found <strong style={{ color:'#0f172a' }}>{matchingNames.size}</strong> agent{matchingNames.size !== 1 ? 's' : ''}
            {search && <span> matching "<strong style={{ color:'#0f172a' }}>{search}</strong>"</span>}
            {filterTeam !== 'All' && <span> in <strong style={{ color:'#0f172a' }}>{filterTeam}</strong></span>}
            {filterStatus !== 'All' && <span> · <strong style={{ color:'#0f172a' }}>{filterStatus}</strong></span>}
            <span style={{ color:'#94a3b8' }}> · dimmed cards show upline path only</span>
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
              <div style={{ fontSize:14 }}>No agents match your current filters.</div>
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

        <p style={{ fontSize:11, color:'#94a3b8', textAlign:'center', marginTop:16, lineHeight:1.7 }}>
          Click any card to expand details &nbsp;·&nbsp; +/− to expand downline &nbsp;·&nbsp; ↓ = total downline &nbsp;·&nbsp; Dimmed = upline path
        </p>
      </div>
    </div>
  )
}
