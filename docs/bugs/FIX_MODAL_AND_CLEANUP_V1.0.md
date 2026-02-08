# Claude Code への指示：モーダル修正 + ファイル整理

**バージョン**: V1.0  
**作成日**: 2026-01-31  

---

## これは Claude Code への指示です。

---

## 目的

1. 「使い方ガイド」モーダルがOKボタンで閉じるように修正
2. プロジェクトの不要ファイルを整理
3. GAS側のファイル構造を確認

---

## タスク1: モーダル閉じる機能をインライン修正

### 1-1: ×ボタンにonclickを追加

`src/Index.html` の1223行目付近を修正：

**修正前**:
```html
<button id="tutorial-close-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
```

**修正後**:
```html
<button id="tutorial-close-btn" onclick="document.getElementById('tutorial-modal').style.display='none';" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
```

### 1-2: OKボタンにonclickを追加

`src/Index.html` の1299行目付近を修正：

**修正前**:
```html
<button id="tutorial-ok-btn" style="margin-top: 24px; width: 100%; padding: 12px; background: #3498db; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;">OK</button>
```

**修正後**:
```html
<button id="tutorial-ok-btn" onclick="document.getElementById('tutorial-modal').style.display='none';" style="margin-top: 24px; width: 100%; padding: 12px; background: #3498db; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;">OK</button>
```

### 1-3: モーダル背景クリックでも閉じるように

`src/Index.html` の1218行目付近を修正：

**修正前**:
```html
<div id="tutorial-modal" class="hidden" style="position: fixed; ...
```

**修正後**:
```html
<div id="tutorial-modal" class="hidden" onclick="if(event.target===this)this.style.display='none';" style="position: fixed; ...
```

---

## タスク2: 不要ファイルを削除

### 2-1: ルート直下の過去指示ファイルを削除

```bash
cd c:\Users\takag\00_dev\daily-report-automation-mvp
rm CLAUDE_CODE_Ver01_INSTRUCTION_WEBAPP.md
rm CLAUDE_CODE_Ver02_VERIFICATION_INSTRUCTION.md
rm CLAUDE_CODE_Ver03_DOCUMENTATION_COMMIT_INSTRUCTION.md
rm CLAUDE_CODE_Ver04_CLEANUP_INSTRUCTION.md
rm CLAUDE_CODE_Ver05_NAME_UPDATE_INSTRUCTION.md
rm CLAUDE_CODE_Ver06_INSTRUCTION_FINAL.md
rm CLAUDE_CODE_Ver07_INSTRUCTION.md
rm CLAUDE_CODE_Ver08_DEPLOY_VERIFY_INSTRUCTION.md
rm CLAUDE_CODE_Ver11_DEPLOY_VERIFY_INSTRUCTION.md
rm CLAUDE_CODE_Ver12_DEPLOY_VERIFY_INSTRUCTION.md
```

### 2-2: ルート直下の過去バージョンファイルを削除

```bash
rm V1.0.md
rm V1.1.md
rm V1.3.md
rm V1.4.md
rm V1.5.md
rm V1.6.md
rm V1.7.md
```

---

## タスク3: GAS側のファイル構造を確認

### 3-1: GAS側のファイルを取得して確認

```bash
clasp pull --rootDir temp_gas_check
```

### 3-2: ファイル一覧を確認

```bash
ls temp_gas_check/
```

### 3-3: 重複ファイルがあれば報告

もし `コード.js` や `Code.gs` 以外のGSファイルがあれば報告してください。

### 3-4: 確認後、一時フォルダを削除

```bash
rm -rf temp_gas_check
```

---

## タスク4: clasp push & deploy

```bash
clasp push
clasp deploy --description "モーダル修正+ファイル整理"
```

---

## タスク5: 新しいURLを報告

デプロイ完了後、新しいWEBアプリURLを報告してください。

---

## 完了条件

- [ ] ×ボタンにonclickが追加されている
- [ ] OKボタンにonclickが追加されている
- [ ] モーダル背景にonclickが追加されている
- [ ] ルート直下の不要ファイル（16個）が削除されている
- [ ] GAS側のファイル構造を確認した
- [ ] `clasp push` が成功
- [ ] `clasp deploy` が成功
- [ ] 新しいWEBアプリURLが取得できる

---

## 削除対象ファイル一覧（計16個）

```
CLAUDE_CODE_Ver01_INSTRUCTION_WEBAPP.md
CLAUDE_CODE_Ver02_VERIFICATION_INSTRUCTION.md
CLAUDE_CODE_Ver03_DOCUMENTATION_COMMIT_INSTRUCTION.md
CLAUDE_CODE_Ver04_CLEANUP_INSTRUCTION.md
CLAUDE_CODE_Ver05_NAME_UPDATE_INSTRUCTION.md
CLAUDE_CODE_Ver06_INSTRUCTION_FINAL.md
CLAUDE_CODE_Ver07_INSTRUCTION.md
CLAUDE_CODE_Ver08_DEPLOY_VERIFY_INSTRUCTION.md
CLAUDE_CODE_Ver11_DEPLOY_VERIFY_INSTRUCTION.md
CLAUDE_CODE_Ver12_DEPLOY_VERIFY_INSTRUCTION.md
V1.0.md
V1.1.md
V1.3.md
V1.4.md
V1.5.md
V1.6.md
V1.7.md
```

---

## 更新履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| V1.0 | 2026-01-31 | モーダル修正+ファイル整理を統合 |
