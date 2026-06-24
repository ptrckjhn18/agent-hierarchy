import React, { useState, useEffect, useContext, memo } from 'react'
import { STATUS_CONFIG, DEFAULT_STATUS } from './config'
import { getInitials, getCompColor } from './utils'
import { ExpandAllContext } from './context'

const AgentCard = memo(function AgentCard({ agent, depth, searchTerm, forceExpand }) {
  const isMatch    = agent.isMatch    || false
  const isPathNode = agent.isPathNode || false

  // Path nodes auto-expand so the matched agent is always visible
  const [expanded, setExpanded] = useState(isPathNode || forceExpand || depth < 1)
  const [showDetail, setShowDetail] = useState(false)

  // Path nodes must stay open so the matched descendant below them is visible —
  // even when this instance was first mounted (and initialised collapsed) as a
  // normal node before the filter turned it into a path node.
  useEffect(() => {
    if (isPathNode) setExpanded(true)
  }, [isPathNode])

  // React to global expand-all / collapse-all
  const expandAll = useContext(ExpandAllContext)
  useEffect(() => {
    if (expandAll.expanded !== null) setExpanded(expandAll.expanded)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandAll.version])

  const hasChildren   = agent.children && agent.children.length > 0
  const status        = STATUS_CONFIG[agent.status] || DEFAULT_STATUS
  const compColor     = getCompColor(agent.compLevel)
  const downlineCount = agent.descendantCount || 0

  const cardClass =
    'card' +
    (isPathNode ? ' path' : ' clickable') +
    (isMatch ? ' match' : showDetail ? ' open' : '')

  return (
    <div className={'node' + (depth > 0 ? ' child' : '')}>
      {depth > 0 && (
        <>
          <span className="node-connector-h" />
          <span className="node-connector-v" />
        </>
      )}

      <div className={'node-row' + (depth > 0 ? ' child' : '')}>
        {/* Expand toggle */}
        {hasChildren ? (
          <button
            className={'toggle' + (expanded ? ' open' : '') + (isPathNode ? ' path' : '')}
            onClick={() => setExpanded(e => !e)}
            aria-label={expanded ? 'Collapse downline' : 'Expand downline'}
          >{expanded ? '−' : '+'}</button>
        ) : (
          <span className="toggle-spacer" />
        )}

        {/* Card */}
        <div className={cardClass} onClick={() => !isPathNode && setShowDetail(d => !d)}>
          <div className="avatar" style={{
            background: `linear-gradient(135deg, ${compColor}1f, ${compColor}3d)`,
            border: `2px solid ${compColor}55`, color: compColor,
          }}>
            {getInitials(agent.name)}
          </div>

          <div className="card-main">
            <div className="card-name">
              {agent.name}
              {isMatch && searchTerm && <span className="match-tag">MATCH</span>}
            </div>
            <div className="card-npn">{agent.npn}</div>
          </div>

          {agent.team && agent.team !== '—' && (
            <span className="pill pill-team">{agent.team}</span>
          )}

          <span className="pill" style={{ background: status.bg, color: status.text }}>
            <span className="dot" style={{ background: status.dot }} />
            {agent.status}
          </span>

          {agent.compLevel && agent.compLevel !== '—' && (
            <span className="pill pill-comp" style={{ background: `${compColor}1a`, color: compColor }}>
              {agent.compLevel}
            </span>
          )}

          {hasChildren && <span className="downline">{downlineCount}↓</span>}
          {!isPathNode && <span className="chevron">{showDetail ? '▲' : '▼'}</span>}
        </div>
      </div>

      {/* Detail panel */}
      {showDetail && !isPathNode && (
        <div className="detail">
          {[
            { label: 'Email',             value: agent.email },
            { label: 'Team',              value: agent.team },
            { label: 'Comp Level',        value: agent.compLevel },
            { label: 'NPN',               value: agent.npn },
            { label: 'Status',            value: agent.status },
            { label: 'Direct Upline',     value: agent.directUpline || '—' },
            { label: 'Full Upline Chain', value: agent.uplines.length ? agent.uplines.join(' → ') : '—', full: true },
          ].map(item => (
            <div key={item.label} className={'detail-item' + (item.full ? ' full' : '')}>
              <div className="detail-k">{item.label}</div>
              <div className="detail-v">{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Children */}
      {expanded && hasChildren && (
        <div className="node-children">
          {agent.children.map(child => (
            <AgentCard
              key={child.key}
              agent={child}
              depth={depth + 1}
              searchTerm={searchTerm}
              forceExpand={child.isPathNode}
            />
          ))}
        </div>
      )}
    </div>
  )
})

export default AgentCard
