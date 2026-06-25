import { useState, useEffect, useCallback, useRef } from 'react'
import { AGENTS_ENDPOINT } from './config'
import { agentsFromRows } from './utils'

export function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// Reads agents through the authenticated serverless proxy (never the sheet
// directly). A 401 means the session expired/was revoked → bounce to the gate.
export function useSheetData(token, onUnauthorized) {
  const [allAgents, setAllAgents]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchSheet = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true)
    try {
      const res = await fetch(AGENTS_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.status === 401) { onUnauthorized?.(); return }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      const parsed = agentsFromRows(json.values)
      if (parsed.length === 0) throw new Error("Sheet appears empty or headers don't match.")
      setAllAgents(parsed)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError(e.message || 'Could not load data.')
    } finally {
      setLoading(false)
    }
  }, [token, onUnauthorized])

  // Load once on mount. No polling — data changes infrequently and is refreshed
  // on demand via the Refresh button, which keeps serverless usage minimal.
  useEffect(() => { fetchSheet() }, [fetchSheet])

  return { allAgents, loading, error, lastUpdated, refetch: fetchSheet }
}

// Signs the user out after `timeoutMs` of no activity (mouse/keyboard/touch/
// tab-return). Security measure for PII left open on an unattended screen.
export function useIdleTimeout(enabled, timeoutMs, onIdle) {
  const onIdleRef = useRef(onIdle)
  onIdleRef.current = onIdle

  useEffect(() => {
    if (!enabled) return
    let timer
    const reset = () => {
      clearTimeout(timer)
      timer = setTimeout(() => onIdleRef.current(), timeoutMs)
    }
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    const onVisible = () => { if (document.visibilityState === 'visible') reset() }
    document.addEventListener('visibilitychange', onVisible)

    reset() // start the clock
    return () => {
      clearTimeout(timer)
      events.forEach(e => window.removeEventListener(e, reset))
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [enabled, timeoutMs])
}
