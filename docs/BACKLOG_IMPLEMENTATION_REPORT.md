# Backlog連携 実装報告書

## 概要
簡単日報君にBacklog連携機能を追加。本日actualHoursが更新された課題を抽出し、日報用テキストを自動生成する。

## 実装ファイル

| ファイル | 役割 |
|---------|------|
| `src/backlog_phase0_check.gs` | フェーズ0検証用スクリプト |
| `src/backlog_report.gs` | 本実装（公開関数: `getBacklogReport()`） |
| `docs/BACKLOG_PROPERTIES.md` | ScriptProperties設定手順書 |
| `docs/BACKLOG_PHASE0_VERIFICATION.md` | フェーズ0検証記録 |
| `docs/BACKLOG_IMPLEMENTATION_REPORT.md` | 本報告書 |

## 実装済み機能

### Phase 1: API共通関数
- [x] `getBacklogConfig_()` - ScriptProperties読み込み
- [x] `backlogApiGet_()` - API GETリクエスト（429検知付き）
- [x] `backlogIsTodayJst_()` - JST本日判定
- [x] `backlogFormatHours_()` - 時間表示変換

### Phase 2: アクティビティ取得
- [x] `getBacklogTodayActivities_()` - ページング対応（最大5ページ）
- [x] 本日分フィルタ
- [x] activityTypeIdによるフィルタ

### Phase 3: 差分集計
- [x] `extractActualHoursChanges_()` - actualHours change抽出
- [x] `normalizeHoursValue_()` - old/new値の正規化
- [x] `aggregateByIssue_()` - 課題ごと集計
- [x] created昇順ソート
- [x] マイナス修正反映
- [x] 0分課題除外

### Phase 4: issue詳細取得
- [x] `fetchIssueDetails_()` - issueKey/summary/actualHours補完
- [x] 最大50課題制限

### Phase 5: 表示整形
- [x] `formatBacklogReport_()` - simple表示
- [x] 合計時間算出
- [x] 課題URL生成

### Phase 6: エラー処理
- [x] API全体失敗時のエラー文言
- [x] 429レート制限時のエラー文言
- [x] issue詳細取得失敗時の縮退動作
- [x] ログ識別子（BACKLOG_RATE_LIMIT_EXCEEDED等）
- [x] 既存エラー観測基盤（ノウハウキング）連携

## 既存コードへの接続

### 接続状態
`06_既存GAS接続メモ_記入用.md` が未記入のため、既存メイン関数への直接接続は行っていません。

### 接続候補（コメントとして記載済み）
`getBacklogReport()` の JSDoc に以下の接続候補を記載:
1. `getAllToolHistoryV3()` 内で他ツール（Slack/Gmail/Notion）と同様に呼び出す
2. `sendToSlackV2()` の todayTasks にBacklog実績を追加する
3. `Index.html` のフロントエンドから `google.script.run.getBacklogReport()` で呼び出す

## フェーズ0検証状態
- [ ] 検証スクリプト作成済み
- [ ] 検証実行待ち（高木さん側で実行）
- [ ] 検証結果に基づく値確定待ち

## 未実施事項
- フェーズ0検証の実行（高木さん側）
- 検証結果に基づくfield名・activityTypeIdの確定
- 既存メイン関数への接続（接続先確定後）
- 自動リトライ（仕様により初期実装では実施しない）
