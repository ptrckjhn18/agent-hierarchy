import React, { useEffect } from 'react'
import { STATUS_CONFIG, DEFAULT_STATUS } from './config'

// Modal listing agents that share a name with another agent (distinct NPNs).
// Helps clean the sheet: rename one side so downlines wire to the right person.
export default function ConflictsPanel({ conflicts, onClose, onInspect }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const risky = conflicts.filter(c => c.usedAsUpline).length

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <div className="modal-title">⚠ Name conflicts</div>
            <div className="modal-sub">
              {conflicts.length} name{conflicts.length !== 1 ? 's' : ''} shared by different agents
              {risky > 0 && <> · <b className="risk-text">{risky} used as an upline</b> (can mis-wire downlines)</>}
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-body">
          {conflicts.length === 0 ? (
            <div className="saved-empty" style={{ padding: 24 }}>No name conflicts — every agent name is unique. 🎉</div>
          ) : conflicts.map(c => (
            <div className="conflict" key={c.name}>
              <div className="conflict-head">
                <span className="conflict-name">{c.name}</span>
                {c.usedAsUpline
                  ? <span className="conflict-flag risk">used as upline</span>
                  : <span className="conflict-flag ok">not an upline</span>}
              </div>
              <div className="conflict-rows">
                {c.agents.map(a => {
                  const s = STATUS_CONFIG[a.status] || DEFAULT_STATUS
                  return (
                    <button className="conflict-row" key={a.key || a.npn} onClick={() => onInspect && onInspect(a)} title="Search for this agent">
                      <span className="conflict-npn">NPN {a.npn}</span>
                      <span className="pill" style={{ background: s.bg, color: s.text }}>
                        <span className="dot" style={{ background: s.dot }} />{a.status}
                      </span>
                      {a.team && a.team !== '—' && <span className="pill pill-team">{a.team}</span>}
                      <span className="conflict-upline">▲ {a.directUpline || '—'}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="modal-foot">
          Fix in the Google Sheet by renaming one side (e.g. add a middle initial), then Refresh.
        </div>
      </div>
    </div>
  )
}
