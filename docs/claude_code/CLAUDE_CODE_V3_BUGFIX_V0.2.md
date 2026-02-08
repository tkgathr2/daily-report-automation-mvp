# Claude Code への指示：V3 バグ修正（ツール設定UI）

**バージョン**: V0.2
**作成日**: 2026-02-08

---

## これは Claude Code への指示です。

---

## SSOT

- 唯一仕様書: `docs/plan.md` 27章（V3仕様）
- 特に 27.7「ツールON/OFF設定」が根拠

---

## 背景

V3実装後のコード監査で、以下の3件のバグが発見された。
バックエンド（`src/Code.gs`）は正しく実装されているが、
フロントエンド（`src/Index.html`）のUI・保存・復元が不足している。

---

## バグ一覧

| No | 箇所 | 問題 | SSOT根拠 |
|----|------|------|----------|
| B1 | ツール設定UI（HTML） | **Slackチェックボックスが存在しない**。Gmail/Notionのみ。SSOT 27.7では Slack/Gmail/Gmail受信/Notion の4つが必要 | 27.7 |
| B2 | `saveToolSettingsUI()` | **`slack`と`gmailReceived`を保存していない**。gmail/notionのみ保存。バックエンドは`gmailReceived`対応済みだがフロントが未対応 | 27.7 |
| B3 | `loadToolSettings()` | **`settingSlack`と`gmailReceived`の復元処理がない** | 27.7 |

---

## 修正手順

### 修正1: ツール設定UIにSlackとGmail受信のチェックボックスを追加（B1）

**対象**: `src/Index.html` 1240〜1252行付近（ツール設定セクション）

**現状**:
```html
<div style="display: flex; align-items: center; gap: 15px;">
  <label>...<input type="checkbox" id="settingGmail" checked>...<span>Gmail</span></label>
  <label>...<input type="checkbox" id="settingNotion" checked>...<span>Notion</span></label>
  <button onclick="saveToolSettingsUI()">設定を保存</button>
</div>
```

**修正後（4つのチェックボックス）**:
```html
<div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
  <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 13px;">
    <input type="checkbox" id="settingSlack" checked style="width: 16px; height: 16px;">
    <span style="color: #4A154B; font-weight: bold;">Slack</span>
  </label>
  <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 13px;">
    <input type="checkbox" id="settingGmail" checked style="width: 16px; height: 16px;">
    <span style="color: #EA4335; font-weight: bold;">Gmail</span>
  </label>
  <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 13px;">
    <input type="checkbox" id="settingGmailReceived" style="width: 16px; height: 16px;">
    <span style="color: #EA4335; font-weight: bold;">Gmail受信</span>
  </label>
  <label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 13px;">
    <input type="checkbox" id="settingNotion" checked style="width: 16px; height: 16px;">
    <span style="color: #000; font-weight: bold;">Notion</span>
  </label>
  <button class="btn btn-secondary" onclick="saveToolSettingsUI()" style="padding: 5px 12px; font-size: 11px;">設定を保存</button>
</div>
```

**ポイント**:
- `settingSlack` → デフォルトchecked
- `settingGmailReceived` → デフォルト**unchecked**（SSOT 27.7: Gmail受信はデフォルトOFF）
- 既存の `settingGmail` / `settingNotion` はそのまま維持

---

### 修正2: `saveToolSettingsUI()` で全4項目を保存する（B2）

**対象**: `src/Index.html` の `saveToolSettingsUI()` 関数（2304〜2322行付近）

**現状**:
```javascript
function saveToolSettingsUI() {
  var settings = {
    gmail: document.getElementById('settingGmail').checked,
    notion: document.getElementById('settingNotion').checked
  };
  // ...
}
```

**修正後**:
```javascript
function saveToolSettingsUI() {
  var settings = {
    slack: document.getElementById('settingSlack').checked,
    gmail: document.getElementById('settingGmail').checked,
    gmailReceived: document.getElementById('settingGmailReceived').checked,
    notion: document.getElementById('settingNotion').checked
  };
  // ... 以降は変更なし
}
```

---

### 修正3: `loadToolSettings()` で全4項目を復元する（B3）

**対象**: `src/Index.html` の `loadToolSettings()` 関数（2290〜2301行付近）

**現状**:
```javascript
function loadToolSettings() {
  google.script.run
    .withSuccessHandler(function(settings) {
      document.getElementById('settingGmail').checked = settings.gmail !== false;
      document.getElementById('settingNotion').checked = settings.notion !== false;
      checkNotionLinkStatus();
    })
    // ...
}
```

**修正後**:
```javascript
function loadToolSettings() {
  google.script.run
    .withSuccessHandler(function(settings) {
      document.getElementById('settingSlack').checked = settings.slack !== false;
      document.getElementById('settingGmail').checked = settings.gmail !== false;
      document.getElementById('settingGmailReceived').checked = !!settings.gmailReceived;
      document.getElementById('settingNotion').checked = settings.notion !== false;
      checkNotionLinkStatus();
    })
    // ... 以降は変更なし
}
```

**ポイント**:
- `settingSlack`: デフォルトtrue（`!== false`）
- `settingGmailReceived`: デフォルトfalse（`!!` で明示的にboolean化）
- 既存の `settingGmail` / `settingNotion` の処理はそのまま維持

---

## 修正後のデプロイ

```powershell
cd C:\Users\takag\00_dev\daily-report-automation-mvp
clasp push --force
clasp deploy --description "V3: fix tool settings UI (Slack + Gmail received)"
```

新しいWEBアプリURLを報告すること。

---

## 完了条件

- [ ] ツール設定UIに4つのチェックボックス（Slack/Gmail/Gmail受信/Notion）が表示される
- [ ] 「設定を保存」で4項目すべてがUserPropertiesに保存される
- [ ] リロード後に4項目すべてが復元される
- [ ] Gmail受信がデフォルトOFF（unchecked）で表示される
- [ ] SlackがデフォルトON（checked）で表示される
- [ ] `clasp push` が成功
- [ ] `clasp deploy` が成功
- [ ] 新しいWEBアプリURLを報告

---

## 更新履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| V0.2 | 2026-02-08 | V3バグ修正（ツール設定UIにSlack/Gmail受信チェックボックス追加） |
