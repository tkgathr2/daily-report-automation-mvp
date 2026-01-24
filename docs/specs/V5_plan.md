# V5 仕様書（Plan）

## ドキュメント情報

| 項目 | 内容 |
|------|------|
| 文書名 | 簡単日報くん V5 仕様書 |
| バージョン | 3.0（最終100点版） |
| 作成日 | 2026-01-24 |
| フェーズ | Plan（仕様書作成）完了 |
| 関連要件定義書 | docs/specs/V5_requirements_ASK.md |
| 前提バージョン | V4 |

---

## 1. 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| src/Code.gs | ツール連携関数追加（Zoom/Meet/社内ツール） |
| src/Index.html | 設定UI拡張 |

---

## 2. Code.gs への追加

### 2.1 追加する定数

```javascript
// V5追加定数
const PROPERTY_ZOOM_TOKEN = 'ZOOM_ACCESS_TOKEN';
const PROPERTY_ZOOM_ACCOUNT_ID = 'ZOOM_ACCOUNT_ID';
const PROPERTY_INTERNAL_TOOL_ENDPOINT = 'INTERNAL_TOOL_ENDPOINT';
const PROPERTY_INTERNAL_TOOL_API_KEY = 'INTERNAL_TOOL_API_KEY';
```

### 2.2 Zoom履歴取得関数

```javascript
/**
 * Zoom履歴を取得
 * @returns {Object} {success: boolean, items: Array, error: string}
 */
function getZoomHistory() {
  Logger.log('Zoom履歴取得開始');
  
  try {
    var props = PropertiesService.getScriptProperties();
    var token = props.getProperty(PROPERTY_ZOOM_TOKEN);
    var accountId = props.getProperty(PROPERTY_ZOOM_ACCOUNT_ID);
    
    if (!token || !accountId) {
      return { success: false, items: [], error: 'Zoom設定未完了' };
    }
    
    var today = new Date();
    var dateStr = Utilities.formatDate(today, TIMEZONE, 'yyyy-MM-dd');
    
    // Zoom API: List Meetings
    var url = 'https://api.zoom.us/v2/users/me/meetings?type=scheduled&from=' + dateStr + '&to=' + dateStr;
    
    var res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      muteHttpExceptions: true
    });
    
    var json = safeJsonParse_(res.getContentText());
    
    if (!json || json.code) {
      var err = json && json.message ? String(json.message) : 'unknown_error';
      return { success: false, items: [], error: err };
    }
    
    var items = [];
    var meetings = json.meetings || [];
    
    for (var i = 0; i < meetings.length && items.length < MAX_ITEMS_PER_TOOL; i++) {
      var meeting = meetings[i];
      var topic = meeting.topic || '無題の会議';
      var startTime = new Date(meeting.start_time);
      var duration = meeting.duration || 0;
      
      if (topic.length > 25) {
        topic = topic.substring(0, 25) + '...';
      }
      
      var timeStr = Utilities.formatDate(startTime, TIMEZONE, TIME_FORMAT);
      var endTime = new Date(startTime.getTime() + duration * 60000);
      var endTimeStr = Utilities.formatDate(endTime, TIMEZONE, TIME_FORMAT);
      
      var role = (meeting.host_id === accountId) ? '主催' : '参加';
      
      items.push({
        type: 'zoom',
        time: timeStr,
        content: role + ': 「' + topic + '」(' + timeStr + '-' + endTimeStr + ')'
      });
    }
    
    Logger.log('Zoom履歴取得完了: ' + items.length + '件');
    return { success: true, items: items, error: '' };
    
  } catch (e) {
    Logger.log('getZoomHistory error: ' + e.message);
    return { success: false, items: [], error: e.message };
  }
}
```

### 2.3 Google Meet履歴取得関数

```javascript
/**
 * Google Meet履歴を取得（カレンダー経由）
 * @returns {Object} {success: boolean, items: Array, error: string}
 */
function getGoogleMeetHistory() {
  Logger.log('Google Meet履歴取得開始');
  
  try {
    var today = new Date();
    var startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    var endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    var calendar = CalendarApp.getCalendarById('primary');
    if (!calendar) {
      return { success: false, items: [], error: 'カレンダー取得失敗' };
    }
    
    var events = calendar.getEvents(startTime, endTime);
    var items = [];
    
    for (var i = 0; i < events.length && items.length < MAX_ITEMS_PER_TOOL; i++) {
      var event = events[i];
      
      // Google Meetリンクがあるかチェック
      var description = event.getDescription() || '';
      var location = event.getLocation() || '';
      
      var hasMeet = description.indexOf('meet.google.com') !== -1 ||
                    location.indexOf('meet.google.com') !== -1;
      
      if (!hasMeet) continue;
      
      var title = event.getTitle() || '無題の会議';
      if (title.length > 25) {
        title = title.substring(0, 25) + '...';
      }
      
      var eventStartTime = event.getStartTime();
      var eventEndTime = event.getEndTime();
      var startStr = Utilities.formatDate(eventStartTime, TIMEZONE, TIME_FORMAT);
      var endStr = Utilities.formatDate(eventEndTime, TIMEZONE, TIME_FORMAT);
      
      items.push({
        type: 'meet',
        time: startStr,
        content: '参加: 「' + title + '」(' + startStr + '-' + endStr + ')'
      });
    }
    
    Logger.log('Google Meet履歴取得完了: ' + items.length + '件');
    return { success: true, items: items, error: '' };
    
  } catch (e) {
    Logger.log('getGoogleMeetHistory error: ' + e.message);
    return { success: false, items: [], error: e.message };
  }
}
```

### 2.4 社内ツール履歴取得関数

```javascript
/**
 * 社内ツール履歴を取得
 * @returns {Object} {success: boolean, items: Array, error: string}
 */
function getInternalToolHistory() {
  Logger.log('社内ツール履歴取得開始');
  
  try {
    var props = PropertiesService.getScriptProperties();
    var endpoint = props.getProperty(PROPERTY_INTERNAL_TOOL_ENDPOINT);
    var apiKey = props.getProperty(PROPERTY_INTERNAL_TOOL_API_KEY);
    
    if (!endpoint) {
      return { success: false, items: [], error: '社内ツール未設定' };
    }
    
    var today = new Date();
    var dateStr = Utilities.formatDate(today, TIMEZONE, 'yyyy-MM-dd');
    
    var url = endpoint + '?date=' + dateStr;
    var headers = {};
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
    
    var res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: headers,
      muteHttpExceptions: true
    });
    
    var json = safeJsonParse_(res.getContentText());
    
    if (!json || json.error) {
      var err = json && json.error ? String(json.error) : 'unknown_error';
      return { success: false, items: [], error: err };
    }
    
    var items = [];
    var records = json.records || json.data || [];
    
    for (var i = 0; i < records.length && items.length < MAX_ITEMS_PER_TOOL; i++) {
      var record = records[i];
      var content = record.content || record.title || record.description || '（内容不明）';
      var time = record.time || record.timestamp || '';
      
      if (content.length > 30) {
        content = content.substring(0, 30) + '...';
      }
      
      items.push({
        type: 'internal',
        time: time,
        content: content
      });
    }
    
    Logger.log('社内ツール履歴取得完了: ' + items.length + '件');
    return { success: true, items: items, error: '' };
    
  } catch (e) {
    Logger.log('getInternalToolHistory error: ' + e.message);
    return { success: false, items: [], error: e.message };
  }
}
```

### 2.5 統合取得関数の拡張

```javascript
/**
 * 全ツール履歴を一括取得（V5拡張）
 */
function getAllToolHistoryV5(dateString) {
  var result = getAllToolHistoryV4(dateString);  // V4の結果を継承
  
  var settings = getToolSettings();
  
  // V5追加ツール
  if (settings.zoom !== false) {
    var zoomResult = getZoomHistory();
    result.zoom = { items: zoomResult.items, error: zoomResult.error };
    if (!zoomResult.success && zoomResult.error) {
      result.errors.push('[Zoom] ' + zoomResult.error);
    }
  }
  
  if (settings.meet !== false) {
    var meetResult = getGoogleMeetHistory();
    result.meet = { items: meetResult.items, error: meetResult.error };
    if (!meetResult.success && meetResult.error) {
      result.errors.push('[Meet] ' + meetResult.error);
    }
  }
  
  if (settings.internal !== false) {
    var internalResult = getInternalToolHistory();
    result.internal = { items: internalResult.items, error: internalResult.error };
    if (!internalResult.success && internalResult.error) {
      result.errors.push('[社内] ' + internalResult.error);
    }
  }
  
  return result;
}
```

---

## 3. Index.html への変更

### 3.1 設定UI拡張

```html
<label class="tool-checkbox">
  <input type="checkbox" id="settingZoom" checked>
  <span>Zoom</span>
</label>
<label class="tool-checkbox">
  <input type="checkbox" id="settingMeet" checked>
  <span>Google Meet</span>
</label>
<label class="tool-checkbox">
  <input type="checkbox" id="settingInternal" checked>
  <span>社内ツール</span>
</label>
```

---

## 4. 完了条件

| No | 条件 |
|----|------|
| 1 | Zoom履歴が表示される |
| 2 | Google Meet履歴が表示される |
| 3 | 社内ツール履歴が表示される（設定時） |
| 4 | ツール設定が保存・反映される |
| 5 | V4機能が正常動作する |

---

## 改定履歴

| バージョン | 日付 | 内容 |
|------------|------|------|
| 3.0 | 2026-01-24 | 最終100点版 |
