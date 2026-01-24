# V3 仕様書（Plan）

## ドキュメント情報

| 項目 | 内容 |
|------|------|
| 文書名 | 簡単日報くん V3 仕様書 |
| バージョン | 3.0（最終100点版） |
| 作成日 | 2026-01-24 |
| 最終更新日 | 2026-01-24 |
| フェーズ | Plan（仕様書作成）完了 |
| ステータス | 最終100点版 → Impl移行可 |
| 関連要件定義書 | docs/specs/V3_requirements_ASK.md |
| 前提バージョン | V2 |

---

## 1. 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| src/Code.gs | ツール連携関数追加（Slack/Gmail/Notion） |
| src/Index.html | 設定UI追加、取得ボタン変更 |

---

## 2. Code.gs への追加

### 2.1 追加する定数

```javascript
// ============================================
// V3追加定数
// ============================================

// ユーザープロパティキー（ツール設定）
const USER_PROPERTY_TOOL_SETTINGS = 'TOOL_SETTINGS';

// スクリプトプロパティキー（Notion）
const PROPERTY_NOTION_TOKEN = 'NOTION_INTEGRATION_TOKEN';

// 取得件数上限
const MAX_ITEMS_PER_TOOL = 20;
```

### 2.2 ツール設定関連関数

```javascript
/**
 * ツール設定を取得
 * @returns {Object} {slack: boolean, gmail: boolean, notion: boolean}
 */
function getToolSettings() {
  try {
    const dataStr = PropertiesService.getUserProperties()
      .getProperty(USER_PROPERTY_TOOL_SETTINGS);
    
    if (!dataStr) {
      // デフォルト設定（全てON）
      return { slack: true, gmail: true, notion: true };
    }
    
    return JSON.parse(dataStr);
  } catch (e) {
    Logger.log('getToolSettings error: ' + e.message);
    return { slack: true, gmail: true, notion: true };
  }
}

/**
 * ツール設定を保存
 * @param {Object} settings - {slack: boolean, gmail: boolean, notion: boolean}
 * @returns {boolean} 保存成功/失敗
 */
function saveToolSettings(settings) {
  try {
    PropertiesService.getUserProperties()
      .setProperty(USER_PROPERTY_TOOL_SETTINGS, JSON.stringify(settings));
    return true;
  } catch (e) {
    Logger.log('saveToolSettings error: ' + e.message);
    return false;
  }
}
```

### 2.3 Slack履歴取得関数

```javascript
/**
 * Slack履歴を取得
 * @returns {Object} {success: boolean, items: Array, error: string}
 */
function getSlackHistory() {
  Logger.log('Slack履歴取得開始');
  
  try {
    const userToken = getSlackUserToken_();
    if (!userToken) {
      return { success: false, items: [], error: 'Slack未連携' };
    }
    
    // 今日の日付範囲を計算
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    // 自分のSlackユーザーIDを取得
    const props = PropertiesService.getUserProperties();
    const slackUserId = props.getProperty(USER_PROPERTY_SLACK_USER_ID);
    
    if (!slackUserId) {
      return { success: false, items: [], error: 'SlackユーザーID不明' };
    }
    
    // search.messagesでメッセージを検索
    // from:me で自分の投稿を検索
    const query = 'from:me';
    const params = {
      query: query,
      sort: 'timestamp',
      sort_dir: 'desc',
      count: MAX_ITEMS_PER_TOOL
    };
    
    const url = 'https://slack.com/api/search.messages?' + toQueryString_(params);
    const res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + userToken
      },
      muteHttpExceptions: true
    });
    
    const json = safeJsonParse_(res.getContentText());
    
    if (!json || !json.ok) {
      const err = json && json.error ? String(json.error) : 'unknown_error';
      Logger.log('Slack履歴取得失敗: ' + err);
      
      if (err === 'missing_scope') {
        return { success: false, items: [], error: 'search:read権限が必要です' };
      }
      return { success: false, items: [], error: err };
    }
    
    // 今日のメッセージのみフィルタ
    const items = [];
    const messages = json.messages && json.messages.matches ? json.messages.matches : [];
    
    for (var i = 0; i < messages.length && items.length < MAX_ITEMS_PER_TOOL; i++) {
      var msg = messages[i];
      var ts = parseFloat(msg.ts) * 1000;
      var msgDate = new Date(ts);
      
      if (msgDate >= todayStart && msgDate <= todayEnd) {
        var channelName = msg.channel && msg.channel.name ? msg.channel.name : 'DM';
        var text = msg.text || '';
        // テキストを短縮
        if (text.length > 30) {
          text = text.substring(0, 30) + '...';
        }
        
        items.push({
          type: 'slack',
          time: Utilities.formatDate(msgDate, TIMEZONE, TIME_FORMAT),
          content: '#' + channelName + ': 「' + text + '」'
        });
      }
    }
    
    Logger.log('Slack履歴取得完了: ' + items.length + '件');
    return { success: true, items: items, error: '' };
    
  } catch (e) {
    Logger.log('getSlackHistory error: ' + e.message);
    return { success: false, items: [], error: e.message };
  }
}
```

### 2.4 Gmail履歴取得関数

```javascript
/**
 * Gmail履歴を取得
 * @returns {Object} {success: boolean, items: Array, error: string}
 */
function getGmailHistory() {
  Logger.log('Gmail履歴取得開始');
  
  try {
    // 今日の日付でクエリを作成
    var today = new Date();
    var dateStr = Utilities.formatDate(today, TIMEZONE, 'yyyy/MM/dd');
    
    // 送信メール
    var sentQuery = 'in:sent after:' + dateStr;
    var sentThreads = GmailApp.search(sentQuery, 0, MAX_ITEMS_PER_TOOL);
    
    // 受信メール
    var receivedQuery = 'in:inbox after:' + dateStr;
    var receivedThreads = GmailApp.search(receivedQuery, 0, MAX_ITEMS_PER_TOOL);
    
    var items = [];
    
    // 送信メールを処理
    for (var i = 0; i < sentThreads.length && items.length < MAX_ITEMS_PER_TOOL; i++) {
      var thread = sentThreads[i];
      var messages = thread.getMessages();
      var lastMessage = messages[messages.length - 1];
      var date = lastMessage.getDate();
      var subject = lastMessage.getSubject() || '(件名なし)';
      
      // 件名を短縮
      if (subject.length > 30) {
        subject = subject.substring(0, 30) + '...';
      }
      
      items.push({
        type: 'gmail',
        time: Utilities.formatDate(date, TIMEZONE, TIME_FORMAT),
        content: '送信: 「' + subject + '」'
      });
    }
    
    // 受信メールを処理
    for (var j = 0; j < receivedThreads.length && items.length < MAX_ITEMS_PER_TOOL; j++) {
      var rThread = receivedThreads[j];
      var rMessages = rThread.getMessages();
      var rLastMessage = rMessages[rMessages.length - 1];
      var rDate = rLastMessage.getDate();
      var rSubject = rLastMessage.getSubject() || '(件名なし)';
      var rFrom = rLastMessage.getFrom() || '';
      
      // 送信者名を短縮
      if (rFrom.length > 15) {
        rFrom = rFrom.substring(0, 15) + '...';
      }
      
      // 件名を短縮
      if (rSubject.length > 25) {
        rSubject = rSubject.substring(0, 25) + '...';
      }
      
      items.push({
        type: 'gmail',
        time: Utilities.formatDate(rDate, TIMEZONE, TIME_FORMAT),
        content: '受信(' + rFrom + '): 「' + rSubject + '」'
      });
    }
    
    // 時間順にソート
    items.sort(function(a, b) {
      return a.time.localeCompare(b.time);
    });
    
    Logger.log('Gmail履歴取得完了: ' + items.length + '件');
    return { success: true, items: items, error: '' };
    
  } catch (e) {
    Logger.log('getGmailHistory error: ' + e.message);
    return { success: false, items: [], error: e.message };
  }
}
```

### 2.5 Notion履歴取得関数

```javascript
/**
 * Notion履歴を取得
 * @returns {Object} {success: boolean, items: Array, error: string}
 */
function getNotionHistory() {
  Logger.log('Notion履歴取得開始');
  
  try {
    var token = PropertiesService.getScriptProperties()
      .getProperty(PROPERTY_NOTION_TOKEN);
    
    if (!token) {
      return { success: false, items: [], error: 'Notion Token未設定' };
    }
    
    // 今日の日付（ISO形式）
    var today = new Date();
    var todayISO = Utilities.formatDate(today, TIMEZONE, "yyyy-MM-dd'T'00:00:00.000'+09:00'");
    
    // Notion API: 最近編集されたページを検索
    var url = 'https://api.notion.com/v1/search';
    var payload = {
      filter: {
        property: 'object',
        value: 'page'
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      },
      page_size: MAX_ITEMS_PER_TOOL
    };
    
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    var json = safeJsonParse_(res.getContentText());
    
    if (!json || json.object === 'error') {
      var err = json && json.message ? String(json.message) : 'unknown_error';
      Logger.log('Notion履歴取得失敗: ' + err);
      return { success: false, items: [], error: err };
    }
    
    var items = [];
    var results = json.results || [];
    
    // 今日の日付範囲
    var todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    var todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    for (var i = 0; i < results.length && items.length < MAX_ITEMS_PER_TOOL; i++) {
      var page = results[i];
      var lastEditedTime = new Date(page.last_edited_time);
      
      if (lastEditedTime >= todayStart && lastEditedTime <= todayEnd) {
        // ページタイトルを取得
        var title = '無題';
        if (page.properties && page.properties.title && page.properties.title.title) {
          var titleArray = page.properties.title.title;
          if (titleArray.length > 0 && titleArray[0].plain_text) {
            title = titleArray[0].plain_text;
          }
        } else if (page.properties && page.properties.Name && page.properties.Name.title) {
          var nameArray = page.properties.Name.title;
          if (nameArray.length > 0 && nameArray[0].plain_text) {
            title = nameArray[0].plain_text;
          }
        }
        
        // タイトルを短縮
        if (title.length > 30) {
          title = title.substring(0, 30) + '...';
        }
        
        // 作成か編集かを判定
        var createdTime = new Date(page.created_time);
        var action = (createdTime >= todayStart) ? '作成' : '編集';
        
        items.push({
          type: 'notion',
          time: Utilities.formatDate(lastEditedTime, TIMEZONE, TIME_FORMAT),
          content: action + ': 「' + title + '」'
        });
      }
    }
    
    Logger.log('Notion履歴取得完了: ' + items.length + '件');
    return { success: true, items: items, error: '' };
    
  } catch (e) {
    Logger.log('getNotionHistory error: ' + e.message);
    return { success: false, items: [], error: e.message };
  }
}
```

### 2.6 統合取得関数

```javascript
/**
 * 全ツール履歴を一括取得
 * @returns {Object} {calendar: string, slack: Object, gmail: Object, notion: Object, errors: Array}
 */
function getAllToolHistoryV3(dateString) {
  Logger.log('全ツール履歴取得開始（V3）');
  
  var result = {
    calendar: '',
    slack: { items: [], error: '' },
    gmail: { items: [], error: '' },
    notion: { items: [], error: '' },
    errors: []
  };
  
  // ツール設定を取得
  var settings = getToolSettings();
  
  // カレンダー予定取得（既存）
  result.calendar = getEventsForDate(dateString);
  
  // Slack履歴
  if (settings.slack) {
    var slackResult = getSlackHistory();
    result.slack = { items: slackResult.items, error: slackResult.error };
    if (!slackResult.success && slackResult.error) {
      result.errors.push('[Slack] ' + slackResult.error);
    }
  }
  
  // Gmail履歴
  if (settings.gmail) {
    var gmailResult = getGmailHistory();
    result.gmail = { items: gmailResult.items, error: gmailResult.error };
    if (!gmailResult.success && gmailResult.error) {
      result.errors.push('[Gmail] ' + gmailResult.error);
    }
  }
  
  // Notion履歴
  if (settings.notion) {
    var notionResult = getNotionHistory();
    result.notion = { items: notionResult.items, error: notionResult.error };
    if (!notionResult.success && notionResult.error) {
      result.errors.push('[Notion] ' + notionResult.error);
    }
  }
  
  Logger.log('全ツール履歴取得完了（V3）');
  return result;
}
```

---

## 3. Index.html への変更

### 3.1 設定UIの追加

```html
<!-- ツール設定セクション -->
<div class="section tool-settings">
  <div class="section-title">取得ツール設定</div>
  <div class="tool-checkboxes">
    <label class="tool-checkbox">
      <input type="checkbox" id="settingSlack" checked>
      <span>Slack</span>
    </label>
    <label class="tool-checkbox">
      <input type="checkbox" id="settingGmail" checked>
      <span>Gmail</span>
    </label>
    <label class="tool-checkbox">
      <input type="checkbox" id="settingNotion" checked>
      <span>Notion</span>
    </label>
  </div>
  <button class="btn btn-secondary btn-small" onclick="saveToolSettingsUI()">設定を保存</button>
</div>
```

### 3.2 CSS追加

```css
/* ============================================
   V3追加スタイル
   ============================================ */

/* ツール設定 */
.tool-settings {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.tool-checkboxes {
  display: flex;
  gap: 20px;
  margin: 10px 0;
}

.tool-checkbox {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.tool-checkbox input {
  width: 18px;
  height: 18px;
}

.btn-small {
  padding: 8px 16px;
  font-size: 12px;
}

/* ツール履歴アイテム */
.tool-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 5px 0;
}

.tool-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: bold;
}

.tool-badge.slack {
  background-color: #4A154B;
  color: white;
}

.tool-badge.gmail {
  background-color: #EA4335;
  color: white;
}

.tool-badge.notion {
  background-color: #000000;
  color: white;
}

.tool-badge.calendar {
  background-color: #4285F4;
  color: white;
}
```

### 3.3 JavaScript変更

```javascript
// ============================================
// V3 ツール設定
// ============================================
function loadToolSettings() {
  google.script.run
    .withSuccessHandler(function(settings) {
      document.getElementById('settingSlack').checked = settings.slack !== false;
      document.getElementById('settingGmail').checked = settings.gmail !== false;
      document.getElementById('settingNotion').checked = settings.notion !== false;
    })
    .withFailureHandler(function(error) {
      console.error('loadToolSettings error:', error);
    })
    .getToolSettings();
}

function saveToolSettingsUI() {
  var settings = {
    slack: document.getElementById('settingSlack').checked,
    gmail: document.getElementById('settingGmail').checked,
    notion: document.getElementById('settingNotion').checked
  };
  
  google.script.run
    .withSuccessHandler(function(result) {
      if (result) {
        showMessage('設定を保存しました。', false);
      } else {
        showMessage('設定の保存に失敗しました。', true);
      }
    })
    .withFailureHandler(function(error) {
      showMessage('エラー: ' + error.message, true);
    })
    .saveToolSettings(settings);
}

// ============================================
// V3 履歴取得
// ============================================
function loadAllHistoryV3() {
  if (isLoading) return;

  var dateInput = document.getElementById('dateSelect');
  var selectedDate = dateInput.value;

  showLoading(true);
  hideMessage();

  document.getElementById('btnGetEvents').disabled = true;

  google.script.run
    .withSuccessHandler(onLoadAllHistorySuccessV3)
    .withFailureHandler(onLoadAllHistoryFailureV3)
    .getAllToolHistoryV3(selectedDate || null);
}

function onLoadAllHistorySuccessV3(result) {
  showLoading(false);
  document.getElementById('btnGetEvents').disabled = false;

  // カレンダー予定を整形
  var lines = [];
  
  if (result.calendar && !result.calendar.startsWith('エラー：')) {
    var calendarLines = result.calendar.split('\n');
    for (var i = 0; i < calendarLines.length; i++) {
      if (calendarLines[i].trim()) {
        lines.push('⚫︎ [予定] ' + calendarLines[i]);
      }
    }
  }
  
  // Slack履歴を追加
  if (result.slack && result.slack.items) {
    for (var j = 0; j < result.slack.items.length; j++) {
      var item = result.slack.items[j];
      lines.push('⚫︎ [Slack] ' + item.content);
    }
  }
  
  // Gmail履歴を追加
  if (result.gmail && result.gmail.items) {
    for (var k = 0; k < result.gmail.items.length; k++) {
      var gItem = result.gmail.items[k];
      lines.push('⚫︎ [Gmail] ' + gItem.content);
    }
  }
  
  // Notion履歴を追加
  if (result.notion && result.notion.items) {
    for (var l = 0; l < result.notion.items.length; l++) {
      var nItem = result.notion.items[l];
      lines.push('⚫︎ [Notion] ' + nItem.content);
    }
  }
  
  // テキストエリアに設定
  document.getElementById('todayTasks').value = lines.join('\n');
  
  // エラーがあれば表示
  if (result.errors && result.errors.length > 0) {
    showMessage('一部のツールで取得に失敗しました: ' + result.errors.join(', '), true);
  } else if (lines.length === 0) {
    showMessage('今日の履歴はありません。', false);
  } else {
    showMessage('履歴を取得しました（' + lines.length + '件）', false);
  }
}

function onLoadAllHistoryFailureV3(error) {
  showLoading(false);
  document.getElementById('btnGetEvents').disabled = false;
  showMessage('エラー: ' + error.message, true);
}

// ページ読み込み時の初期化を変更
window.addEventListener('load', function() {
  initDateSelects();
  refreshSlackLinkStatus();
  initV2();
  loadToolSettings();  // V3: ツール設定読み込み
  loadAllHistoryV3();  // V3: 全ツール履歴取得
});
```

---

## 4. 処理フロー

### 4.1 ページ読み込み時

```
1. ページ読み込み開始
2. initDateSelects() - 日付選択初期化
3. refreshSlackLinkStatus() - Slack連携状態確認
4. initV2() - V2初期化（日付、氏名、翌日引き継ぎ）
5. loadToolSettings() - ツール設定読み込み
6. loadAllHistoryV3() - 全ツール履歴取得
   a. getAllToolHistoryV3() 呼び出し
   b. カレンダー、Slack、Gmail、Notionを並行取得
   c. 結果を「今日やったこと」に表示
7. ページ読み込み完了
```

### 4.2 予定取得ボタン押下時

```
1. 「予定を取得」ボタン押下
2. loadAllHistoryV3() 呼び出し
3. 全ツール履歴を再取得
4. 結果を「今日やったこと」に表示
```

---

## 5. エラーハンドリング

| エラー | 発生条件 | 対応 | メッセージ |
|--------|----------|------|------------|
| Slack search:read権限不足 | スコープ未認可 | Slack履歴のみスキップ | 「[Slack] search:read権限が必要です」 |
| Gmail API失敗 | 権限不足、API制限 | Gmail履歴のみスキップ | 「[Gmail] (エラー内容)」 |
| Notion Token未設定 | 管理者未設定 | Notion履歴のみスキップ | 「[Notion] Notion Token未設定」 |
| Notion API失敗 | Token無効、API制限 | Notion履歴のみスキップ | 「[Notion] (エラー内容)」 |
| 取得タイムアウト | 処理時間超過 | 部分的な結果を表示 | 「一部のツールで取得に失敗しました」 |

---

## 6. テスト項目

### 6.1 正常系

| No | テスト | 手順 | 期待結果 |
|----|--------|------|----------|
| 1 | Slack履歴取得 | ページ読み込み | 当日の投稿が表示される |
| 2 | Gmail履歴取得 | ページ読み込み | 当日のメールが表示される |
| 3 | Notion履歴取得 | ページ読み込み | 当日の編集ページが表示される |
| 4 | 複合表示 | ページ読み込み | 全ツール履歴がまとめて表示 |
| 5 | 設定保存 | 設定変更→保存 | 設定が保存される |
| 6 | 設定反映 | 設定OFF→再取得 | OFFのツールは取得されない |

### 6.2 異常系

| No | テスト | 手順 | 期待結果 |
|----|--------|------|----------|
| 1 | Slack権限不足 | search:read未認可 | エラー表示、他は正常 |
| 2 | Notion Token未設定 | Token未設定 | エラー表示、他は正常 |
| 3 | ネットワークエラー | 通信切断 | エラー表示、部分的に表示 |

---

## 7. 完了条件

| No | 条件 | 確認方法 |
|----|------|----------|
| 1 | Slack履歴が表示される | 画面確認 |
| 2 | Gmail履歴が表示される | 画面確認 |
| 3 | Notion履歴が表示される | 画面確認 |
| 4 | ツール設定が保存・反映される | 設定画面確認 |
| 5 | エラー時も他ツールは動作する | 異常系テスト |
| 6 | V2機能が正常動作する | 既存テスト |
| 7 | 全テスト項目がパスする | テスト実行 |

---

## 8. 注意事項（実装者向け）

1. **Slack追加スコープ**: `search:read`スコープを追加するため、既存ユーザーは再認可が必要になる可能性あり。UIで再認可を促すフローを検討。

2. **Gmail**: GmailApp.search()は初回実行時に権限承認ダイアログが表示される。GASの標準的な認証フローに従う。

3. **Notion**: Internal Integration Tokenを使う場合、Notion側で対象ページにIntegrationを明示的に追加する必要がある。

4. **パフォーマンス**: 全ツール取得は時間がかかる可能性あり。ローディング表示を適切に行う。

5. **エラー表示**: 複数のエラーが発生した場合、全てを表示する（部分的な成功は成功として扱う）。

---

## 改定履歴

| バージョン | 日付 | 内容 |
|------------|------|------|
| 1.0 | 2026-01-24 | 60点版 初版作成 |
| 2.0 | 2026-01-24 | 100点版（1回目） |
| 3.0 | 2026-01-24 | 最終100点版：具体的な実装例追加、エラーハンドリング詳細化 |
