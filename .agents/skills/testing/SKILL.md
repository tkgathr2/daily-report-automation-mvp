# Testing Skill

## Testing Approach
- No local test suite exists; test via production app at https://nippou.up.railway.app
- Login uses Google OAuth (atsuhiro@takagi.bz domain)
- 90-day login persistence means re-login is rarely needed

## Key Testing Patterns

### Timeout Testing
- Client-side timeout is set via `GAS_TIMEOUT_MS` in Index.html
- Success handlers MUST call `finishLoading()` (not `showLoading(false)`) to clear the timeout timer
- `finishLoading()` calls both `clearTimeout(_loadingTimeoutId)` and `showLoading(false)`
- To test timeout fix: enable all 4 tools, click 取得, wait >120s, verify no error banner appears

### Slack API Patterns
- `after:` modifier is EXCLUSIVE (e.g. `after:2026-03-17` returns messages from 03/18 onward)
- `on:` modifier may not be reliably supported by Slack search.messages API
- Use `after:yesterday` to get today's messages
- Japan has no DST, so yesterday calculation is safe: `new Date(now.getTime() - 24*60*60*1000)`
- Secondary date filter (todayStart/todayEnd bounds) ensures only today's messages included

### Gmail API Patterns
- `after:` with today's date works for Gmail (different from Slack behavior)
- Gmail items appear in sidebar picker, NOT auto-inserted into editor
- Slack and Backlog items ARE auto-inserted into editor with [Slack]/[Backlog] prefix

### Tool Settings (Pill Toggle UI)
- 4 tools: Slack (green), Gmail (red), Gmail受信 (orange), Backlog (green)
- All tools fetch sequentially in GAS, so more tools = longer fetch time
- Update list at top of app shows latest changes (verify deployment version)
