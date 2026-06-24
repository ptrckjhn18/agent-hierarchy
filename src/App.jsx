import React, { useState, useMemo, useEffect } from 'react'
import { STATUS_GROUPS, STATUS_TO_GROUP } from './config'
import { buildFullTree, pruneToMatches, findNameConflicts, agentKey, timeAgo } from './utils'
import { useDebounce, useSheetData } from './hooks'
import { ExpandAllContext } from './context'
import AgentCard from './AgentCard'
import SavedFilters from './SavedFilters'
import ConflictsPanel from './ConflictsPanel'
import UplineFilter from './UplineFilter'

export default function App() {
  const { allAgents, loading, error, lastUpdated, refetch } = useSheetData()

  const [searchInput, setSearchInput] = useState('')
  const [filterTeam, setFilterTeam]   = useState('All')
  const [filterUpline, setFilterUpline] = useState('All')
  const [activeGroup, setActiveGroup] = useState('all') // stat-card bucket drives status filtering
  const [showFull, setShowFull]       = useState(false) // full-hierarchy vs strict filtering
  const [conflictsOpen, setConflictsOpen] = useState(false)
  const [expandAll, setExpandAll]     = useState({ version: 0, expanded: null })

  const search = useDebounce(searchInput, 350)

  // Build the full tree ONCE — never rebuild on filter changes
  const { roots } = useMemo(() => buildFullTree(allAgents), [allAgents])

  const allTeams = useMemo(() =>
    [...new Set(allAgents.map(a => a.team).filter(t => t && t !== '—'))].sort(),
    [allAgents]
  )

  // Direct uplines that actually have reports, biggest sections first
  const uplineOptions = useMemo(() => {
    const counts = new Map()
    allAgents.forEach(a => {
      const u = a.directUpline
      if (u) counts.set(u, (counts.get(u) || 0) + 1)
    })
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [allAgents])

  const groupCounts = useMemo(() => {
    const counts = { all: allAgents.length, active: 0, inactive: 0, terminated: 0 }
    allAgents.forEach(a => {
      const g = STATUS_TO_GROUP[a.status]
      if (g) counts[g] += 1
    })
    return counts
  }, [allAgents])

  const conflicts = useMemo(() => findNameConflicts(allAgents), [allAgents])

  function selectGroup(key) {
    setActiveGroup(prev => (key !== 'all' && prev === key ? 'all' : key))
  }
  function doExpandAll(expanded) {
    setExpandAll(s => ({ version: s.version + 1, expanded }))
  }

  const groupActive = activeGroup && activeGroup !== 'all'
  const hasFilters  = !!search || filterTeam !== 'All' || filterUpline !== 'All' || groupActive

  // Keys of agents that pass current filters — used for pruning the tree
  const matchingKeys = useMemo(() => {
    if (!hasFilters) return null
    const sl = search.toLowerCase()
    const groupStatuses = groupActive
      ? new Set(STATUS_GROUPS.find(g => g.key === activeGroup).statuses)
      : null

    const keys = new Set()
    allAgents.forEach(a => {
      const mSearch = !search
        || a.name.toLowerCase().includes(sl)
        || a.npn.toLowerCase().includes(sl)
        || a.email.toLowerCase().includes(sl)
      const mGroup  = !groupStatuses || groupStatuses.has(a.status)
      const mTeam   = filterTeam === 'All' || a.team === filterTeam
      const mUpline = filterUpline === 'All' || a.directUpline === filterUpline
      if (mSearch && mGroup && mTeam && mUpline) keys.add(agentKey(a))
    })
    return keys
  }, [allAgents, search, filterTeam, filterUpline, activeGroup, groupActive, hasFilters])

  const tree = useMemo(
    () => (matchingKeys ? pruneToMatches(roots, matchingKeys, !showFull) : roots),
    [roots, matchingKeys, showFull]
  )

  // Signature of the current view; changing it remounts the tree so node
  // expansion re-initialises correctly (strict view opens all, full view doesn't).
  const treeKey = hasFilters
    ? `${search}|${filterTeam}|${filterUpline}|${activeGroup}|${showFull ? 'full' : 'strict'}`
    : 'all'
  // While filtering, open every node so matches (and, in full mode, the revealed
  // off-filter agents) are visible without manual drilling.
  const strictExpand = hasFilters

  // Reset any sticky expand/collapse-all when the filter view changes
  useEffect(() => { setExpandAll({ version: 0, expanded: null }) }, [treeKey])
  // Each new filter starts clean (strict); the full-hierarchy toggle is per-view
  useEffect(() => { setShowFull(false) }, [search, filterTeam, filterUpline, activeGroup])

  const clearFilters = () => {
    setSearchInput(''); setFilterTeam('All'); setFilterUpline('All'); setActiveGroup('all'); setShowFull(false)
  }
  const applySaved = f => {
    setSearchInput(f.search || ''); setFilterTeam(f.team || 'All')
    setFilterUpline(f.upline || 'All'); setActiveGroup(f.group || 'all')
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
            {!loading && !error && conflicts.length > 0 && (
              <button className="btn btn-warn" onClick={() => setConflictsOpen(true)} title="Agents sharing a name">
                ⚠ {conflicts.length} name{conflicts.length !== 1 ? 's' : ''}
              </button>
            )}
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
        {/* Stat cards — the status filter */}
        <div className="stat-grid">
          {STATUS_GROUPS.map((g, i) => {
            const value = groupCounts[g.key] ?? 0
            const isActive = activeGroup === g.key
            const pct = g.key !== 'all' && groupCounts.all
              ? Math.round((value / groupCounts.all) * 100) : null
            return (
              <button
                key={g.key}
                className={'stat-card' + (isActive ? ' active' : '')}
                style={{ '--accent': g.color, animationDelay: `${i * 60}ms` }}
                onClick={() => selectGroup(g.key)}
                aria-pressed={isActive}
              >
                <div className="stat-top">
                  <span className="stat-label">{g.label}</span>
                  <span className="stat-icon">{g.icon}</span>
                </div>
                <div className="stat-value">{value.toLocaleString()}</div>
                <div className="stat-meta">
                  {g.key === 'all' ? 'across all statuses' : <>{pct}% of all agents</>}
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
              className={'select' + (filterTeam === 'All' ? ' placeholder' : '')}
              value={filterTeam}
              onChange={e => setFilterTeam(e.target.value)}
            >
              <option value="All">All teams</option>
              {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <UplineFilter value={filterUpline} options={uplineOptions} onChange={setFilterUpline} />

          <SavedFilters
            current={{ search, team: filterTeam, upline: filterUpline, group: activeGroup }}
            hasFilters={hasFilters}
            onApply={applySaved}
          />

          <div className="seg">
            <button onClick={() => doExpandAll(true)} title="Expand entire tree">⊕ Expand</button>
            <button onClick={() => doExpandAll(false)} title="Collapse entire tree">⊖ Collapse</button>
          </div>

          {hasFilters && (
            <button className="btn btn-danger" onClick={clearFilters}>✕ Clear</button>
          )}
        </div>

        {/* Result summary */}
        {!loading && !error && hasFilters && matchingKeys && (
          <div className="result-bar">
            <span>Found <b>{matchingKeys.size.toLocaleString()}</b> agent{matchingKeys.size !== 1 ? 's' : ''}</span>
            {search && <span className="chip">“{search}”</span>}
            {activeGroupMeta && (
              <span className="chip"><span className="dot" style={{ background: activeGroupMeta.color }} />{activeGroupMeta.label}</span>
            )}
            {filterTeam !== 'All' && <span className="chip">{filterTeam}</span>}
            {filterUpline !== 'All' && <span className="chip">▲ {filterUpline}</span>}

            <label className="switch" title="Reveal the complete downline under matched agents">
              <input type="checkbox" checked={showFull} onChange={e => setShowFull(e.target.checked)} />
              <span className="switch-track"><span className="switch-thumb" /></span>
              Show full hierarchy
            </label>
            <span className="hint">{showFull ? '· off-filter agents shown' : '· faded cards = upline path'}</span>
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
              <div key={treeKey}>
                {tree.map(root => (
                  <AgentCard key={root.key} agent={root} depth={0} searchTerm={search} strictExpand={strictExpand} />
                ))}
              </div>
            </ExpandAllContext.Provider>
          )}
        </div>

        <p className="footnote">
          Click a card for details &nbsp;·&nbsp; <kbd>+</kbd>/<kbd>−</kbd> toggles a downline &nbsp;·&nbsp; <b>n↓</b> = total downline &nbsp;·&nbsp; faded = upline path
        </p>
      </div>

      {conflictsOpen && (
        <ConflictsPanel
          conflicts={conflicts}
          onClose={() => setConflictsOpen(false)}
          onInspect={a => { setConflictsOpen(false); setActiveGroup('all'); setFilterTeam('All'); setSearchInput(a.npn) }}
        />
      )}
    </div>
  )
}
