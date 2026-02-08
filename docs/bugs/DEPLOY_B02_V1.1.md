# Claude Code への指示：clasp設定とB02デプロイ

**バージョン**: V1.1  
**作成日**: 2026-01-31  

---

## これは Claude Code への指示です。

---

## 目的

claspを設定し、B02（Slackチェックボックス追加）の修正をGoogle Apps Scriptにデプロイする。

---

## 前提情報

- **スクリプトID**: `18x0CJpBzuKtQKCnAYejOC45JJ4kWfbXpsa1L_vFwLbi_iLTnCcUKJHVj`
- **clasp**: v3.1.3 インストール済み
- **状態**: ログインしていない、.clasp.json なし

---

## 実行手順

### Step 1: clasp ログイン

```bash
clasp login
```

ブラウザが開いたらGoogleアカウントで認証してください。
認証完了後、ターミナルに「Authorization successful.」と表示されます。

---

### Step 2: プロジェクトをリンク

```bash
cd C:/Users/takag/00_dev/daily-report-automation-mvp
clasp clone 18x0CJpBzuKtQKCnAYejOC45JJ4kWfbXpsa1L_vFwLbi_iLTnCcUKJHVj --rootDir src
```

※ 既存のsrc/フォルダにファイルがある場合は上書き確認が出ます。

---

### Step 3: コードをプッシュ

```bash
clasp push
```

「Pushed N files.」と表示されれば成功。

---

### Step 4: 新バージョンをデプロイ

```bash
clasp deploy --description "B02 Slackチェックボックス追加"
```

---

### Step 5: デプロイURLを確認

```bash
clasp deployments
```

---

## 完了条件

1. [ ] `clasp login` が成功（Authorization successful）
2. [ ] `clasp clone` が成功（.clasp.json が作成される）
3. [ ] `clasp push` が成功（Pushed N files）
4. [ ] `clasp deploy` が成功（Created version N）
5. [ ] デプロイURLが表示される

---

## エラー時の対応

### clasp login でブラウザが開かない場合
```bash
clasp login --no-localhost
```
表示されたURLを手動でブラウザに貼り付けてください。

### clasp clone で「already exists」エラーが出た場合
手動で .clasp.json を作成：
```bash
echo '{"scriptId":"18x0CJpBzuKtQKCnAYejOC45JJ4kWfbXpsa1L_vFwLbi_iLTnCcUKJHVj","rootDir":"src"}' > .clasp.json
```

---

## 更新履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| V1.0 | 2026-01-31 | 初版作成 |
| V1.1 | 2026-01-31 | 詳細手順追加、エラー対応追加 |
