# Claude Code への指示：V3 カレンダー日付指定テスト

**バージョン**: V0.3
**作成日**: 2026-02-08

---

## これは Claude Code への指示です。

---

## 目的

日付指定でカレンダー予定が取得できるか、GAS関数をローカルから直接実行してテストする。

---

## 手順

### Step 1: GAS APIが有効か確認

```powershell
cd C:\Users\takag\00_dev\daily-report-automation-mvp
clasp run getEventsForDate --params '["2026-02-07"]'
```

**成功した場合**: 2026-02-07（昨日）のカレンダー予定テキストが返る
**失敗した場合**: エラーメッセージが返る（GAS API未有効化の場合は `ScriptError` 等）

### Step 2: 今日の予定も確認

```powershell
clasp run getTodayEvents
```

**成功した場合**: 今日のカレンダー予定テキストが返る

### Step 3: 全ツール統合取得テスト（日付指定付き）

```powershell
clasp run getAllToolHistoryV3 --params '["2026-02-07"]'
```

**成功した場合**: `{calendar: "...", slack: {...}, gmail: {...}, notion: {...}, errors: [...]}` 形式のJSONが返る
**カレンダーは2026-02-07、Slack/Gmail/Notionは今日のデータが含まれる**

### Step 4: clasp run が失敗した場合のフォールバック

`clasp run` が使えない場合（GAS API未有効化等）、以下を実行して報告：

1. エラーメッセージ全文を報告
2. 「GAS APIの有効化が必要」かどうかを判定
3. 有効化が必要な場合はその旨だけ報告（設定はユーザー手動）

---

## 完了条件

- `getEventsForDate("2026-02-07")` の結果（成功/失敗＋内容）を報告
- `getTodayEvents` の結果（成功/失敗＋内容）を報告
- `getAllToolHistoryV3("2026-02-07")` の結果（成功/失敗＋内容）を報告
- 失敗した場合は原因（GAS API未有効化 等）を報告
