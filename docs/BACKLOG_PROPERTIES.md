# BACKLOG_PROPERTIES - ScriptProperties設定手順書

## 概要
簡単日報君のBacklog連携機能を有効にするために、GASのScriptPropertiesに以下のキーを設定してください。

## 設定方法
1. GASエディタを開く
2. メニュー: プロジェクトの設定 → スクリプトプロパティ
3. 以下のキーと値を追加

---

## 必須キー

### BACKLOG_SPACE_BASE_URL
BacklogスペースのベースURL。末尾スラッシュなし。

```text
https://example.backlog.jp
```

**例:**
- `https://yourspace.backlog.jp`（JP版）
- `https://yourspace.backlog.com`（.com版）

### BACKLOG_API_KEY
BacklogのAPIキー。個人設定 → API → 新しいAPIキーの発行 で取得。

```text
your_backlog_api_key_here
```

---

## フェーズ0検証後に確定するキー

### BACKLOG_ACTIVITY_ACTUAL_HOURS_FIELD
actualHours更新時の `content.changes[].field` の実値。
フェーズ0検証スクリプトの実行結果から確定する。

**初期候補:**
```text
actualHours
```

**注意:** フェーズ0検証で実値を確認してから設定すること。推測で設定しない。

### BACKLOG_ACTIVITY_TYPES
対象とするactivityTypeIdをCSVで指定。
フェーズ0検証スクリプトの実行結果から確定する。

**初期候補:**
```text
2,3,14
```

**type=3（コメント付き更新）の扱い:**
- type=3でactualHours changeが取得できない場合は `2,14` を採用
- フェーズ0検証結果に基づいて判断すること

---

## オプションキー

### BACKLOG_ACTIVITY_FETCH_COUNT
1ページあたりの取得件数。最大100。

```text
100
```

### BACKLOG_DETAIL_MODE
表示モード。初期実装は `simple` のみ対応。

```text
simple
```

### BACKLOG_ENABLE_CURRENT_ACTUAL_HOURS
課題の現在の累計実績時間を表示するかどうか。

```text
false
```

- `true`: 各課題に `[累計: X時間Y分]` を表示
- `false`: 表示しない（デフォルト）

---

## 型に関する注意事項

ScriptPropertiesの値はすべて **文字列** として保存されます。
実装側で以下の変換を行っています:

| キー | 変換方法 |
|------|----------|
| BACKLOG_ACTIVITY_TYPES | `split(',')` で配列化 |
| BACKLOG_ACTIVITY_FETCH_COUNT | `Number()` で数値変換 |
| BACKLOG_ENABLE_CURRENT_ACTUAL_HOURS | `=== 'true'` でboolean判定 |

---

## 設定例（最小構成）

| キー | 値 |
|------|-----|
| BACKLOG_SPACE_BASE_URL | `https://yourspace.backlog.jp` |
| BACKLOG_API_KEY | `(APIキー)` |
| BACKLOG_ACTIVITY_ACTUAL_HOURS_FIELD | `(フェーズ0検証後に設定)` |
| BACKLOG_ACTIVITY_TYPES | `(フェーズ0検証後に設定)` |
