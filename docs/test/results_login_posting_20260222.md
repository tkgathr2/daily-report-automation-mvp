# E2Eテスト実施結果（ログイン＋Slack投稿重点 300ケース）

- 実行日: 2026-02-22
- 対象URL: https://nippou.up.railway.app
- 対象commit: `ed18898` (master HEAD)
- テストケース: `docs/test/e2e_login_posting_300cases.md`
- 実行者: Devin AI（自動テスト部分）

---

## 実行サマリ

| 区分 | ケース数 | 実行可 | PASS | FAIL | INFO | 未実行（手動） |
|------|---------|--------|------|------|------|--------------|
| A. ログイン/ドメイン/セッション (LG) | 120 | 15 | 12 | 3 | 0 | 105 |
| B. Slack投稿 (SL) | 120 | 0 | 0 | 0 | 0 | 120 |
| C. 画面固まり/白画面 (FR) | 40 | 5 | 5 | 0 | 0 | 35 |
| D. 例外系/OAuth (EX) | 20 | 8 | 5 | 3 | 0 | 12 |
| **合計** | **300** | **28** | **22** | **6** | **0** | **272** |

---

## 自動テスト詳細結果

### A. ログイン/ドメイン/セッション

| Case ID | テスト概要 | 結果 | 詳細 |
|---------|-----------|------|------|
| LG-001 | トップページHTTPステータス | **PASS** | HTTP 200, 応答時間 0.35s |
| LG-002 | セキュリティヘッダー確認 | **PASS** | CSP, X-Frame-Options, X-Content-Type-Options, HSTS, X-XSS-Protection 全て設定済み |
| LG-004 | /exec直アクセス | **PASS** | HTTP 302 → GAS exec URL（from=nippou付き） |
| LG-005 | ?from=nippou付きアクセス | **FAIL** | HTTP 302だが、リダイレクト先が `?from=nippou&from=nippou` と二重パラメータ → **BUG-LP-001** |
| LG-006 | 存在しないパス（404） | **FAIL** | HTTP 302（GASへリダイレクト）。404ページが返らない → **BUG-LP-002** |
| LG-007 | XSSベクター in query | **PASS** | `<script>alert(1)</script>` はURLエンコードされてリダイレクト。CSPの `script-src 'none'` で実行不可。GAS側でも `escapeHtml_()` でサニタイズ済み |
| LG-012 | 超長URL（1000文字） | **PASS** | HTTP 302 正常リダイレクト |
| LG-013 | 特殊文字パス（%00%0d%0a） | **PASS** | HTTP 302 正常リダイレクト |
| LG-015 | POSTメソッド | **FAIL** | HTTP 200（ログインページHTML返却）。GETのみ許可すべき → **BUG-LP-003** |
| LG-018 | ログインページHTML内容 | **PASS** | 「簡単日報くん」「ログインしてください」「Googleでログイン」表示確認 |
| LG-019 | CSRF/stateトークン | **PASS** | ログインページにはCSRFトークン不要（Google OAuth側で管理）。機密情報なし |
| LG-020 | モバイルUser-Agent | **PASS** | HTTP 200（通常通り） |
| LG-021 | Bot User-Agent | **PASS** | HTTP 200（robots.txt / noindex対応は別途確認要） |
| LG-022 | 空User-Agent | **PASS** | HTTP 200（正常） |
| LG-017 | 連続10リクエスト | **PASS** | 全てHTTP 200。レート制限なし（Railway CDN経由） |

### B. Slack投稿

> Slack投稿テスト（SL-001〜SL-120）は全てGoogleログイン＋Slack連携が前提。
> 資格情報が必要なため自動実行不可。手動テスト手順はe2e_login_posting_300cases.mdに記載済み。

### C. 画面固まり/白画面/モーダル

| Case ID | テスト概要 | 結果 | 詳細 |
|---------|-----------|------|------|
| FR-001 | レスポンス時間 | **PASS** | 5回計測: 0.245s, 0.271s, 0.257s, 0.252s, 0.183s（平均0.24s、全て1s以内） |
| FR-002 | JSエラー（ログインページ） | **PASS** | ログインページにscriptタグなし（インラインCSS+HTML only） |
| FR-003 | CSS読み込み | **PASS** | styleブロック1つ検出（インラインCSS） |
| FR-004 | 同時20接続 | **PASS** | 全てHTTP 200。タイムアウトやエラーなし |
| FR-005 | ログインページUI表示 | **PASS** | ブラウザで確認: ロゴ、タイトル、ログインボタン正常表示。白画面なし |

### D. 例外系/OAuth

| Case ID | テスト概要 | 結果 | 詳細 |
|---------|-----------|------|------|
| EX-005 | SQLインジェクション試行 | **PASS** | HTTP 302（GASへリダイレクト）。サーバーエラーなし |
| EX-006 | パストラバーサル | **PASS** | HTTP 302（GASへリダイレクト）。ファイル漏洩なし |
| EX-007 | HTTPメソッドファジング（PUT） | **FAIL** | HTTP 200（ログインページ返却）。PUT/DELETE/PATCH全て受理 → **BUG-LP-003** に統合 |
| EX-008 | 大量POSTボディ（100KB） | **PASS** | HTTP 200, 応答0.31s。メモリエラーなし |
| EX-009 | 超長stateパラメータ（5000文字） | **PASS** | HTTP 302。パラメータ長制限なしだが正常動作 |
| EX-010 | 二重エンコードURL | **PASS** | HTTP 302 正常処理 |
| EX-011 | OAuthコールバック（パラメータなし） | **FAIL** | HTTP 302→GAS→Google認証画面。エラーページではなくGAS認証画面に飛ぶ → **BUG-LP-004** |
| EX-012 | OAuthコールバック（不正code/state） | **FAIL** | HTTP 302→GAS→Google認証画面。不正パラメータがGASに渡される → **BUG-LP-005** |

---

## 静的コード分析結果

| # | 分析項目 | 結果 | 詳細 |
|---|---------|------|------|
| 1 | Code.gs doGetエラーハンドリング | **OK** | try-catch完備（L632-674） |
| 2 | Slackエラー種別対応 | **OK** | 15種のエラーコードに日本語メッセージ対応（token_revoked, channel_not_found, ratelimited等） |
| 3 | escapeHtml_()使用箇所 | **OK** | email, domain, error文字列全てエスケープ済み |
| 4 | OAuth state管理 | **OK** | generateAndStoreSlackOAuthState_()でセッション管理 |
| 5 | redirect-serviceエラーハンドラ | **OK** | uncaughtException, unhandledRejection, タイムアウト、グレースフルシャットダウン実装済み |
| 6 | 機密情報漏洩チェック | **OK** | ログインページHTML内にapi_key, secret, password, token, credentialなし |
| 7 | CORSヘッダー | **OK** | Access-Control-Allow-Origin未設定（=クロスオリジン不許可） |

---

## 検出バグ一覧

| BUG ID | 重要度 | 関連ケース | 概要 | 再現率 |
|--------|--------|-----------|------|--------|
| BUG-LP-001 | 低 | LG-005 | `?from=nippou`付きアクセスでリダイレクト先に`from=nippou`が二重付与 | 1/1 (100%) |
| BUG-LP-002 | 低 | LG-006 | 存在しないパスが404ではなくGASへ302リダイレクト | 1/1 (100%) |
| BUG-LP-003 | 中 | LG-015, EX-007 | PUT/DELETE/PATCH/POSTメソッドが全て受理される（GETのみにすべき） | 4/4 (100%) |
| BUG-LP-004 | 中 | EX-011 | /oauth/callbackにパラメータなしでアクセスするとGASへそのままリダイレクト（エラーページ未表示） | 1/1 (100%) |
| BUG-LP-005 | 中 | EX-012 | /oauth/callbackに不正code/stateを渡してもGASへそのままリダイレクト（バリデーションなし） | 1/1 (100%) |

→ 詳細は `bugs_login_posting_20260222.md` に起票済み

---

## 手動テスト（未実行・272件）

以下のテストは資格情報（Googleアカウント / Slack連携）が必要なため自動実行不可。
テスト手順は `e2e_login_posting_300cases.md` に記載済み、実行チェックシートは `manual_run_sheet_20260222.md` に整備済み。

### 優先実行推奨（止まりやすいポイント）

| 優先度 | ケース範囲 | 観点 | 推奨理由 |
|--------|-----------|------|---------|
| **最優先** | SL-001, SL-011, SL-014〜017 | Slack未連携投稿、トークン失効、連打/二重クリック | 投稿失敗＋UI固まりの主要原因 |
| **最優先** | LG-008〜010 | 各ドメインでのGoogleログイン | ドメイン別の認証差異検出 |
| **高** | SL-020〜024 | 投稿中の戻る/F5/オフライン | 非同期操作の中断パターン |
| **高** | FR-008, FR-019, FR-021 | 日付連続切替/タイムアウト/複数タブ | ローディング固まりの主要原因 |
| **中** | SL-004〜007 | 長文/特殊文字/絵文字/改行大量 | ペイロード異常系 |
| **中** | EX-001〜004 | OAuth state期限切れ/拒否 | 再連携フロー検証 |

---

## 環境情報

```
実行日時: 2026-02-22 06:38 UTC
実行元: Devin AI VM (Ubuntu)
ツール: curl 7.81.0, rg 13.0.0, Chrome (Playwright)
ネットワーク: Direct (no proxy)
対象: https://nippou.up.railway.app (Railway CDN)
対象commit: ed18898
```
