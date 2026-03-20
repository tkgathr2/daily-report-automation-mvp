# Testing: 簡単日報くん (Daily Report App)

## Overview
This app is a Google Apps Script (GAS) web app served via an iframe. The frontend is in `src/Index.html` and the backend is GAS functions in `src/Code.gs` and related `.gs` files.

## App Access
- **Production URL**: https://nippou.up.railway.app (redirects to GAS /exec URL)
- **GAS /exec URL**: `https://script.google.com/a/macros/takagi.bz/s/AKfycbyRu1Sye5cpmXqoqfGOI2BBReFh4cvqhkSr9CW7JS2XyhY7q32tv3A5gLG5rGwNtO5a4Q/exec`
- **Login**: Click "Googleでログイン" on Railway page, which redirects to GAS /exec with Google Workspace auth
- The app content runs inside a sandboxed GAS iframe — browser console JS cannot access the iframe's JS context directly

## Deployment
- **Automatic**: PRs to `devin/*` branches auto-merge via `auto-merge` workflow, then `deploy-gas.yml` runs `clasp push --force` + `clasp deploy`
- **Manual (if auto-deploy fails)**: Run `clasp push --force && clasp deploy --description "description"` from the repo root. Requires `~/.clasprc.json` with valid tokens.
- **Verify deployment**: The GAS iframe content can't be curled directly (requires auth). Verify by checking the app UI in the browser after deploy.
- **Note**: The `deploy-gas.yml` workflow may not always auto-trigger. If it doesn't, use manual clasp deploy.

## Devin Secrets Needed
- `GOOGLE_ACCOUNT_PASSWORD` — For clasp OAuth login if token expires
- `BACKLOG_API_KEY` — Backlog API key (stored in GAS ScriptProperties)
- `BACKLOG_SPACE_BASE_URL` — Backlog space URL (stored in GAS ScriptProperties)

## Testing the Pill Toggle UI
1. Navigate to the app via Railway URL or GAS /exec URL
2. After login, look for the "今日やったこと" section header
3. 5 pill-style toggles should be visible: Slack, Gmail, Gmail受信, Notion, Backlog
4. Active pills have colored borders (Slack=purple, Gmail=red, Notion=black, Backlog=green)
5. Inactive pills have gray borders (Gmail受信 is inactive by default)
6. Click a pill to toggle ON/OFF — state auto-saves to server
7. Reload page to verify persistence
8. Click green "取得" button to fetch data based on active pills

## Testing Tips
- The app is inside a GAS iframe with `sandbox` attribute — you cannot run JS in the iframe context from the parent page
- Page loads may show "読み込み中..." spinner while GAS backend processes
- The 取得 button fetches data from multiple services (Slack, Gmail, Notion, Backlog) — expect 10-15 second wait
- Backlog data appears as [Backlog] tagged entries in the text area
- If no completed tasks exist for the day, "本日完了した課題はありません" is shown

## Known Issues / Gotchas
- GAS iframe redirects may get stuck on "リダイレクト中..." — click the manual redirect link if this happens
- The `deploy-gas.yml` CI workflow requires a valid `CLASP_TOKEN` GitHub secret — if it expires, re-authenticate with `clasp login` and update the secret
- Race condition guard (`toolSettingsLoaded` flag) prevents pill toggles before settings load from server — pills won't respond to clicks during the first 1-2 seconds of page load (this is intentional)
