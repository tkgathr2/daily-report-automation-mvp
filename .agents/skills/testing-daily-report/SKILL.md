# Testing 簡単日報くん (Daily Report App)

## Overview
This is a Google Apps Script (GAS) web app that generates daily reports by pulling data from Calendar, Slack, Gmail, and Backlog. The frontend is served via GAS `doGet()` and the app is accessed through a Railway redirect service.

## Production Access
- **App URL**: https://nippou.up.railway.app (redirects to GAS exec URL)
- **GAS Deployment ID**: `AKfycbyRu1Sye5cpmXqoqfGOI2BBReFh4cvqhkSr9CW7JS2XyhY7q32tv3A5gLG5rGwNtO5a4Q`
- The app runs inside a Google iframe (`sandboxFrame`), so browser interactions must target elements within the iframe

## Deployment
1. `clasp push --force` - Push code to GAS
2. `clasp deploy -i <deployment_id> -d "description"` - Deploy new version
3. Changes are live immediately after deploy (no cache delay observed)

## Devin Secrets Needed
- `GOOGLE_PASSWORD` - Google account password for clasp authentication
- `CLASP_TOKEN` - OAuth token for clasp CLI (stored in ~/.clasprc.json)

## Testing Workflow

### 1. Navigate to the App
- Go to https://nippou.up.railway.app
- Wait for the iframe to load (may take a few seconds)
- The app will auto-load user settings and show the report form

### 2. Tool Toggles (Pill-style)
- Located in the 【今日やったこと】 section header
- Available toggles: Slack送信, Slack受信, Gmail送信, Gmail受信, Backlog
- Active toggles have colored backgrounds (filled), inactive are outlined
- Click to toggle on/off. Settings are saved automatically.

### 3. Fetching Data
- Click the green "取得" button to fetch data for the selected date
- Data loads into the WYSIWYG editor below
- Loading may take 10-30 seconds depending on enabled tools
- Timeout is 120 seconds; if it times out, reduce enabled tools

### 4. Time Sort Feature
- Blue "時間ソート" button next to "取得"
- Sorts all editor entries chronologically by HH:mm time prefix
- All tool types (Calendar, Slack, Gmail, Backlog) are interleaved by time
- Entries without time prefix are moved to the bottom

### 5. Entry Format
- Calendar: `HH:mm-HH:mm 予定名`
- Slack: `HH:mm~ [Slack] [送信/受信] #channel: message`
- Gmail: `HH:mm~ [Gmail] 送信/受信: subject`
- Backlog: `HH:mm~ [Backlog] - KANBU-XXX 課題名`

## Common Issues
- **clasp auth expires**: Re-authenticate with `clasp login` (requires Google password + possibly 2FA)
- **GAS iframe**: Browser tool interactions within the GAS iframe may need coordinate-based clicking rather than devinid selectors
- **Data not appearing**: Check that tool toggles are enabled (colored/filled state)
- **Backlog errors**: Usually means API key not configured for the user - check ScriptProperties

## Testing Tips
- Always enable multiple tool toggles to test cross-tool features
- Use Ctrl+Home/End to scroll within the editor (contenteditable div)
- Take screenshots before and after sort to prove chronological ordering
- Check that tool types are interleaved after sorting (not still grouped)
