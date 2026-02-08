# Claude Code への指示：モーダル閉じる機能をインライン修正

**バージョン**: V1.0  
**作成日**: 2026-01-31  

---

## これは Claude Code への指示です。

---

## 背景

「使い方ガイド」モーダルがOKボタン/×ボタンで閉じない。
JavaScriptのイベントリスナーが正しく動作していない。

---

## 解決方針

**インラインonclick属性を直接追加** して確実に動作させる。

---

## タスク

### タスク1: ×ボタンにonclickを追加

`src/Index.html` の1223行目付近を修正：

**修正前**:
```html
<button id="tutorial-close-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
```

**修正後**:
```html
<button id="tutorial-close-btn" onclick="document.getElementById('tutorial-modal').style.display='none';" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
```

---

### タスク2: OKボタンにonclickを追加

`src/Index.html` の1299行目付近を修正：

**修正前**:
```html
<button id="tutorial-ok-btn" style="margin-top: 24px; width: 100%; padding: 12px; background: #3498db; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;">OK</button>
```

**修正後**:
```html
<button id="tutorial-ok-btn" onclick="document.getElementById('tutorial-modal').style.display='none';" style="margin-top: 24px; width: 100%; padding: 12px; background: #3498db; color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;">OK</button>
```

---

### タスク3: モーダル背景クリックでも閉じるように修正

`src/Index.html` の1218行目付近を修正：

**修正前**:
```html
<div id="tutorial-modal" class="hidden" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
```

**修正後**:
```html
<div id="tutorial-modal" class="hidden" onclick="if(event.target===this)this.style.display='none';" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
```

---

### タスク4: clasp push & deploy

```bash
cd c:\Users\takag\00_dev\daily-report-automation-mvp
clasp push
clasp deploy --description "モーダル閉じる機能をインライン修正"
```

---

### タスク5: 新しいURLを報告

デプロイ完了後、新しいWEBアプリURLを報告してください。

---

## 完了条件

- [ ] ×ボタンに `onclick="document.getElementById('tutorial-modal').style.display='none';"` が追加されている
- [ ] OKボタンに `onclick="document.getElementById('tutorial-modal').style.display='none';"` が追加されている
- [ ] モーダル背景に `onclick="if(event.target===this)this.style.display='none';"` が追加されている
- [ ] `clasp push` が成功
- [ ] `clasp deploy` が成功
- [ ] 新しいWEBアプリURLが取得できる

---

## ポイント

- JavaScriptのイベントリスナーに頼らず、HTML属性で直接制御
- GASのテンプレート処理でも確実に動作
- シンプルで確実な解決策

---

## 更新履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| V1.0 | 2026-01-31 | インラインonclick方式で修正 |
