# Claude Code への指示：B02 修正のデプロイ

**バージョン**: V1.0  
**作成日**: 2026-01-31  

---

## これは Claude Code への指示です。

---

## 目的

B02（Slackチェックボックス追加）の修正をGoogle Apps Scriptにデプロイする。

---

## 実行手順

### 1. claspでプッシュ

```bash
cd C:/Users/takag/00_dev/daily-report-automation-mvp
clasp push
```

### 2. プッシュが成功したら、新しいバージョンをデプロイ

```bash
clasp deploy --description "B02 Slackチェックボックス追加"
```

### 3. デプロイURLを確認

```bash
clasp deployments
```

---

## 完了条件

1. `clasp push` が成功する
2. `clasp deploy` が成功する
3. デプロイURLが表示される

---

## エラー時の対応

- `.clasp.json` が存在しない場合 → `clasp clone <scriptId>` でクローン
- 認証エラーの場合 → `clasp login` で再認証

---

## 更新履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| V1.0 | 2026-01-31 | 初版作成 |
