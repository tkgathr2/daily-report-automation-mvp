# Claude Code への指示：重複ファイル削除と再デプロイ

**バージョン**: V1.0  
**作成日**: 2026-01-31  

---

## これは Claude Code への指示です。

---

## 背景

`clasp push` 後、WEBアプリで以下のエラーが発生：

```
SyntaxError: Identifier 'PROPERTY_SLACK_CLIENT_ID' has already been declared (行 1、ファイル「コード」)
```

## 原因

`src` フォルダに重複ファイルが存在：
- `Code.gs` （メインファイル、維持）
- `コード.js` （重複ファイル、削除対象）

両ファイルが `clasp push` でアップロードされ、GAS側で定数の重複宣言エラーが発生。

---

## タスク

### タスク1: 重複ファイルを削除

```bash
cd c:\Users\takag\00_dev\daily-report-automation-mvp
rm src/コード.js
```

### タスク2: 再プッシュ

```bash
clasp push
```

### タスク3: 再デプロイ

```bash
clasp deploy --description "重複ファイル削除後の再デプロイ"
```

### タスク4: 新しいURLを報告

デプロイ完了後、新しいWEBアプリURLを報告してください。

---

## 完了条件

- [ ] `src/コード.js` が削除されている
- [ ] `clasp push` が成功
- [ ] `clasp deploy` が成功
- [ ] 新しいWEBアプリURLが取得できる

---

## 注意事項

- `Code.gs` は削除しないこと
- `Index.html` と `appsscript.json` もそのまま維持

---

## 更新履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| V1.0 | 2026-01-31 | 初版作成 |
