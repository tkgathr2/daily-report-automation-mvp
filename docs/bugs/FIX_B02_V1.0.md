# Claude Code への指示：B02 Slackチェックボックス追加

**バージョン**: V1.0  
**作成日**: 2026-01-31  
**対象バグ**: B02（Slack履歴 ON/OFF）

---

## これは Claude Code への指示です。

---

## バグ概要

**問題**: 「取得ツール設定」エリアにSlackのチェックボックスが存在しない  
**原因**: フロントエンドにSlackチェックボックスUIが実装されていない  
**影響**: ユーザーがSlack履歴のON/OFFを切り替えられない

---

## 修正箇所

### 1. HTML修正（Index.html）

**場所**: 約993行付近（取得ツール設定エリア）

**現在のコード**:
```html
<label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 13px;">
  <input type="checkbox" id="settingGmail" checked style="width: 16px; height: 16px;">
  <span style="color: #EA4335; font-weight: bold;">Gmail</span>
</label>
```

**修正内容**: Gmailの前にSlackチェックボックスを追加

```html
<label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 13px;">
  <input type="checkbox" id="settingSlack" checked style="width: 16px; height: 16px;">
  <span style="color: #4A154B; font-weight: bold;">Slack</span>
</label>
<label style="display: flex; align-items: center; gap: 5px; cursor: pointer; font-size: 13px;">
  <input type="checkbox" id="settingGmail" checked style="width: 16px; height: 16px;">
  <span style="color: #EA4335; font-weight: bold;">Gmail</span>
</label>
```

---

### 2. JavaScript修正（Index.html - loadToolSettings関数）

**場所**: 約2001-2013行

**現在のコード**:
```javascript
function loadToolSettings() {
  google.script.run
    .withSuccessHandler(function(settings) {
      document.getElementById('settingGmail').checked = settings.gmail !== false;
      document.getElementById('settingNotion').checked = settings.notion !== false;
      // Notion連携状態を確認
      checkNotionLinkStatus();
    })
    .withFailureHandler(function(error) {
      console.error('loadToolSettings error:', error);
    })
    .getToolSettings();
}
```

**修正内容**: settingSlackの処理を追加

```javascript
function loadToolSettings() {
  google.script.run
    .withSuccessHandler(function(settings) {
      document.getElementById('settingSlack').checked = settings.slack !== false;
      document.getElementById('settingGmail').checked = settings.gmail !== false;
      document.getElementById('settingNotion').checked = settings.notion !== false;
      // Notion連携状態を確認
      checkNotionLinkStatus();
    })
    .withFailureHandler(function(error) {
      console.error('loadToolSettings error:', error);
    })
    .getToolSettings();
}
```

---

### 3. JavaScript修正（Index.html - saveToolSettingsUI関数）

**場所**: 約2015-2033行

**現在のコード**:
```javascript
function saveToolSettingsUI() {
  var settings = {
    gmail: document.getElementById('settingGmail').checked,
    notion: document.getElementById('settingNotion').checked
  };
  // ...
}
```

**修正内容**: slack設定を追加

```javascript
function saveToolSettingsUI() {
  var settings = {
    slack: document.getElementById('settingSlack').checked,
    gmail: document.getElementById('settingGmail').checked,
    notion: document.getElementById('settingNotion').checked
  };
  // ...
}
```

---

## 完了条件

1. [ ] 「取得ツール設定」エリアに「Slack」チェックボックスが表示される
2. [ ] Slackチェックボックスの色は紫（#4A154B）
3. [ ] チェックON/OFFで設定が保存される
4. [ ] チェックOFFで「予定を取得」時にSlack履歴が取得されない
5. [ ] 既存のGmail、Notionチェックボックスに影響がない

---

## テスト手順

```
1. WEBアプリにアクセス
2. 「取得ツール設定」エリアにSlackチェックボックスが表示されることを確認
3. Slackチェックをオフにする
4. 「設定を保存」をクリック
5. 「予定を取得」をクリック
6. 「今日やったこと」エリアに[Slack]履歴が表示されないことを確認
7. Slackチェックをオンに戻す
8. 「設定を保存」→「予定を取得」
9. [Slack]履歴が表示されることを確認
```

---

## 注意事項

- Code.gs側の修正は不要（既にslack設定のロジックが実装済み）
- デプロイ後に動作確認が必要

---

## 更新履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| V1.0 | 2026-01-31 | 初版作成 |
