# Devin - 引き継ぎ指示 V1.0

## これは Devin への指示です。

---

## 完了済み

- **workflow**: pathsフィルター削除済み・検証成功（コミット `98e393f`）
- **日付選択**: 実装済み（`src/Index.html` 1283–1284行、`loadCalendarEventsForDate`, `getEventsForDate`）

---

## 次のタスク（優先順）

### 1. PR#60（お知らせ）の確認

- `git log --oneline -20 | grep -i "60"`
- `src/Index.html` 1221行付近：お知らせがコメントアウトされているか確認
- マージ済み→有効化検討／未マージ→マージ or 実装検討

### 2. 日報履歴保存の要件

- 未実装（現状は `saveNextTasks` のみ）
- ユーザーに確認：保存データ範囲・保存先・閲覧有無・保存期間
- 要件確定後、Ask から開始

### 3. 日付選択の動作確認

- @HEAD: `https://script.google.com/a/macros/takagi.bz/s/AKfycbwQw2aK8wTUBqUIaufRFvnr697f3JHrT53prxF69BMF4H6JPITtFP9_8aWpERJw9PdnUg/dev`
- 日付ピッカー表示・日付選択・「予定を取得」で取得できるか確認

---

## ルール

- 実行・実装は Claude Code で行う
- 仕様の正は `docs/plan.md`
