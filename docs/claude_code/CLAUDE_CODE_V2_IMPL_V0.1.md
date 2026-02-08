# Claude Code への指示：V2（テンプレート変更＋翌日引き継ぎ）実装 V0.1

## これは Claude Code への指示です。

---

## 目的

`docs/plan.md`（SSOT）の **「26. V2（テンプレート変更＋入力欄追加＋翌日引き継ぎ）仕様」** に従い、V2を標準として動作するように `src/Index.html` と `src/Code.gs` を実装・調整してください。

---

## 参照（SSOT）

- `docs/plan.md`（特に 26章）
- `docs/constitution/最終憲法_V1.2.md`（`docs/plan.md` 上書き例外の根拠）

---

## 変更対象ファイル

- `src/Index.html`
- `src/Code.gs`

---

## SEC-01（シークレット注意）

この工程ではシークレット情報が必要になる可能性があります。SEC-01 で停止します。

（Slack Incoming Webhook URL を Script Properties に設定する工程が必要になります。値そのものはファイル・ログ・チャットに残さないでください。）

---

## 段階実行（V0.x）

### V0.1 準備（現状確認）

#### 作業

1. `docs/plan.md` の 26章を読み、実装対象（テンプレ/見出し/Slack方式/引き継ぎ仕様）を確認する
2. `src/Index.html` / `src/Code.gs` の現状が「Slack OAuth 前提」になっていることを確認する

#### 完了条件

- 次のV0.2以降で、どの関数・UIが影響を受けるか把握できている

---

### V0.2 テンプレ見出しの統一（旧→新）

#### 目的

SSOT（26.2）に従い、見出しを以下へ統一する：

- 旧：`【売上・利益に関わるポイント】`
- 新：`【売上・利益・経費削減に関わるポイント】`

#### 作業（最低限の対象）

- `src/Index.html`
  - 画面上の見出し
  - `validateSectionsV2()` のセクション名
  - `copyToClipboardV2()` の見出し文言
  - `showPreview()` の見出し文言
- `src/Code.gs`
  - `formatSlackMessageV2()` の見出し文言

#### 完了条件

- 上記の旧見出しが残っていない
- 画面表示・コピー・Slack本文が同じ見出しになる

---

### V0.3 Slack送信方式を Incoming Webhook に変更（OAuth不使用）

#### 目的

SSOT（26.6）に従い、Slack送信は **Incoming Webhook** で実行する。
「Slack連携（認可）」は不要とし、OAuth前提のUI/処理に依存しない。

#### 作業（バックエンド：`src/Code.gs`）

1. Script Properties（ScriptProperties）に `SLACK_WEBHOOK_URL` を保持する前提で、Webhook URL取得関数を用意する（例：`getSlackWebhookUrl_()`）
2. `sendToSlackV2(reportData)` を **Incoming Webhook** 送信に差し替える
   - Webhook URL未設定：SSOTのエラーメッセージ方針に従い、ユーザーに分かるエラー文字列を返す
   - 送信成功時：`saveNextTasks(reportData.nextTasks)` を呼び、成功メッセージを返す
   - 送信失敗時：失敗メッセージを返す（HTTPレスポンスをログに残す）

※ OAuth関連関数（`getSlackUserToken_()` / `slackApiPost_()` / OAuthコールバック処理 等）は、V2の送信処理が依存しない状態にしてください（削除でも残置でも可。ただしV2の送信はWebhookで動作すること）。

#### 作業（フロント：`src/Index.html`）

1. 「Slack未連携」「Slack連携（認可）」の表示・ボタンを撤去または非表示にする
2. `btnSendSlack` は常に押下可能にする（OAuth連携状態に依存しない）
3. `sendSlackV2()` の success handler は、Webhook送信の戻り値（文字列）でも正常に成功扱いできるようにする
   - OAuthの `channelId` / `messageTs` 前提の完了画面リンク生成には依存しない

#### 完了条件

- ブラウザ操作で「Slackに投稿」が成功し、Slackに本文が投稿される
- 投稿成功時に `NEXT_TASKS_DATA` が更新される（翌日引き継ぎ用）

---

### V0.4 箇条書き記号を「⚫︎」に統一（プレーンテキスト化）

#### 目的

SSOT（26.2）に従い、コピー/Slack投稿の本文は **プレーンテキスト**で、箇条書きは **「⚫︎」** を使う。

#### 作業（`src/Index.html`）

1. `convertHtmlToSlack()` の変換結果で、箇条書き（ul/li）の行頭が `⚫︎ ` になるよう調整する
   - 既存の `• ` を出している箇所は `⚫︎ ` に統一
2. `copyToClipboardV2()` が 26.2のテンプレート形（見出し・改行・記号）になることを確認する

#### 完了条件

- コピー結果がSSOT（26.2）テンプレと一致する
- Slack投稿本文もSSOT（26.2）テンプレと一致する

---

### V0.5 日付・氏名の初期表示をSSOT準拠にする（JST/Googleアカウント）

#### 目的

SSOT（26.3）に従い、日付はJSTの `YYYY年MM月DD日`、氏名はGoogleアカウント由来を優先する。

#### 作業

- `src/Code.gs`
  - `getInitialDataV2()` の戻り値をSSOTに合わせて使用する（`date`, `userName`, `needsNameInput`, `nextTasks`）
- `src/Index.html`
  - `initV2()` で `getInitialDataV2()` の `date` と `userName` を画面に反映する
  - `needsNameInput` が true の場合のみ、手動入力UI（既存の `manualUserName` 等）を表示する
  - localStorageで名前登録する挙動がある場合、SSOTに反しない形（フォールバック時のみ等）に調整する

#### 完了条件

- 初期表示で日付が `YYYY年MM月DD日` 形式（JST）になる
- 取得できる環境では氏名が自動表示される
- 取得できない場合のみ手動入力にフォールバックする

---

### V0.6 「今日やったこと」の自動反映＋「今日の予定を取得」ボタン（再取得）

#### 目的

SSOT（26.4）に従い、初期表示で当日の予定を自動反映し、ボタンで再取得できる。

#### 作業（`src/Index.html`）

1. 初期表示で当日の予定取得処理（例：`loadCalendarEvents()`）が動くことを確認し、動かない場合は `window.load` 等で呼ぶ
2. 画面のボタン文言を **「今日の予定を取得」** にし、押下時は「当日」を再取得する
   - 日付ピッカー等で別日取得できる実装がある場合、V2では「当日固定」にする（UI非表示または当日固定）

#### 完了条件

- 初期表示で「今日やったこと」に当日の予定が入る
- 「今日の予定を取得」ボタンで当日の予定を再取得できる

---

## 動作確認（最低限）

1. 初期表示：日付・氏名・次すること引き継ぎが反映される
2. カレンダー：初期表示で予定が入る／ボタンで再取得できる
3. バリデーション：4セクションのいずれかが未入力（空白のみ含む）だと送信できない
4. コピー：テンプレ（26.2）と完全一致でコピーされる
5. Slack投稿：Incoming Webhookで投稿され、テンプレ（26.2）と完全一致
6. 引き継ぎ：Slack送信成功で保存され、日付が変わると次回表示される（直近送信日まで遡る）

---

## 完了報告フォーマット（Claude Code → Chat）

以下を日本語で簡潔に報告してください：

- 変更したファイル一覧
- 動作確認の結果（上の最低限6項目）
- Webhook URL 設定が必要になった場合：SEC-01で停止した旨（値は出さない）

