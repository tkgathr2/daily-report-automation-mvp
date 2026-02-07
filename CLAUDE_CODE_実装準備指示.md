# Claude Code - 日報履歴保存機能の実装準備指示

## これは Claude Code への指示です。

---

## 目的

日報履歴保存機能の実装準備として、既存コードを確認し、実装方針を整理する。

---

## 確認した既存コード

### 1. saveNextTasks関数（src/Code.gs 857-876行目）
**実装内容**:
- User Propertiesに「次すること」を保存
- データ形式: `{date: 'yyyy-MM-dd', nextTasks: string}`
- 保存先: `USER_PROPERTY_NEXT_TASKS`

**参考ポイント**:
- User Propertiesを使用
- JSON形式で保存
- 日付をキーとして使用

### 2. recordToolUsage関数（V7仕様書より）
**実装内容**:
- ツール利用頻度を記録
- データ形式: `{records: [{date: 'yyyy-MM-dd', usage: {...}}]}`
- 30日より古いレコードを自動削除

**参考ポイント**:
- 配列形式で複数レコードを保存
- 古いレコードの自動削除機能
- 日付ベースの管理

---

## 実装方針の整理

### データ構造案

#### 案1: 単一レコード形式（saveNextTasksと同様）
```javascript
{
  date: '2026-01-24',
  reportData: {
    header: '【2026年01月24日　高木　日報】',
    todayTasks: '...',
    notices: '...',
    salesPoints: '...',
    nextTasks: '...'
  },
  sentAt: '2026-01-24T15:30:00+09:00',
  channelId: 'C1234567890',
  messageTs: '1234567890.123456'
}
```

**メリット**:
- シンプルな実装
- 最新の日報のみ保存（上書き）

**デメリット**:
- 過去の履歴が残らない

#### 案2: 配列形式（recordToolUsageと同様）
```javascript
{
  records: [
    {
      date: '2026-01-24',
      reportData: {...},
      sentAt: '...',
      channelId: '...',
      messageTs: '...'
    },
    {
      date: '2026-01-23',
      reportData: {...},
      sentAt: '...',
      channelId: '...',
      messageTs: '...'
    }
  ]
}
```

**メリット**:
- 過去の履歴を保持
- 履歴の閲覧が可能

**デメリット**:
- データサイズが大きくなる可能性
- 古いレコードの削除が必要

### 保存先の選択

#### 案1: User Properties（推奨）
**メリット**:
- ユーザーごとに独立
- 既存の実装パターンと一致
- 実装が簡単

**デメリット**:
- データサイズ制限（9KB/プロパティ）
- 大量の履歴には不向き

#### 案2: Google Spreadsheet
**メリット**:
- データサイズ制限なし
- 履歴の閲覧・検索が容易
- データの永続化

**デメリット**:
- 実装が複雑
- Spreadsheetの作成・管理が必要

### 保存期間の制限

#### 案1: 無制限
- すべての履歴を保持
- データサイズが大きくなる可能性

#### 案2: 30日間（recordToolUsageと同様）
- 30日より古いレコードを自動削除
- データサイズを抑制

#### 案3: 90日間
- 四半期分の履歴を保持
- バランスの取れた選択

---

## 実装準備作業

### Step 1: 要件定義の確認
- ユーザーに以下を確認：
  1. 保存するデータの範囲
  2. データ保存先（User Properties / Spreadsheet）
  3. 閲覧機能の有無
  4. 保存期間の制限

### Step 2: データ構造の決定
- 要件定義に基づいて、データ構造を決定
- 案1（単一レコード）または案2（配列形式）を選択

### Step 3: 実装関数の設計
- `saveReportHistory(reportData, channelId, messageTs)` 関数を設計
- `getReportHistory(date)` 関数を設計（閲覧機能がある場合）
- `deleteOldReportHistory()` 関数を設計（保存期間制限がある場合）

### Step 4: 定数の定義
- `USER_PROPERTY_REPORT_HISTORY = 'REPORT_HISTORY_DATA'` を定義
- `REPORT_HISTORY_RETENTION_DAYS = 30` を定義（保存期間制限がある場合）

---

## 注意事項

- 要件定義が完了するまで、実装は開始しない
- 既存の実装パターン（saveNextTasks, recordToolUsage）を参考にする
- データサイズ制限を考慮する（User Propertiesの場合）
- 最終憲法の「推測は禁止」ルールに従う

---

## 完了条件

1. ✅ 既存コードの確認が完了した
2. ⏳ 実装方針の整理が完了した
3. ⏳ 要件定義の確認を待っている
4. ⏳ 実装準備が完了した
