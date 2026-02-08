# Claude For Chrome：V2 SEC-01 GASスクリプトプロパティ投入（SLACK_WEBHOOK_URL）V0.2

## これは Claude For Chrome への指示です。

---

## 目的

Slack Incoming Webhook URL（ユーザーが既に取得済み）を、Apps Script の Script Properties に設定する。

---

## 重要（シークレット停止ルール / SEC-01）

この工程ではシークレット情報が必要になります。自動入力は行いません。SEC-01 で停止します。

Claude For Chrome は、Webhook URLの**コピー・貼り付け・保存**を行ってはいけません。
ユーザー（高木）が手動で実施します。

---

## 対象プロジェクトの識別情報

- GAS scriptId：`1BkBflFikzsT4yiQr6NWzCbWwcTkwKV2PmBqKlPgwBuO67es-2TVeC5AZ`

---

## 手順（V0.2）

### 1) Apps Script を開く

1. Apps Script のプロジェクト一覧を開く
2. 対象プロジェクトを開く（scriptId が一致するもの）

### 2) Script Properties を開く

1. 左メニューの「プロジェクトの設定」（歯車）を開く
2. 「スクリプト プロパティ」を開く

### 3) SEC-01 で停止（ユーザー手動で貼り付け）

この画面が開けたら、ここで操作を止めてユーザーに以下を案内する（固定文）：

1. Webhook URL を手動でコピーしてください
2. スクリプトプロパティにキー `SLACK_WEBHOOK_URL` を追加してください（既にあれば値を更新）
3. 値欄にWebhook URLを貼り付けて保存してください
4. Chat に戻り「進めて」と入力してください

---

## 完了条件

- GASのスクリプトプロパティに `SLACK_WEBHOOK_URL` が保存された
- シークレット値はチャット・md・ログに残していない

