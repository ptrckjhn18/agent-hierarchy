# Security setup — private sheet + authenticated proxy

This app no longer reads the Google Sheet directly from the browser. Instead:

```
Browser ──(password)──► /login function ──► issues a signed session token
Browser ──(token)─────► /agents function ──► reads the PRIVATE sheet via a
                                              Google service account ──► returns data
```

Result: the sheet is **private**, the data is only reachable through the
authenticated function, and the password is validated **on the server** (never
shipped to the browser).

Follow these steps **in order**. Do the "make the sheet private" step **last** —
that's the switch that would break the old public version, so everything else
must be working first.

---

## 1. Create a Google service account (one time, ~10 min)

1. Go to <https://console.cloud.google.com/> and create a project (e.g. "agent-hierarchy").
2. **APIs & Services → Library →** search **Google Sheets API → Enable**.
3. **APIs & Services → Credentials → Create credentials → Service account.**
   - Name it (e.g. "sheet-reader"), Create, skip the optional roles, Done.
4. Open the new service account → **Keys → Add key → Create new key → JSON.**
   A `.json` file downloads. Open it; you'll need two values:
   - `client_email`  (looks like `sheet-reader@your-project.iam.gserviceaccount.com`)
   - `private_key`   (a long `-----BEGIN PRIVATE KEY-----…` block)

## 2. Share the sheet with the service account (read-only)

In the Google Sheet → **Share** → paste the service account's `client_email`
→ set role to **Viewer** → Send. (No email actually gets sent; it just grants
the service account read access.)

> Don't change the public sharing yet — that's step 6.

## 3. Set Netlify environment variables

Netlify dashboard → your site → **Site configuration → Environment variables** →
add these (mark them "Secret"):

| Key | Value |
|---|---|
| `ACCESS_PASSWORD` | the team password you want everyone to type |
| `SESSION_SECRET` | a long random string (e.g. run `openssl rand -base64 32`) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | the `client_email` from the JSON |
| `GOOGLE_PRIVATE_KEY` | the full `private_key` from the JSON (see note) |
| `SHEET_ID` | `1-2BMyb3i2G8ivhUnkIHJmC8Y1FOuooX7ioOUPgevcgo` |
| `SHEET_RANGE` | `AgentsInfo` |

**`GOOGLE_PRIVATE_KEY` note:** paste it exactly as in the JSON. If your JSON shows
the key with literal `\n` sequences, paste it with those `\n` intact — the
function converts `\n` back into real newlines. If you paste a real multi-line
key, that also works.

## 4. Deploy

Push to `main` (or trigger a deploy). Netlify will build the site **and** the two
functions in `netlify/functions/`. No build config changes needed — `netlify.toml`
already points at them.

## 5. Test on the deployed site

1. Open the site → you should see the **password screen**.
2. Wrong password → "Incorrect password." Correct password → the dashboard loads.
3. If the dashboard shows a data error, open **Netlify → Functions → agents → logs**;
   the error usually says which env var is missing or that the sheet isn't shared
   with the service account.

## 6. Make the sheet PRIVATE (the actual lockdown — do this last)

Once step 5 works through the service account, remove public access so the data
is no longer reachable without the proxy:

- Google Sheet → **Share** → change **"Anyone with the link"** to **Restricted**.
- Keep the service account (Viewer) and your own team's Google accounts.

The app keeps working (it reads via the service account), but the raw CSV URL now
returns "You need access" to everyone else. **The PII is no longer public.**

---

## Local development

`vite dev` does **not** run Netlify Functions, so this repo includes a dev-only
mock (in `vite.config.js`) that stands in for `/login` and `/agents`:

- Dev password defaults to **`pinnacle`** (override with `DEV_PASSWORD=… npm run dev`).
- The mock's `/agents` reads the sheet via the old public CSV — so it only works
  while the sheet is still public (before step 6) **or** if you point it elsewhere.

To run the **real** functions locally after the sheet is private, use the Netlify
CLI instead of `vite dev`:

```bash
npm i -g netlify-cli
netlify dev          # serves the app + functions; reads env vars from Netlify
```

## Rotating the password

Change `ACCESS_PASSWORD` in Netlify and redeploy. To force everyone to re-login
immediately, also change `SESSION_SECRET` (that invalidates all existing tokens).

## What this protects — and what it doesn't

- ✅ The sheet is private; data is only served by the authenticated function.
- ✅ The password is checked server-side and never shipped to the browser.
- ✅ Sessions expire after 12h and can be revoked by rotating `SESSION_SECRET`.
- ⚠️ It's a single shared team password, not per-user accounts. Anyone with the
  password can view everything. If you later need per-person access, audit logs,
  or revoking one person, that's the next step up (e.g. Netlify Identity / SSO).
