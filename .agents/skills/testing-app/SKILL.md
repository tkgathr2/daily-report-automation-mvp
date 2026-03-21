# Testing & Deployment for daily-report-automation-mvp

## Architecture
- **Frontend**: Google Apps Script (GAS) web app served via `Index.html`
- **Backend**: GAS server-side code (`Code.gs`, `backlog_report.gs`)
- **Proxy**: Railway app at `https://nippou.up.railway.app` redirects to GAS exec URL
- **GAS Script ID**: `1BkBflFikzsT4yiQr6NWzCbWwcTkwKV2PmBqKlPgwBuO67es-2TVeC5AZ`

## Deploying Changes
1. Push code to `master` (via PR merge)
2. Deploy GAS:
   ```bash
   cd /home/ubuntu/repos/daily-report-automation-mvp
   npx @google/clasp push
   npx @google/clasp deploy --description "vXXX: description"
   ```
3. The deploy creates a new version. Note the version number from output.
4. Changes are immediately live at the production URL after deploy.

## Testing in Production
- **URL**: `https://nippou.up.railway.app`
- The app runs inside a cross-origin iframe (GAS sandbox). Cannot use JS console to interact with iframe content.
- **Navigation**: Click inside the iframe area first, then use scroll to navigate within the app.
- **Key UI sections** (top to bottom):
  1. Title bar (簡単日報君 v4.0)
  2. Tool toggles (Slack送信/受信, Gmail送信/受信, Backlog)
  3. Editor area (今日やったこと)
  4. Other editor sections (わかった事, 売上, 次すること)
  5. Copy/Preview buttons
  6. **Date picker** (年/月/日 dropdowns + 前日/翌日 buttons)
  7. 予定を取得 button (triggers data fetch)
  8. 残業時間
  9. Slack送信 section

## Date Picker Testing
- Date picker uses year/month/day `<select>` dropdowns
- "< 前日" and "翌日 >" buttons change date by 1 day
- "予定を取得" button calls `getAllToolHistoryV3(selectedDate)` which fetches Calendar + Slack + Gmail + Backlog for the selected date
- When loading, the button grays out. Wait ~15-20s for data to load.

## Authentication Notes
- GAS clasp requires Google OAuth. Token stored via `npx @google/clasp login`.
- Slack integration uses OAuth flow within the app.
- Backlog uses per-user API key stored in GAS Script Properties.
- Gmail access uses GAS built-in `GmailApp` (no extra auth needed).
- AI summarization uses Claude API key stored in GAS Script Properties (`ANTHROPIC_API_KEY`).

## Common Issues
- GAS has 6-minute execution timeout for server-side functions
- Frontend has configurable timeout (`GAS_TIMEOUT_MS`), currently 120s
- Cross-origin iframe prevents JS console interaction - must use coordinate-based clicks
- Date display in header uses JST (Asia/Tokyo), so UTC dates appear +1 day in JST
