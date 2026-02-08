# Claude Code への指示：V2 デプロイ（clasp push / deploy）V0.1

## これは Claude Code への指示です。

---

## 目的

V2の修正をGASへ反映し、新しいデプロイを作成して動作確認できる状態にする。

---

## 前提

- 作業ディレクトリ：`C:\Users\takag\00_dev\daily-report-automation-mvp`
- `.clasp.json` の `scriptId` が存在すること

---

## SEC-01（シークレット注意）

この工程ではシークレット情報が必要になる可能性があります。SEC-01 で停止します。

- 例：`SLACK_WEBHOOK_URL` が未設定で、動作確認に必要になった場合
- シークレット値はチャット・md・ログに残さない

---

## 手順（V0.1）

1. 変更差分を確認

```powershell
cd C:\Users\takag\00_dev\daily-report-automation-mvp
git status
```

2. clasp でGASへ反映

```powershell
clasp push
```

3. 新しいデプロイを作成

```powershell
clasp deploy --description "V2: template + carryover + webhook"
```

4. デプロイURLを取得（出力からURLを確認）
   - 新しいWEBアプリURLをChatに報告する

---

## 完了条件

- `clasp push` が成功
- `clasp deploy` が成功
- 新しいWEBアプリURLを報告できた

