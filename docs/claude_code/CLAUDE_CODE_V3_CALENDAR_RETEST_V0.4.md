# Claude Code への指示：V3 カレンダー日付指定テスト（再実行）

**バージョン**: V0.4
**作成日**: 2026-02-08

---

## これは Claude Code への指示です。

---

## 背景

前回の `clasp run` は「Script function not found. Please make sure script is deployed as API executable.」で失敗した。
ユーザーが GAS API を有効化したため、再テストする。

---

## 手順（順番に実行し、各結果を報告すること）

### テスト1: 昨日のカレンダー予定を取得

```powershell
cd C:\Users\takag\00_dev\daily-report-automation-mvp
clasp run getEventsForDate --params '["2026-02-07"]'
```

結果を報告（成功→返り値の概要 / 失敗→エラーメッセージ全文）

---

### テスト2: 今日のカレンダー予定を取得

```powershell
clasp run getTodayEvents
```

結果を報告（成功→返り値の概要 / 失敗→エラーメッセージ全文）

---

### テスト3: 全ツール統合取得（日付指定付き）

```powershell
clasp run getAllToolHistoryV3 --params '["2026-02-07"]'
```

結果を報告（成功→返り値の概要 / 失敗→エラーメッセージ全文）

**期待**: カレンダーは2026-02-07のデータ、Slack/Gmail/Notionは今日のデータ（またはエラー）

---

### テスト4: 全ツール統合取得（今日）

```powershell
clasp run getAllToolHistoryV3 --params '[null]'
```

結果を報告（成功→返り値の概要 / 失敗→エラーメッセージ全文）

---

## まだ失敗する場合

エラーメッセージ全文を報告して停止すること。推測で進めない。

---

## 完了条件

- テスト1〜4の結果（成功/失敗＋概要）をすべて報告
- 1つでも成功すれば「カレンダー日付指定は動作する」と判定
- 全て失敗の場合はエラーメッセージと原因候補を報告
