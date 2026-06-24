import { useState, useEffect, useCallback } from 'react'
import { AGENTS_ENDPOINT, POLL_MS } from './config'
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

  useEffect(() => {
    fetchSheet()
    const t = setInterval(() => fetchSheet(), POLL_MS)
    return () => clearInterval(t)
  }, [fetchSheet])

  return { allAgents, loading, error, lastUpdated, refetch: fetchSheet }
}
