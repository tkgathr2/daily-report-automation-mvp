# Testing: 簡単日報くん (Daily Report Automation)

## App Access

- **Production URL**: https://nippou.up.railway.app (redirects to GAS)
- **Direct GAS URL**: `https://script.google.com/a/macros/takagi.bz/s/AKfycbyRu1Sye5cpmXqoqfGOI2BBReFh4cvqhkSr9CW7JS2XyhY7q32tv3A5gLG5rGwNtO5a4Q/exec`
- The app runs inside a Google Apps Script iframe, so browser interactions require clicking within the iframe content area
- Google login may be required on first access

## Devin Secrets Needed

- `GOOGLE_ACCOUNT_PASSWORD` - For Google login if session expires
- Backlog API key is stored in GAS ScriptProperties (shared) or UserProperties (per-user)

## Key UI Navigation

### Settings Menu
- Click the ⚙️ gear icon in the report header (top right of the 日報 section)
- Settings dropdown shows: "名前を編集" and "Backlog APIキー設定"

### Backlog API Key Modal
- Access: ⚙️ → "Backlog APIキー設定"
- Status text shows one of three states:
  - Green: "自分のAPIキーが設定済みです" (per-user key set)
  - Orange: "共有キーを使用中（自分のキーを登録してください）" (using shared key)
  - Red: "未設定（APIキーを登録してください）" (no key at all)
- Actions: Save key, Cancel, Delete key

### Tool Toggles (Pill Buttons)
- Located next to "今日やったこと" section header
- Available tools: Slack, Gmail, Gmail受信, Backlog
- Green pill = enabled, gray = disabled
- Click "取得" button to fetch data from all enabled tools

## Testing Workflows

### Per-User Data Isolation Test
1. Open app → ⚙️ → "Backlog APIキー設定"
2. Verify initial status (shared key or no key)
3. Enter a Backlog API key → click 保存
4. Reopen modal → verify status shows "自分のAPIキーが設定済みです" (green)
5. Click "キーを削除" → confirm
6. Reopen modal → verify status falls back to "共有キーを使用中" (orange)

### Data Fetch Test
1. Ensure tool pills are enabled (Slack, Gmail, Backlog)
2. Click "取得" button
3. Wait for data to load (may take 30-60 seconds)
4. Verify Calendar events, Backlog issues, and other data appear in the editor

## Deployment Workflow

After every PR merge, ALWAYS run:
```bash
git checkout master && git pull origin master
npx clasp push --force
npx clasp deploy -i AKfycbyRu1Sye5cpmXqoqfGOI2BBReFh4cvqhkSr9CW7JS2XyhY7q32tv3A5gLG5rGwNtO5a4Q -d "description"
```

## Known Issues

- GAS has a 6-minute execution timeout; complex data fetches (all tools at once) may approach this limit
- Slack OAuth may need re-authorization if scopes change; the app now auto-detects `missing_scope` errors and prompts re-auth
- The app runs in a sandboxed iframe, so browser automation needs to interact with elements inside the iframe
- Alert dialogs from GAS are auto-accepted by Playwright, so save/delete confirmation flows complete automatically during testing
- Status text in the Backlog key modal takes 1-3 seconds to load (calls GAS backend)
