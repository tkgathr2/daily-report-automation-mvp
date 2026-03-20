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
