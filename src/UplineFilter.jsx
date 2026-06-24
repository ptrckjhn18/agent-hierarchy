import React, { useState, useRef, useEffect, useMemo } from 'react'

// Searchable combobox for Direct Upline (there are ~1,100 of them, so a plain
// <select> won't do). Empty query shows the biggest sections first.
export default function UplineFilter({ value, options, onChange }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQuery('') } }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? options.filter(o => o.name.toLowerCase().includes(q)) : options
    return list.slice(0, 60)
  }, [options, query])

  const selected = value !== 'All'
  const inputValue = open ? query : (selected ? value : '')

  function pick(name) { onChange(name); setOpen(false); setQuery('') }

  return (
    <div className="upline" ref={ref}>
      <span className="upline-icon">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7h18M6 12h12M10 17h4" />
        </svg>
      </span>
      <input
        className={'upline-input' + (selected && !open ? ' has-value' : '')}
        placeholder="Filter by direct upline…"
        value={inputValue}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
      />
      {selected && (
        <button className="upline-clear" onMouseDown={e => { e.preventDefault(); onChange('All'); setQuery('') }} aria-label="Clear upline filter">×</button>
      )}

      {open && (
        <div className="upline-menu">
          {filtered.length === 0 ? (
            <div className="saved-empty">No matching upline.</div>
          ) : filtered.map(o => (
            <button key={o.name} className={'upline-opt' + (o.name === value ? ' sel' : '')} onClick={() => pick(o.name)}>
              <span className="upline-opt-name">{o.name}</span>
              <span className="upline-opt-count">{o.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
