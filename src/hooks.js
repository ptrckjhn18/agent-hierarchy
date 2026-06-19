import { useState, useEffect, useCallback } from 'react'
import { CSV_URL, POLL_MS } from './config'
import { parseCSV } from './utils'

export function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function useSheetData() {
  const [allAgents, setAllAgents]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchSheet = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true)
    try {
      const res = await fetch(CSV_URL + '&cb=' + Date.now())
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      const parsed = parseCSV(text)
      if (parsed.length === 0) throw new Error("Sheet appears empty or headers don't match.")
      setAllAgents(parsed)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError(e.message || 'Could not load sheet.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSheet()
    const t = setInterval(() => fetchSheet(), POLL_MS)
    return () => clearInterval(t)
  }, [fetchSheet])

  return { allAgents, loading, error, lastUpdated, refetch: fetchSheet }
}
