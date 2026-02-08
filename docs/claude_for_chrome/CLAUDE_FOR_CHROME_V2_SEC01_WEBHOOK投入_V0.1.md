# Claude For Chrome：V2 SEC-01 Webhook投入（SLACK_WEBHOOK_URL）V0.1

## これは Claude For Chrome への指示です。

---

## 目的

V2のSlack送信は **Slack Incoming Webhook** を使用する。  
そのため、GASの Script Properties に `SLACK_WEBHOOK_URL` を設定する。

---

## 重要（シークレット停止ルール）

この工程ではシークレット情報が必要になる可能性があります。自動入力は行いません。SEC-01 で停止します。

シークレット検知条件（例）：
- 「Webhook URL」「Token」「Secret」「API Key」等の表示
- URLが `https://hooks.slack.com/...` の形式で表示される

検知したら**その場で操作停止**し、以下をユーザー（高木）に案内する：

1. 表示されているシークレットを手動でコピーしてください
2. Apps Script の「プロジェクトの設定」→「スクリプト プロパティ」を開いてください
3. `SLACK_WEBHOOK_URL` に貼り付けて保存してください
4. 画面は閉じるか、そのままでOKです
5. Chat に戻り「進めて」と入力してください

---

## 対象プロジェクトの識別情報

- GAS scriptId：`1BkBflFikzsT4yiQr6NWzCbWwcTkwKV2PmBqKlPgwBuO67es-2TVeC5AZ`

---

## 手順（V0.1）

### 1) Slack側：Incoming Webhook URL を用意する

1. ブラウザで Slack API の「Your Apps」を開く  
   - 画面に「Your Apps」「Create New App」「Apps」等が見える状態にする
2. 既存の該当アプリがある場合：それを開く  
   無い場合：Incoming Webhook を使えるアプリを作成するフローに進む
3. 左メニューから「Incoming Webhooks」を開く
4. 「Add New Webhook to Workspace」等で、送信先チャンネルを選び、Webhookを作成する

#### SEC-01（ここで停止）

Webhook URL（`https://hooks.slack.com/...`）が表示されたら**停止**し、ユーザーに手動コピーを依頼する（上の固定手順）。

---

### 2) GAS側：Script Properties に `SLACK_WEBHOOK_URL` を設定する

1. Apps Script のダッシュボード（最近開いたプロジェクト一覧）を開く
2. 対象プロジェクトを開く  
   - scriptId が一致するものを開く（上のscriptId参照）
3. 左メニュー「プロジェクトの設定」（歯車）を開く
4. 「スクリプト プロパティ」を開く
5. 新規追加：キー `SLACK_WEBHOOK_URL`、値（Webhook URL）を貼り付けて保存する

#### SEC-01（ここで停止）

値の貼り付けはユーザーが手動で行う。Claude For Chrome は貼り付け・保存の直前で止めること。

---

## 完了条件

- GASのスクリプトプロパティに `SLACK_WEBHOOK_URL` が保存された
- シークレット値はチャット・md・ログに残していない

