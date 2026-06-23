import React, { useState, useMemo } from 'react'
import { STATUS_CONFIG, STATUS_GROUPS, STATUS_TO_GROUP } from './config'
import { buildFullTree, pruneToMatches, timeAgo } from './utils'
import { useDebounce, useSheetData } from './hooks'
import { ExpandAllContext } from './context'
import AgentCard from './AgentCard'

export default function App() {
  const { allAgents, loading, error, lastUpdated, refetch } = useSheetData()

  const [searchInput, setSearchInput] = useState('')
  const [filterStatus, setFilterStatus] = useState('All') // granular dropdown
  const [filterTeam, setFilterTeam]     = useState('All')
  const [activeGroup, setActiveGroup]   = useState('all')  // stat-card bucket
  const [expandAll, setExpandAll]       = useState({ version: 0, expanded: null })

  const search = useDebounce(searchInput, 350)

  // Build the full tree ONCE — never rebuild on filter changes
  const { roots } = useMemo(() => buildFullTree(allAgents), [allAgents])

  const allTeams = useMemo(() =>
    [...new Set(allAgents.map(a => a.team).filter(t => t && t !== '—'))].sort(),
    [allAgents]
  )

  // Counts per grouped bucket (drives the four stat cards)
  const groupCounts = useMemo(() => {
    const counts = { all: allAgents.length, active: 0, inactive: 0, terminated: 0 }
    allAgents.forEach(a => {
      const g = STATUS_TO_GROUP[a.status]
      if (g) counts[g] += 1
    })
    return counts
  }, [allAgents])

  // Statuses actually present, for the granular dropdown
  const presentStatuses = useMemo(() =>
    Object.keys(STATUS_CONFIG)
      .filter(s => allAgents.some(a => a.status === s))
      .concat([...new Set(allAgents.map(a => a.status))].filter(s => s && s !== '—' && !STATUS_CONFIG[s]))
      .filter((s, i, arr) => arr.indexOf(s) === i),
    [allAgents]
  )

  function selectGroup(key) {
    setFilterStatus('All')
    setActiveGroup(prev => (key !== 'all' && prev === key ? 'all' : key))
  }

  function onStatusChange(value) {
    setFilterStatus(value)
    setActiveGroup(value === 'All' ? 'all' : null) // a specific status deselects the cards
  }

  function doExpandAll(expanded) {
    setExpandAll(s => ({ version: s.version + 1, expanded }))
  }

  // Active filters (group counts as a filter only when it's a real bucket)
  const groupActive = activeGroup && activeGroup !== 'all'
  const hasFilters  = !!search || filterStatus !== 'All' || filterTeam !== 'All' || groupActive

  // Agents that pass current filters — used for pruning the tree
  const matchingNames = useMemo(() => {
    if (!hasFilters) return null

    const sl = search.toLowerCase()
    const groupStatuses = groupActive
      ? new Set(STATUS_GROUPS.find(g => g.key === activeGroup).statuses)
      : null

    const names = new Set()
    allAgents.forEach(a => {
      const mSearch = !search
        || a.name.toLowerCase().includes(sl)
        || a.npn.toLowerCase().includes(sl)
        || a.email.toLowerCase().includes(sl)
      const mStatus = filterStatus === 'All' || a.status === filterStatus
      const mGroup  = !groupStatuses || groupStatuses.has(a.status)
      const mTeam   = filterTeam === 'All' || a.team === filterTeam
      if (mSearch && mStatus && mGroup && mTeam) names.add(a.name)
    })
    return names
  }, [allAgents, search, filterStatus, filterTeam, activeGroup, groupActive, hasFilters])

  const tree = useMemo(
    () => (matchingNames ? pruneToMatches(roots, matchingNames) : roots),
    [roots, matchingNames]
  )

  const clearFilters = () => {
    setSearchInput('')
    setFilterStatus('All')
    setFilterTeam('All')
    setActiveGroup('all')
  }

  const updatedLabel = timeAgo(lastUpdated)
  const activeGroupMeta = groupActive ? STATUS_GROUPS.find(g => g.key === activeGroup) : null

  return (
    <div className="app">
      {/* ---------- HEADER ---------- */}
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-logo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="2.4" />
                <circle cx="5" cy="18" r="2.4" />
                <circle cx="19" cy="18" r="2.4" />
                <path d="M12 7.4v4.3M12 11.7H5.5a1 1 0 0 0-1 1v2.9M12 11.7h6.5a1 1 0 0 1 1 1v2.9" />
              </svg>
            </span>
            <div>
              <div className="brand-title">Agent Hierarchy</div>
              <div className="brand-sub">Pinnacle Life Group · downline explorer</div>
            </div>
          </div>

          <div className="header-actions">
            {!loading && !error && updatedLabel && (
              <span className="updated">
                <span className={'updated-dot' + (lastUpdated && Date.now() - lastUpdated.getTime() > 120000 ? ' stale' : '')} />
                Updated {updatedLabel}
              </span>
            )}
            <button className="btn btn-ghost-dark" onClick={() => refetch(true)} disabled={loading}>
              {loading ? '⏳ Loading…' : '↻ Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* ---------- BODY ---------- */}
      <div className="container">
        {/* Stat cards */}
        <div className="stat-grid">
          {STATUS_GROUPS.map(g => {
            const value = groupCounts[g.key] ?? 0
            const isActive = activeGroup === g.key && filterStatus === 'All'
            const pct = g.key !== 'all' && groupCounts.all
              ? Math.round((value / groupCounts.all) * 100)
              : null
            return (
              <button
                key={g.key}
                className={'stat-card' + (isActive ? ' active' : '')}
                style={{ '--accent': g.color }}
                onClick={() => selectGroup(g.key)}
              >
                <div className="stat-top">
                  <span className="stat-label">{g.label}</span>
                  <span className="stat-icon">{g.icon}</span>
                </div>
                <div className="stat-value">{value.toLocaleString()}</div>
                <div className="stat-meta">
                  {g.key === 'all'
                    ? 'across all statuses'
                    : <>{pct}% of all agents</>}
                </div>
              </button>
            )
          })}
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="search">
            <span className="search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by name, NPN, or email…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            {searchInput && (
              <button className="search-clear" onClick={() => setSearchInput('')} aria-label="Clear search">×</button>
            )}
          </div>

          <div className="select-wrap">
            <select
              className={'select' + (filterStatus === 'All' ? ' placeholder' : '')}
              value={filterStatus}
              onChange={e => onStatusChange(e.target.value)}
            >
              <option value="All">All statuses</option>
              {presentStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="select-wrap">
            <select
              className={'select' + (filterTeam === 'All' ? ' placeholder' : '')}
              value={filterTeam}
              onChange={e => setFilterTeam(e.target.value)}
            >
              <option value="All">All teams</option>
              {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="seg">
            <button onClick={() => doExpandAll(true)} title="Expand entire tree">⊕ Expand</button>
            <button onClick={() => doExpandAll(false)} title="Collapse entire tree">⊖ Collapse</button>
          </div>

          {hasFilters && (
            <button className="btn btn-danger" onClick={clearFilters}>✕ Clear</button>
          )}
        </div>

        {/* Result summary */}
        {!loading && !error && hasFilters && matchingNames && (
          <div className="result-bar">
            <span>Found <b>{matchingNames.size.toLocaleString()}</b> agent{matchingNames.size !== 1 ? 's' : ''}</span>
            {search && <span className="chip">“{search}”</span>}
            {activeGroupMeta && (
              <span className="chip"><span className="dot" style={{ background: activeGroupMeta.color }} />{activeGroupMeta.label}</span>
            )}
            {filterStatus !== 'All' && <span className="chip">{filterStatus}</span>}
            {filterTeam !== 'All' && <span className="chip">{filterTeam}</span>}
            <span className="hint">· dimmed cards show the upline path only</span>
          </div>
        )}

        {/* Tree */}
        <div className="tree-card">
          {loading ? (
            <div className="state">
              <div className="spinner" />
              <div className="state-title">Loading from Google Sheets…</div>
              <div className="state-sub">This may take a moment for large sheets</div>
            </div>
          ) : error ? (
            <div className="state error">
              <div className="state-icon">⚠️</div>
              <div className="state-title">{error}</div>
              <div className="state-sub">
                Make sure your sheet is shared:<br />
                <strong>Share → Anyone with the link → Viewer</strong>
              </div>
              <button className="btn btn-light" style={{ marginTop: 16 }} onClick={() => refetch(true)}>Try again</button>
            </div>
          ) : tree.length === 0 ? (
            <div className="state">
              <div className="state-icon">🔍</div>
              <div className="state-title">No agents match your filters</div>
              <button className="btn btn-light" style={{ marginTop: 14 }} onClick={clearFilters}>Clear filters</button>
            </div>
          ) : (
            <ExpandAllContext.Provider value={expandAll}>
              {tree.map(root => (
                <AgentCard key={root.name} agent={root} depth={0} searchTerm={search} />
              ))}
            </ExpandAllContext.Provider>
          )}
        </div>

        <p className="footnote">
          Click a card for details &nbsp;·&nbsp; <kbd>+</kbd>/<kbd>−</kbd> toggles a downline &nbsp;·&nbsp; <b>n↓</b> = total downline &nbsp;·&nbsp; dimmed = upline path
        </p>
      </div>
    </div>
  )
}
