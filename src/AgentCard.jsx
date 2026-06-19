import React, { useState, useMemo, memo } from 'react'
import { STATUS_CONFIG, DEFAULT_STATUS } from './config'
import { getInitials, getCompColor, countDescendants } from './utils'

const AgentCard = memo(function AgentCard({ agent, depth, searchTerm, forceExpand }) {
  const isMatch     = agent.isMatch || false
  const shouldOpen  = depth < 1 || forceExpand || agent.forceExpand
  const [expanded, setExpanded]     = useState(shouldOpen)
  const [showDetail, setShowDetail] = useState(false)

  const hasChildren   = agent.children && agent.children.length > 0
  const status        = STATUS_CONFIG[agent.status] || DEFAULT_STATUS
  const compColor     = getCompColor(agent.compLevel)
  const downlineCount = useMemo(() => hasChildren ? countDescendants(agent) : 0, [agent, hasChildren])

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 24, position: 'relative' }}>
      {depth > 0 && (
        <>
          <div style={{ position:'absolute', left:-16, top:26, width:12, height:2, background:'#e2e8f0' }} />
          <div style={{ position:'absolute', left:-16, top:0,  width:2,  height:26, background:'#e2e8f0' }} />
        </>
      )}

      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, marginTop: depth === 0 ? 0 : 6 }}>
        {/* Toggle */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(e => !e)}
            style={{
              width:20, height:20, borderRadius:5,
              border:'1.5px solid #cbd5e1',
              background: expanded ? '#1e293b' : '#fff',
              color:      expanded ? '#fff'    : '#475569',
              cursor:'pointer', display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:13, fontWeight:700,
              flexShrink:0, lineHeight:1,
            }}
          >{expanded ? '−' : '+'}</button>
        ) : (
          <div style={{ width:20, flexShrink:0 }} />
        )}

        {/* Card */}
        <div
          onClick={() => setShowDetail(d => !d)}
          style={{
            display:'flex', alignItems:'center', gap:10,
            background: isMatch ? '#fffbeb' : '#fff',
            border: isMatch    ? '2px solid #f59e0b'
                  : showDetail ? '1.5px solid #6366f1'
                  :              '1.5px solid #e2e8f0',
            borderRadius:11, padding:'9px 12px',
            cursor:'pointer', flex:1, maxWidth:760,
            boxShadow: isMatch    ? '0 0 0 3px rgba(245,158,11,0.1)'
                     : showDetail ? '0 0 0 3px rgba(99,102,241,0.08)'
                     :              '0 1px 2px rgba(0,0,0,0.04)',
            transition:'border-color 0.12s, box-shadow 0.12s',
          }}
        >
          {/* Avatar */}
          <div style={{
            width:36, height:36, borderRadius:9, flexShrink:0,
            background:`linear-gradient(135deg,${compColor}20,${compColor}40)`,
            border:`2px solid ${compColor}50`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:12, fontWeight:700, color:compColor, letterSpacing:0.5,
          }}>
            {getInitials(agent.name)}
          </div>

          {/* Name + NPN */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:600, fontSize:13, color:'#0f172a', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {agent.name}
              {isMatch && searchTerm && (
                <span style={{ marginLeft:8, fontSize:10, background:'#fef3c7', color:'#92400e', borderRadius:4, padding:'1px 6px', fontWeight:600 }}>
                  MATCH
                </span>
              )}
            </div>
            <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{agent.npn}</div>
          </div>

          {/* Team */}
          {agent.team && agent.team !== '—' && (
            <div style={{ fontSize:11, color:'#475569', background:'#f1f5f9', borderRadius:20, padding:'2px 9px', flexShrink:0, whiteSpace:'nowrap' }}>
              {agent.team}
            </div>
          )}

          {/* Status */}
          <div style={{ display:'flex', alignItems:'center', gap:4, background:status.bg, borderRadius:20, padding:'2px 9px', flexShrink:0 }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:status.dot }} />
            <span style={{ fontSize:11, fontWeight:600, color:status.text, whiteSpace:'nowrap' }}>{agent.status}</span>
          </div>

          {/* Comp */}
          {agent.compLevel && agent.compLevel !== '—' && (
            <div style={{ background:`${compColor}15`, color:compColor, borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:700, flexShrink:0 }}>
              {agent.compLevel}
            </div>
          )}

          {hasChildren && (
            <div style={{ fontSize:11, color:'#94a3b8', flexShrink:0, minWidth:36, textAlign:'right' }}>
              {downlineCount}↓
            </div>
          )}

          <div style={{ fontSize:10, color:'#cbd5e1', flexShrink:0 }}>{showDetail ? '▲' : '▼'}</div>
        </div>
      </div>

      {/* Detail panel */}
      {showDetail && (
        <div style={{
          marginLeft:28, marginBottom:8,
          background:'#f8fafc', border:'1.5px solid #e2e8f0',
          borderRadius:10, padding:'12px 14px', maxWidth:732,
          display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 20px',
        }}>
          {[
            { label:'Email',             value: agent.email },
            { label:'Team',              value: agent.team },
            { label:'Comp Level',        value: agent.compLevel },
            { label:'NPN',               value: agent.npn },
            { label:'Status',            value: agent.status },
            { label:'Direct Upline',     value: agent.directUpline || '—' },
            { label:'Full Upline Chain', value: agent.uplines.length ? agent.uplines.join(' → ') : '—', full:true },
          ].map(item => (
            <div key={item.label} style={{ gridColumn: item.full ? '1 / -1' : 'auto' }}>
              <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, marginBottom:2 }}>
                {item.label}
              </div>
              <div style={{ fontSize:12, color:'#334155', fontWeight:500, wordBreak:'break-word', lineHeight:1.5 }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Children */}
      {expanded && hasChildren && (
        <div style={{ position:'relative' }}>
          <div style={{ position:'absolute', left:9, top:0, bottom:16, width:2, background:'#e2e8f0' }} />
          {agent.children.map(child => (
            <AgentCard
              key={child.name}
              agent={child}
              depth={depth + 1}
              searchTerm={searchTerm}
              forceExpand={child.forceExpand}
            />
          ))}
        </div>
      )}
    </div>
  )
})

export default AgentCard
