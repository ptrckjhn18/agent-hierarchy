import React, { useState, useEffect, useRef } from 'react'
import { STATUS_GROUPS } from './config'

const STORE_KEY = 'agentHierarchy.savedFilters.v1'

function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || [] }
  catch { return [] }
}
function persist(list) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

function describe(f) {
  const parts = []
  if (f.group && f.group !== 'all') parts.push(STATUS_GROUPS.find(g => g.key === f.group)?.label || f.group)
  if (f.team && f.team !== 'All') parts.push(f.team)
  if (f.search) parts.push(`“${f.search}”`)
  return parts.join(' · ') || 'No filters'
}

// Per-browser saved filters. Private to each user's browser; no backend.
export default function SavedFilters({ current, hasFilters, onApply }) {
  const [list, setList]   = useState(load)
  const [open, setOpen]   = useState(false)
  const [naming, setNaming] = useState(false)
  const [name, setName]   = useState('')
  const ref = useRef(null)

  useEffect(() => { persist(list) }, [list])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setNaming(false) } }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  function save() {
    const trimmed = name.trim()
    if (!trimmed) return
    setList(l => [
      { id: Date.now().toString(36), name: trimmed, search: current.search, team: current.team, group: current.group },
      ...l.filter(f => f.name !== trimmed),
    ])
    setName(''); setNaming(false)
  }
  function remove(id) { setList(l => l.filter(f => f.id !== id)) }

  return (
    <div className="saved" ref={ref}>
      <button className="btn btn-light" onClick={() => setOpen(o => !o)} title="Saved filters">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        Saved{list.length ? ` (${list.length})` : ''}
        <span className="caret" />
      </button>

      {open && (
        <div className="saved-menu">
          {naming ? (
            <div className="saved-name-row">
              <input
                autoFocus
                placeholder="Name this filter…"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setNaming(false); setName('') } }}
              />
              <button className="btn btn-primary" onClick={save} disabled={!name.trim()}>Save</button>
            </div>
          ) : (
            <button
              className="saved-add"
              onClick={() => setNaming(true)}
              disabled={!hasFilters}
              title={hasFilters ? 'Save the current filter' : 'Apply a filter first'}
            >
              + Save current filter
              {hasFilters && <span className="saved-add-desc">{describe(current)}</span>}
            </button>
          )}

          <div className="saved-list">
            {list.length === 0 ? (
              <div className="saved-empty">No saved filters yet.</div>
            ) : list.map(f => (
              <div className="saved-item" key={f.id}>
                <button className="saved-apply" onClick={() => { onApply(f); setOpen(false) }}>
                  <span className="saved-item-name">{f.name}</span>
                  <span className="saved-item-desc">{describe(f)}</span>
                </button>
                <button className="saved-del" onClick={() => remove(f.id)} aria-label={`Delete ${f.name}`}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
