# バグ票（ログイン＋Slack投稿重点テスト）

- 対象: 簡単日報くん（daily-report-automation-mvp）
- 対象URL: https://nippou.up.railway.app
- 対象commit: `ed18898`
- 作成日: 2026-02-22
- テストケース: `docs/test/e2e_login_posting_300cases.md`
- 実行チェックシート: `docs/test/manual_run_sheet_20260222.md`

---

## バグ起票ルール

1. **推測禁止**: 原因は「不明」としてよい。事実のみ記載する
2. **証拠必須**: スクショ/動画/Consoleログ/alert全文/errorIdを必ず添付
3. **再現手順必須**: 第三者が再現できる粒度で手順を書く
4. **1バグ1票**: 複数の症状がある場合でも、根本が異なれば別々に起票する

---

## バグ票テンプレート

```
### BUG-LP-XXX タイトル（簡潔に症状を書く）

- **重要度**: 高 / 中 / 低
- **関連ケース**: LG-XXX / SL-XXX / FR-XXX / EX-XXX
- **発見日**: YYYY-MM-DD
- **発見者**: （名前）
- **ブラウザ/OS**: Chrome 120 / macOS 14 等
- **アカウント**: （ドメイン）
- **再現率**: X/Y回（例: 3/3回 = 100%）

#### 再現手順
1. https://nippou.up.railway.app/ を開く
2. （操作を具体的に書く）
3. （操作を具体的に書く）
4. → 症状が発生

#### 期待結果
- （正常ならどうなるべきか）

#### 実結果
- （実際に何が起きたか）

#### 証拠
- スクショ: （パス or URL）
- Consoleログ: （エラー全文をコードブロックで貼る）
- Network: （失敗リクエストのURL、ステータスコード、レスポンス）
- alert/モーダル文言: （全文）
- errorId/requestId: （あれば）
- Knowhow King検索結果: （あれば）

#### 備考
- （原因推測は禁止。事実のみ。例: 「○○の後に必ず発生」「○○では発生しない」等）
```

---

## 検出バグ一覧

| BUG ID | 重要度 | 関連ケース | 概要 | 再現率 | 状態 |
|--------|--------|-----------|------|--------|------|
| BUG-LP-001 | 低 | LG-005 | `?from=nippou`付きアクセスでリダイレクト先に`from=nippou`が二重付与 | 1/1 (100%) | NEW |
| BUG-LP-002 | 低 | LG-006 | 存在しないパスが404ではなくGASへ302リダイレクト | 1/1 (100%) | NEW |
| BUG-LP-003 | 中 | LG-015, EX-007 | PUT/DELETE/PATCH/POSTメソッドが全て受理される | 4/4 (100%) | NEW |
| BUG-LP-004 | 中 | EX-011 | /oauth/callbackパラメータなしでGASへそのままリダイレクト | 1/1 (100%) | NEW |
| BUG-LP-005 | 中 | EX-012 | /oauth/callbackに不正code/stateでもGASへリダイレクト | 1/1 (100%) | NEW |

---

### BUG-LP-001 `?from=nippou`付きアクセスでリダイレクト先にfrom=nippouが二重付与

- **重要度**: 低
- **関連ケース**: LG-005
- **発見日**: 2026-02-22
- **発見者**: Devin AI（自動テスト）
- **ブラウザ/OS**: curl 7.81.0 / Ubuntu
- **アカウント**: N/A（認証前）
- **再現率**: 1/1回 (100%)

#### 再現手順
1. `curl -s -D- -o /dev/null "https://nippou.up.railway.app/?from=nippou"` を実行
2. Locationヘッダーを確認

#### 期待結果
- リダイレクト先: `...exec?from=nippou`（1つだけ）

#### 実結果
- リダイレクト先: `...exec?from=nippou&from=nippou`（二重付与）

#### 証拠
- Network:
```
HTTP/2 302
location: https://script.google.com/a/macros/takagi.bz/s/.../exec?from=nippou&from=nippou
```

#### 備考
- redirect-service/index.jsが既にクエリパラメータにfrom=nippouがある場合でも追加してしまう
- GAS側でfrom=nippouが二重になっても動作に影響はない（パラメータの最初の値を使用するため）

---

### BUG-LP-002 存在しないパスが404ではなくGASへ302リダイレクト

- **重要度**: 低
- **関連ケース**: LG-006
- **発見日**: 2026-02-22
- **発見者**: Devin AI（自動テスト）
- **ブラウザ/OS**: curl 7.81.0 / Ubuntu
- **アカウント**: N/A（認証前）
- **再現率**: 1/1回 (100%)

#### 再現手順
1. `curl -s -o /dev/null -w "%{http_code}" "https://nippou.up.railway.app/nonexistent-path"` を実行

#### 期待結果
- HTTP 404 Not Found ページが表示される

#### 実結果
- HTTP 302 → GAS exec URLへリダイレクト

#### 証拠
- Network:
```
HTTP/2 302
location: https://script.google.com/a/macros/takagi.bz/s/.../exec?from=nippou
```

#### 備考
- redirect-serviceが全パスをGASへリダイレクトする設計。意図的な可能性あり
- `/exec`, `/oauth/callback` 以外の全パスが対象

---

### BUG-LP-003 PUT/DELETE/PATCH/POSTメソッドが全て受理される

- **重要度**: 中
- **関連ケース**: LG-015, EX-007
- **発見日**: 2026-02-22
- **発見者**: Devin AI（自動テスト）
- **ブラウザ/OS**: curl 7.81.0 / Ubuntu
- **アカウント**: N/A（認証前）
- **再現率**: 4/4回 (100%)

#### 再現手順
1. `curl -s -X PUT -o /dev/null -w "%{http_code}" "https://nippou.up.railway.app/"` を実行
2. `curl -s -X DELETE -o /dev/null -w "%{http_code}" "https://nippou.up.railway.app/"` を実行
3. `curl -s -X PATCH -o /dev/null -w "%{http_code}" "https://nippou.up.railway.app/"` を実行
4. `curl -s -X POST -o /dev/null -w "%{http_code}" "https://nippou.up.railway.app/"` を実行

#### 期待結果
- HTTP 405 Method Not Allowed（GETのみ許可すべき）

#### 実結果
- 全て HTTP 200（ログインページHTMLを返却）

#### 証拠
- Network: PUT → 200, DELETE → 200, PATCH → 200, POST → 200

#### 備考
- redirect-service/index.jsのHTTPサーバーがメソッドのフィルタリングをしていない
- 実害は低い（ログインページのHTMLを返すだけ）が、セキュリティベストプラクティスに反する

---

### BUG-LP-004 /oauth/callbackにパラメータなしでアクセスするとGASへそのままリダイレクト

- **重要度**: 中
- **関連ケース**: EX-011
- **発見日**: 2026-02-22
- **発見者**: Devin AI（自動テスト）
- **ブラウザ/OS**: curl 7.81.0 / Ubuntu
- **アカウント**: N/A（認証前）
- **再現率**: 1/1回 (100%)

#### 再現手順
1. `curl -s -D- "https://nippou.up.railway.app/oauth/callback"` を実行

#### 期待結果
- エラーページ表示（「パラメータが不正です」等のガイダンス付き）

#### 実結果
- HTTP 302 → GAS exec URL → Google認証画面へリダイレクト

#### 証拠
- Network:
```
HTTP/2 302
location: https://script.google.com/a/macros/takagi.bz/s/.../exec
→ Google AccountChooser (hd=takagi.bz)
```

#### 備考
- redirect-serviceで/oauth/callbackへのパラメータバリデーションが行われていない
- GAS側のhandleSlackOAuthCallback_はcodeパラメータなしの場合エラーページを返す実装がある

---

### BUG-LP-005 /oauth/callbackに不正code/stateでもGASへリダイレクト

- **重要度**: 中
- **関連ケース**: EX-012
- **発見日**: 2026-02-22
- **発見者**: Devin AI（自動テスト）
- **ブラウザ/OS**: curl 7.81.0 / Ubuntu
- **アカウント**: N/A（認証前）
- **再現率**: 1/1回 (100%)

#### 再現手順
1. `curl -s -D- "https://nippou.up.railway.app/oauth/callback?code=invalid&state=invalid"` を実行

#### 期待結果
- redirect-service側でバリデーションし、エラーページまたはトップページへリダイレクト

#### 実結果
- HTTP 302 → GAS exec URL（code=invalid&state=invalid がそのまま渡される）

#### 証拠
- Network:
```
HTTP/2 302
location: https://script.google.com/a/macros/takagi.bz/s/.../exec?code=invalid&state=invalid
```

#### 備考
- redirect-serviceがOAuthパラメータを無検証でGASへ転送している
- GAS側でstate検証・エラーハンドリングは実装済みだが、不要なリクエストがGASに到達する

---

## 重点観察ポイント（止まりやすい箇所）

以下はコード分析に基づく「エラーが出やすい」と予測されるポイント。テスト時に特に注意して観察する。

### ログイン関連
| # | 観察ポイント | 関連ケース | 予測されるリスク |
|---|-------------|-----------|----------------|
| 1 | Googleログイン選択画面→GASリダイレクト | LG-008〜010 | リダイレクトループ、白画面 |
| 2 | 拒否ドメインでのアクセス拒否表示 | LG-011 | エラーページが出ない、白画面 |
| 3 | GAS /exec 直叩き時の挙動 | LG-004, LG-005 | Railway URLへのリダイレクト失敗 |
| 4 | セッション切れ後の操作 | EX-014, EX-015 | 無限ローディング、白画面 |
| 5 | 複数タブで同時ログイン | FR-021 | Cookie競合、片方が白画面 |
| 6 | ブラウザ戻る/進む操作 | LG-024等 | GAS HTMLサービスの制約で白画面 |

### Slack投稿関連
| # | 観察ポイント | 関連ケース | 予測されるリスク |
|---|-------------|-----------|----------------|
| 1 | 未連携状態での投稿 | SL-001 | エラーメッセージが出ない、固まる |
| 2 | トークン失効後の投稿 | SL-011 | 「不明なエラー」表示、再連携案内なし |
| 3 | 投稿ボタン連打/二重クリック | SL-014〜017 | 二重投稿、ボタン復帰しない |
| 4 | 投稿中のブラウザ操作（戻る/F5） | SL-020, SL-021 | 投稿結果不明、UI破壊 |
| 5 | オフライン時の投稿 | SL-023, SL-024 | エラー表示なし、無限ローディング |
| 6 | 長文投稿（4000文字超） | SL-004 | Slack API制限、タイムアウト |
| 7 | 予定ゼロ/大量時の投稿 | SL-025, SL-026 | フォーマット崩れ、タイムアウト |
| 8 | モーダル表示中の操作競合 | SL-035, SL-036 | z-index競合、操作不能 |

### 画面固まり関連
| # | 観察ポイント | 関連ケース | 予測されるリスク |
|---|-------------|-----------|----------------|
| 1 | GAS呼び出しタイムアウト（30秒） | FR-019 | タイムアウト処理後のUI復帰 |
| 2 | 日付連続切替 | FR-008 | 前の取得完了前に次の取得開始 |
| 3 | リロード連打 | FR-029, FR-030 | 初期化競合 |
| 4 | 長時間放置後の操作 | FR-034, FR-035 | セッション切れ→操作不能 |
| 5 | 大量テキスト入力 | FR-036, FR-037 | ブラウザのレンダリング遅延 |

### OAuth例外関連
| # | 観察ポイント | 関連ケース | 予測されるリスク |
|---|-------------|-----------|----------------|
| 1 | state期限切れ | EX-001, EX-002 | エラーメッセージの案内不足 |
| 2 | Slack側で拒否/キャンセル | EX-003, EX-004 | エラーページの表示不備 |
| 3 | 不正パラメータでのコールバック | EX-005〜008 | 白画面、スタックトレース露出 |
| 4 | 多重OAuth | EX-020 | state競合、片方が失敗 |

---

## 分類基準

### 重要度
| レベル | 基準 |
|--------|------|
| **高** | ユーザーが操作続行不能（白画面、無限ローディング、ボタン復帰しない） |
| **中** | 操作は可能だがUXに問題（エラーメッセージ不明瞭、二重投稿、表示崩れ） |
| **低** | 軽微な問題（文言改善、余白、アニメーション） |

### 状態
| 状態 | 説明 |
|------|------|
| **NEW** | 新規起票 |
| **CONFIRMED** | 再現確認済み |
| **FIXED** | 修正済み（今回は修正禁止なので使わない） |
| **WONTFIX** | 対応不要と判断 |
