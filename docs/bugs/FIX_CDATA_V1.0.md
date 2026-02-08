# Claude Code への指示：CDATA修正と再デプロイ

**バージョン**: V1.0  
**作成日**: 2026-01-31  

---

## これは Claude Code への指示です。

---

## 背景

WEBアプリで「使い方ガイド」モーダルが閉じないバグが発生。

**エラー内容（ブラウザConsole）**:
```
Uncaught SyntaxError: Failed to execute 'write' on 'Document': Unexpected token '==='
```

**原因**:  
HTMLファイル内の`<script>`タグで`===`（厳密等価演算子）が  
GASのテンプレート処理で正しくパースされていない。

---

## タスク

### タスク1: CDATAでラップ

`src/Index.html` を編集し、`<script>`タグ内をCDATAでラップする。

**修正前（1304-1305行）**:
```html
  <script>
    // ===================================
```

**修正後**:
```html
  <script>
    //<![CDATA[
    // ===================================
```

---

**修正前（2767-2768行）**:
```javascript
    });
  </script>
```

**修正後**:
```javascript
    });
    //]]>
  </script>
```

---

### タスク2: clasp push

```bash
cd c:\Users\takag\00_dev\daily-report-automation-mvp
clasp push
```

---

### タスク3: 新しいデプロイ作成

```bash
clasp deploy --description "CDATA修正 - モーダル閉じないバグ修正"
```

---

### タスク4: 新しいURLを報告

デプロイ完了後、新しいWEBアプリURLを報告してください。

---

## 完了条件

- [ ] `<script>`タグの直後に `//<![CDATA[` が追加されている
- [ ] `</script>`タグの直前に `//]]>` が追加されている
- [ ] `clasp push` が成功
- [ ] `clasp deploy` が成功
- [ ] 新しいWEBアプリURLが取得できる

---

## 注意事項

- CDATAの記法に注意：`//<![CDATA[` と `//]]>`（JavaScriptコメント形式）
- 他の部分は変更しない

---

## 更新履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| V1.0 | 2026-01-31 | 初版作成 |
