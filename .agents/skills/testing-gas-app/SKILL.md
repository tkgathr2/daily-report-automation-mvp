# Testing 簡単日報くん (GAS Web App)

## App Overview
- Google Apps Script web app deployed via clasp
- Production URL: `https://script.google.com/a/macros/takagi.bz/s/AKfycbyRu1Sye5cpmXqoqfGOI2BBReFh4cvqhkSr9CW7JS2XyhY7q32tv3A5gLG5rGwNtO5a4Q/exec`
- The app runs inside a GAS iframe (sandboxFrame)

## Deployment Workflow (MUST do after every PR merge)
1. `git checkout master && git pull origin master`
2. `npx clasp push --force` (push code to GAS)
3. `npx clasp deploy -i AKfycbyRu1Sye5cpmXqoqfGOI2BBReFh4cvqhkSr9CW7JS2XyhY7q32tv3A5gLG5rGwNtO5a4Q -d "vXX: description"`
4. If clasp auth expires, run `npx clasp login` (uses localhost OAuth server)

## Devin Secrets Needed
- `GOOGLE_ACCOUNT_PASSWORD` - For Google OAuth login (clasp auth)
- `BACKLOG_API_KEY` - For Backlog API testing

## Testing the UI

### Navigation
1. Navigate to production URL
2. Page shows "リダイレクト中..." initially - click the manual redirect link ("自動でリダイレクトされない場合はこちら") if it doesn't auto-redirect within ~10 seconds
3. App loads inside an iframe - all interaction is through coordinates on the visible page
4. "最近のアップデート" banner may cover content - click "閉じる" to dismiss

### Tool Pill Toggles
- Located next to "【今日やったこと】" heading
- Pills: Slack, Gmail, Gmail受信, Backlog
- Green/colored = ON, grey = OFF
- Click a pill to toggle it ON/OFF
- "取得" button (rightmost, blue) triggers data fetch for all enabled tools

### Data Fetch Flow
1. Click "取得" → shows "読み込み中..." spinner
2. Wait ~30 seconds for GAS backend to process
3. Results appear in:
   - Editor area (`#todayTasks`) - Calendar events, Slack/Gmail AI summaries, Backlog completed tasks
   - Sidebar - Gmail individual items (when no AI summary)
   - Error banner (bottom of page) - Tool errors in red background

### Common Test Scenarios

#### Slack Error Display
- If Slack is not linked for the test account, enabling the Slack pill and clicking 取得 should show an error: "一部のツールで取得に失敗しました: [Slack] Slack未連携です。"
- If Slack token is expired/revoked, should show: "[Slack] Slackの認証が無効です。「Slack連携（認可）」から再連携してください。"
- Key test: error message MUST appear (not silent failure)

#### Gmail Data
- Gmail uses `after:yesterday` date filter to include today's emails
- Without AI summary (no Gemini API key), Gmail data goes to sidebar only, not editor
- With AI summary, [Gmail] prefixed lines appear in editor with red styling

#### Backlog Empty State
- When no Backlog issues completed today, "本日完了した課題はありません" should NOT appear
- When issues exist, [Backlog] lines with green styling and clickable URLs should appear

## Gotchas
- GAS iframe makes it impossible to access DOM directly via JavaScript console
- Page redirect can be slow (~10-30 seconds) - use manual redirect link
- Data fetch takes ~30 seconds - be patient
- The test account (atsuhiro@takagi.bz) may not have Slack OAuth token configured, which is actually useful for testing error handling
- Gmail data may not appear in the editor if the account hasn't sent emails today and no Gemini API key is configured for AI summaries
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
