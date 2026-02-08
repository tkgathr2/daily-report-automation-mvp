# Claude Code への指示：B02 設定保存修正のデプロイ

**バージョン**: V1.0  
**作成日**: 2026-01-31  

---

## これは Claude Code への指示です。

---

## 背景

Slackチェックボックスをオフにして保存 → リロード後にオンに戻る問題。

**原因**: 古いデータに`slack`プロパティがなく、`getToolSettings()`がundefinedを返していた。

**修正済み**: Code.gsの`getToolSettings()`を修正済み（ローカル）

---

## タスク

### タスク1: 修正内容を確認

`src/Code.gs` の `getToolSettings()` 関数が以下のように修正されていることを確認：

```javascript
function getToolSettings() {
  try {
    const dataStr = PropertiesService.getUserProperties()
      .getProperty(USER_PROPERTY_TOOL_SETTINGS);
    
    if (!dataStr) {
      return { slack: true, gmail: true, notion: true };
    }
    
    const settings = JSON.parse(dataStr);
    // 古いデータにslackがない場合のデフォルト値を設定
    return {
      slack: settings.slack !== undefined ? settings.slack : true,
      gmail: settings.gmail !== undefined ? settings.gmail : true,
      notion: settings.notion !== undefined ? settings.notion : true
    };
  } catch (e) {
    Logger.log('getToolSettings error: ' + e.message);
    return { slack: true, gmail: true, notion: true };
  }
}
```

---

### タスク2: clasp push & deploy

```bash
cd c:\Users\takag\00_dev\daily-report-automation-mvp
clasp push
clasp deploy --description "B02 設定保存修正"
```

---

### タスク3: 新しいURLを報告

デプロイ完了後、新しいWEBアプリURLを報告してください。

---

## 完了条件

- [ ] `getToolSettings()` が修正されている
- [ ] `clasp push` が成功
- [ ] `clasp deploy` が成功
- [ ] 新しいWEBアプリURLが取得できる

---

## 更新履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| V1.0 | 2026-01-31 | B02 設定保存修正 |
