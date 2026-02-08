# Claude Code への指示：V3 全バグ修正＋改善

**バージョン**: V0.6
**作成日**: 2026-02-08

---

## これは Claude Code への指示です。

---

## SSOT

- 唯一仕様書: `docs/plan.md` 26章（V2）＋27章（V3）

---

## 修正一覧（6件）

| No | 種別 | 内容 |
|----|------|------|
| B4 | 🔴バグ | `isNotionLinked()` と `saveNotionToken()` が Code.gs に存在しない |
| B5 | 🔴バグ | `APP_URL` が古いデプロイ@40のURL |
| N1 | 🟡改善 | `isSlackLinked` 変数の役割明確化（コメント追加） |
| N2 | 🟡改善 | `getNextTasks()` の「今日のデータなら表示しない」ロジックのコメント補足 |
| N3 | 🟡改善 | `CURRENT_VERSION` を V3対応バージョンに更新 |
| N4 | 🟡改善 | `loadCalendarEvents()` 死コードを削除 |

---

## 修正手順

### B4: `isNotionLinked()` と `saveNotionToken()` を Code.gs に追加

`src/Code.gs` の V3追加関数セクション末尾（`getAllToolHistoryV3` の後）に以下を追加：

```javascript
/**
 * Notion連携状態を確認
 * @returns {boolean} Token設定済みならtrue
 */
function isNotionLinked() {
  try {
    var token = PropertiesService.getScriptProperties()
      .getProperty(PROPERTY_NOTION_TOKEN);
    return !!token;
  } catch (e) {
    Logger.log('isNotionLinked error: ' + e.message);
    return false;
  }
}

/**
 * Notion Integration Tokenを保存
 * @param {string} token - Notion Integration Token
 * @returns {boolean} 保存成功/失敗
 */
function saveNotionToken(token) {
  try {
    if (!token || !token.trim()) {
      return false;
    }
    PropertiesService.getScriptProperties()
      .setProperty(PROPERTY_NOTION_TOKEN, token.trim());
    Logger.log('saveNotionToken: 保存完了');
    return true;
  } catch (e) {
    Logger.log('saveNotionToken error: ' + e.message);
    return false;
  }
}
```

---

### B5: `APP_URL` を最新デプロイURLに更新

`src/Code.gs` 44行付近：

**変更前**:
```javascript
const APP_URL = 'https://script.google.com/a/macros/takagi.bz/s/AKfycbwQw2aK8wTUBqUIaufRFvnr697f3JHrT53prxF69BMF4H6JPITtFP9_8aWpERJw9PdnUg/exec';
```

**変更後**:
```javascript
const APP_URL = 'https://script.google.com/a/macros/takagi.bz/s/AKfycbyRu1Sye5cpmXqoqfGOI2BBReFh4cvqhkSr9CW7JS2XyhY7q32tv3A5gLG5rGwNtO5a4Q/exec';
```

---

### N1: `isSlackLinked` 変数にコメント追加

`src/Index.html` 1594行付近：

**変更前**:
```javascript
let isSlackLinked = false;
```

**変更後**:
```javascript
let isSlackLinked = false;  // V3: Slack OAuth連携状態（履歴取得用。日報送信はWebhookなので不要）
```

---

### N2: `getNextTasks()` にSSOT準拠コメント追加

`src/Code.gs` `getNextTasks()` 関数内（899行付近）：

**変更前**:
```javascript
    // 今日の日付と比較（今日のデータなら表示しない＝すでに送信済み）
    const today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
    if (data.date === today) {
      return '';
    }
```

**変更後**:
```javascript
    // SSOT 26.8: 「直近送信日まで遡って引き継ぐ」
    // 今日送信した場合は、同日中は引き継ぎ表示しない（翌日以降に表示される）
    // 同日複数回送信は「最後に送信した内容が勝つ」（saveNextTasksで毎回上書き）
    const today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
    if (data.date === today) {
      return '';
    }
```

---

### N3: `CURRENT_VERSION` を更新

`src/Index.html` 3167行付近：

**変更前**:
```javascript
var CURRENT_VERSION = '3.3.0';
```

**変更後**:
```javascript
var CURRENT_VERSION = '4.0.0';  // V3: ツール連携＋日付指定UI
```

---

### N4: `loadCalendarEvents()` 死コードを削除

`src/Index.html` の `loadCalendarEvents()` 関数全体（3221〜3285行付近）を削除。

この関数は `getAllToolHistoryV3()` に置き換え済みで、どこからも呼ばれていない。

**削除前に確認**: `loadCalendarEvents` が他に呼ばれていないか grep で確認すること。
呼ばれている箇所があれば `loadEventsForSelectedDate()` に置き換えてから削除。

---

## 修正後のデプロイ

```powershell
cd C:\Users\takag\00_dev\daily-report-automation-mvp
clasp push --force
clasp deploy --description "V3: all bugfix (B4 B5 N1-N4)"
```

新しいWEBアプリURLを報告すること。

---

## 完了条件

- [ ] B4: `isNotionLinked()` と `saveNotionToken()` が Code.gs に存在する
- [ ] B5: `APP_URL` が最新デプロイURLになっている
- [ ] N1: `isSlackLinked` にコメントが付いている
- [ ] N2: `getNextTasks()` にSSOT準拠コメントが付いている
- [ ] N3: `CURRENT_VERSION` が `4.0.0` になっている
- [ ] N4: `loadCalendarEvents()` 死コードが削除されている
- [ ] `clasp push` が成功
- [ ] `clasp deploy` が成功
- [ ] 新しいWEBアプリURLを報告
