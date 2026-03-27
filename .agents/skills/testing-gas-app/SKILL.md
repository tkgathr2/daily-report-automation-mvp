# Testing 簡単日報くん (GAS Web App)

## App Overview
- Google Apps Script web app deployed via clasp
- Production URL: `https://nippou.up.railway.app` (redirects to GAS)
- GAS endpoint: `https://script.google.com/a/macros/takagi.bz/s/AKfycbyRu1Sye5cpmXqoqfGOI2BBReFh4cvqhkSr9CW7JS2XyhY7q32tv3A5gLG5rGwNtO5a4Q/exec`
- The app runs inside a GAS iframe (sandboxFrame)

## Devin Secrets Needed
- `GOOGLE_ACCOUNT_PASSWORD` - Google account password for clasp authentication and OAuth
- `BACKLOG_API_KEY` - Backlog API key (per-user, stored in GAS UserProperties)

## Deployment Workflow (MUST do after every PR merge)
1. `git checkout master && git pull origin master`
2. `npx clasp push --force` (push code to GAS)
3. `npx clasp deploy -i AKfycbyRu1Sye5cpmXqoqfGOI2BBReFh4cvqhkSr9CW7JS2XyhY7q32tv3A5gLG5rGwNtO5a4Q -d "vXX: description"`

**Important:** `clasp push` without `clasp deploy` only updates the HEAD/dev version, NOT the deployed version served to users. Always run both.

### Clasp Auth Expiry & Re-authentication
If clasp commands fail with `invalid_rapt` or `invalid_grant` errors, the OAuth credentials have expired. To fix:
1. Start a local HTTP server on port 8888 to capture the OAuth callback
2. Open the Google OAuth URL in a browser with the clasp OAuth client ID
3. Complete the Google login flow (password + consent)
4. Exchange the authorization code for tokens using `curl -X POST https://oauth2.googleapis.com/token`
5. Write the tokens to `~/.clasprc.json` with the correct structure
6. The `CLASP_TOKEN` GitHub Actions secret may also need updating for CI/CD deploys

OAuth scopes needed: `service.management`, `logging.read`, `userinfo.email`, `script.webapp.deploy`, `openid`, `userinfo.profile`, `script.projects`, `cloud-platform`, `drive.file`, `drive.metadata.readonly`, `script.deployments`

## Testing the UI

### Navigation
1. Navigate to `https://nippou.up.railway.app`
2. Page may show "\u30ea\u30c0\u30a4\u30ec\u30af\u30c8\u4e2d..." initially - click the manual redirect link if it doesn't auto-redirect within ~10 seconds
3. App loads inside an iframe - all interaction is through coordinates on the visible page
4. "\u6700\u8fd1\u306e\u30a2\u30c3\u30d7\u30c7\u30fc\u30c8" banner may cover content - click "\u9589\u3058\u308b" to dismiss

### Tool Pill Toggles
- Located below "\u3010\u4eca\u65e5\u3084\u3063\u305f\u3053\u3068\u3011" heading
- Pills: \u30ab\u30ec\u30f3\u30c0\u30fc (blue, #4285F4), Slack\u9001\u4fe1 (dark), Slack\u53d7\u4fe1 (green), Gmail\u9001\u4fe1 (red), Gmail\u53d7\u4fe1 (orange), Backlog (green)
- Colored dot + text = ON (active), grey/dimmed = OFF (inactive)
- Click a pill to toggle it ON/OFF - state is saved immediately to backend (UserProperties)
- "\u53d6\u5f97" button triggers data fetch for all enabled tools
- Pill state persists across page reloads

### Settings Panel (\u2699 Gear Icon)
- Floating gear button at bottom-right corner of the page
- Opens a modal with collapsible sections:
  - **\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb** - User profile
  - **\u30c7\u30fc\u30bf\u53d6\u5f97\u30c7\u30d5\u30a9\u30eb\u30c8** - Default ON/OFF for each pill (\u30ab\u30ec\u30f3\u30c0\u30fc, Slack\u9001\u4fe1, Slack\u53d7\u4fe1, Gmail\u9001\u4fe1, Gmail\u53d7\u4fe1, Backlog)
  - **\u8868\u793a\u8a2d\u5b9a** - Display settings
  - **\u9023\u643a\u8a2d\u5b9a** - Integration settings (Backlog API\u30ad\u30fc\u8a2d\u5b9a, Slack\u518d\u9023\u643a, Gmail/Google\u30ab\u30ec\u30f3\u30c0\u30fc info box)
  - **\u30c6\u30fc\u30de\u30fb\u5916\u89b3** - Theme/appearance
  - **\u6b8b\u696d\u6642\u9593\u30c7\u30d5\u30a9\u30eb\u30c8** - Overtime defaults
  - **\u30b7\u30e7\u30fc\u30c8\u30ab\u30c3\u30c8** - Keyboard shortcuts
  - **\u304a\u77e5\u3089\u305b** - Announcements
  - **\u30c7\u30fc\u30bf\u7ba1\u7406** - Data management
  - **\u305d\u306e\u4ed6** - Other

### Data Fetch Flow
1. Click "\u53d6\u5f97" \u2192 shows "\u8aad\u307f\u8fbc\u307f\u4e2d..." spinner
2. Wait ~30-60 seconds for GAS backend to process
3. Results appear in:
   - Editor area (`#todayTasks`) - Calendar events (HH:mm-HH:mm format), Slack/Gmail AI summaries, Backlog completed tasks
   - Sidebar - Gmail individual items (when no AI summary)
   - Error banner (bottom of page) - Tool errors in red background

### Common Test Scenarios

#### Calendar Toggle
- Calendar pill is the FIRST pill (blue, #4285F4)
- When ON: calendar events appear as HH:mm-HH:mm schedule lines in the editor
- When OFF: no calendar lines appear, only [Slack]/[Backlog]/[Gmail] entries
- Backend skips `getEventsForDate()` entirely when calendar is OFF (saves execution time)
- Frontend safely handles `result.calendar` being undefined when calendar is OFF

#### Slack Error Display
- If Slack is not linked, enabling Slack pill and clicking \u53d6\u5f97 shows error: "\u4e00\u90e8\u306e\u30c4\u30fc\u30eb\u3067\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f: [Slack] Slack\u672a\u9023\u643a\u3067\u3059\u3002"
- If Slack token is expired: "[Slack] Slack\u306e\u8a8d\u8a3c\u304c\u7121\u52b9\u3067\u3059\u3002\u300cSlack\u9023\u643a\uff08\u8a8d\u53ef\uff09\u300d\u304b\u3089\u518d\u9023\u643a\u3057\u3066\u304f\u3060\u3055\u3044\u3002"

#### Gmail Data
- Gmail uses `after:yesterday` date filter to include today's emails
- Without AI summary, Gmail data goes to sidebar only
- With AI summary, [Gmail] prefixed lines appear in editor

#### Backlog Empty State
- When no Backlog issues completed today, no Backlog section appears
- When issues exist, [Backlog] lines with green styling and clickable URLs appear

## Gotchas
- **GAS iframe cross-origin**: Cannot access iframe content via JavaScript console. Use visual inspection (screenshots) to verify content.
- **Page redirect can be slow** (~10-30 seconds) - use `https://nippou.up.railway.app` which handles redirect automatically
- **Data fetch takes ~30-60 seconds** - be patient, don't click \u53d6\u5f97 multiple times
- **Tool settings vs default settings**: `toolSettings` (pill state) is separate from `defaultSettings` (settings panel defaults). toolSettings takes priority on existing sessions.
- **Clasp auth can expire**: If `clasp push` fails with `invalid_rapt`, re-authenticate (see Clasp Auth section above)

## Testing with Mock Data
When testing features that depend on time-sensitive data (e.g., Backlog completed issues "today"):
1. **Temporarily modify** the backend function to return mock data
2. **Deploy via clasp push + clasp deploy** (both required!)
3. **Navigate to app** and verify display
4. **Revert** mock data in the source file
5. **Redeploy** clean production code

**Never commit mock data to git.** Only push via clasp for temporary testing.

## Three-Layer Link Format
Backlog links flow through three layers:
1. **Backend (GAS):** Returns mrkdwn format `- <URL|text>`
2. **Frontend (HTML):** Converts to `<a href="URL">text</a>` for editor display
3. **Slack posting:** `convertHtmlToSlack()` converts `<a>` back to `<URL|text>` mrkdwn

Changes to link formatting must be tested at all three layers.
# Testing 簡単日報くん (GAS Web App)

## Devin Secrets Needed
- `GOOGLE_ACCOUNT_PASSWORD` - Google account password for clasp authentication
- `BACKLOG_API_KEY` - Backlog API key (per-user, stored in GAS ScriptProperties)

## Standard Deploy Workflow
After every PR merge, ALWAYS run:
```bash
git pull origin master
npx clasp push --force
npx clasp deploy -i AKfycbyRu1Sye5cpmXqoqfGOI2BBReFh4cvqhkSr9CW7JS2XyhY7q32tv3A5gLG5rGwNtO5a4Q -d "vNN: description"
```

**Important:** `clasp push` without `clasp deploy` only updates the HEAD/dev version, NOT the deployed version served to users. Always run both.

## Production App URL
```
https://script.google.com/a/macros/takagi.bz/s/AKfycbyRu1Sye5cpmXqoqfGOI2BBReFh4cvqhkSr9CW7JS2XyhY7q32tv3A5gLG5rGwNtO5a4Q/exec
```

## Testing with Mock Data
When testing features that depend on time-sensitive data (e.g., Backlog completed issues "today"), use this approach:

1. **Temporarily modify** the backend function to return mock data
2. **Deploy via clasp push + clasp deploy** (both required!)
3. **Navigate to app** and verify display
4. **Revert** mock data in the source file
5. **Redeploy** clean production code via clasp push + clasp deploy

**Never commit mock data to git.** Only push via clasp for temporary testing.

## App Navigation Notes
- The app shows a "リダイレクト中" (redirecting) page on first load. Click the redirect link or wait.
- Data auto-fetches on page load if tool toggles are enabled.
- The editor ("今日やったこと") is a contenteditable div - clicking a link inside places the cursor, Ctrl+click follows the link.
- Tool toggles (Slack, Gmail, Gmail受信, Backlog) are pill-shaped buttons above the editor.

## Common Issues

### URL Regex Double-Conversion
When converting `<URL|text>` mrkdwn format to HTML links, be careful with multiple regex passes:
- First regex: converts `<URL|text>` to `<a href="URL">text</a>`
- Second regex: converts plain URLs to clickable links
- **Bug pattern:** The second regex can match URLs inside `href="..."` attributes from the first regex, breaking the HTML. Use negative lookbehind `(?<!=")` and exclude `"` from the character class.

### GAS Iframe Cross-Origin
The app runs inside a Google-hosted iframe. You cannot access iframe content via JavaScript console due to cross-origin restrictions. Use visual inspection (screenshots) to verify content.

### Backlog Data Availability
Backlog report only fetches issues completed "today" (JST). If no issues were completed today, the Backlog section won't appear. Use the mock data approach above to test display formatting.

## Three-Layer Link Format
Backlog links flow through three layers:
1. **Backend (GAS):** Returns mrkdwn format `- <URL|text>`
2. **Frontend (HTML):** Converts to `<a href="URL">text</a>` for editor display
3. **Slack posting:** `convertHtmlToSlack()` converts `<a>` back to `<URL|text>` mrkdwn

Changes to link formatting must be tested at all three layers.
