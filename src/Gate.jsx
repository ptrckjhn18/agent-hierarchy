import React, { useState } from 'react'
import { LOGIN_ENDPOINT } from './config'

// Password gate. The password is sent to the server, validated there, and
// exchanged for a short-lived session token — it is never checked client-side.
export default function Gate({ onAuthed }) {
  const [pw, setPw]     = useState('')
  const [err, setErr]   = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!pw || busy) return
    setBusy(true); setErr('')
    try {
      const res = await fetch(LOGIN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      })
      if (res.status === 401) { setErr('Incorrect password.'); setPw(''); setBusy(false); return }
      if (!res.ok) { setErr('Sign-in is unavailable right now. Please try again.'); setBusy(false); return }
      const data = await res.json()
      onAuthed({ token: data.token, exp: data.exp })
    } catch {
      setErr('Network error. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <span className="gate-logo">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="2.4" />
            <circle cx="5" cy="18" r="2.4" />
            <circle cx="19" cy="18" r="2.4" />
            <path d="M12 7.4v4.3M12 11.7H5.5a1 1 0 0 0-1 1v2.9M12 11.7h6.5a1 1 0 0 1 1 1v2.9" />
          </svg>
        </span>
        <div className="gate-title">Agent Hierarchy</div>
        <div className="gate-sub">Pinnacle Life Group · internal tool</div>

        <label className="gate-label" htmlFor="gate-pw">Team password</label>
        <input
          id="gate-pw"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Enter password…"
          value={pw}
          onChange={e => { setPw(e.target.value); setErr('') }}
          className={'gate-input' + (err ? ' error' : '')}
        />
        {err && <div className="gate-error">{err}</div>}

        <button type="submit" className="gate-btn" disabled={busy || !pw}>
          {busy ? 'Checking…' : 'Unlock'}
        </button>

        <div className="gate-note">🔒 This page contains private member data. Authorized team members only.</div>
      </form>
    </div>
  )
}
