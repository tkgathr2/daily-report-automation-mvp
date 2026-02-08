# Claude Code への指示：B02 Slackチェックボックス追加

**バージョン**: V1.0  
**作成日**: 2026-01-31  

---

## これは Claude Code への指示です。

---

## 問題

「取得ツール設定」エリアにSlackチェックボックスが存在しない。
Gmail、Notionのみ表示されている。

---

## タスク

### タスク1: Slackチェックボックスを追加

`src/Index.html` の991-992行目付近を修正：

**修正前（992行目付近）**:
```html
        <div style="display: flex; align-items: center; gap: 15px;">
              <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 13px;">
                <input type="checkbox" id="settingGmail" checked style="width: 16px; height: 16px;">
```

**修正後**:
```html
        <div style="display: flex; align-items: center; gap: 15px;">
              <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 13px;">
                <input type="checkbox" id="settingSlack" checked style="width: 16px; height: 16px;">
                <span style="color: #4A154B; font-weight: bold;">Slack</span>
              </label>
              <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 13px;">
                <input type="checkbox" id="settingGmail" checked style="width: 16px; height: 16px;">
```

要点：
- `settingSlack` チェックボックスを **Gmail の前** に追加
- 色は紫色 `#4A154B`（Slackのブランドカラー）

---

### タスク2: loadToolSettings関数にSlackを追加

`src/Index.html` の `loadToolSettings()` 関数内を確認し、Slackの読み込みがなければ追加：

```javascript
document.getElementById('settingSlack').checked = settings.slack !== false;
```

---

### タスク3: saveToolSettingsUI関数にSlackを追加

`src/Index.html` の `saveToolSettingsUI()` 関数内を確認し、Slackの保存がなければ追加：

```javascript
var settings = {
  slack: document.getElementById('settingSlack').checked,
  gmail: document.getElementById('settingGmail').checked,
  notion: document.getElementById('settingNotion').checked
};
```

---

### タスク4: clasp push & deploy

```bash
cd c:\Users\takag\00_dev\daily-report-automation-mvp
clasp push
clasp deploy --description "B02 Slackチェックボックス追加"
```

---

### タスク5: 新しいURLを報告

デプロイ完了後、新しいWEBアプリURLを報告してください。

---

## 完了条件

- [ ] Slackチェックボックス（紫色 #4A154B）がGmailの前に追加されている
- [ ] `loadToolSettings()` でSlack設定を読み込んでいる
- [ ] `saveToolSettingsUI()` でSlack設定を保存している
- [ ] `clasp push` が成功
- [ ] `clasp deploy` が成功
- [ ] 新しいWEBアプリURLが取得できる

---

## 期待する表示順

```
取得ツール設定: [✓] Slack  [✓] Gmail  [✓] Notion  [設定を保存]
                 (紫)       (赤)        (黒)
```

---

## 更新履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| V1.0 | 2026-01-31 | B02 Slackチェックボックス追加 |
