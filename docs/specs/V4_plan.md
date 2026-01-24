# V4 仕様書（Plan）

## ドキュメント情報

| 項目 | 内容 |
|------|------|
| 文書名 | 簡単日報くん V4 仕様書 |
| バージョン | 3.0（最終100点版） |
| 作成日 | 2026-01-24 |
| フェーズ | Plan（仕様書作成）完了 |
| 関連要件定義書 | docs/specs/V4_requirements_ASK.md |
| 前提バージョン | V3 |

---

## 1. 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| src/Code.gs | ツール連携関数追加（Docs/Drive/Dropbox） |
| src/Index.html | 設定UI拡張 |

---

## 2. Code.gs への追加

### 2.1 追加する定数

```javascript
// V4追加定数
const PROPERTY_DROPBOX_TOKEN = 'DROPBOX_ACCESS_TOKEN';
```

### 2.2 Googleドキュメント履歴取得関数

```javascript
/**
 * Googleドキュメント履歴を取得
 * @returns {Object} {success: boolean, items: Array, error: string}
 */
function getGoogleDocsHistory() {
  Logger.log('Googleドキュメント履歴取得開始');
  
  try {
    var today = new Date();
    var todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    
    // 自分が編集したGoogleドキュメントを検索
    var query = "mimeType='application/vnd.google-apps.document' and modifiedDate >= '" + 
                todayStart.toISOString() + "' and 'me' in owners";
    
    var files = DriveApp.searchFiles(query);
    var items = [];
    
    while (files.hasNext() && items.length < MAX_ITEMS_PER_TOOL) {
      var file = files.next();
      var title = file.getName();
      var lastUpdated = file.getLastUpdated();
      var created = file.getDateCreated();
      
      // 短縮
      if (title.length > 30) {
        title = title.substring(0, 30) + '...';
      }
      
      var action = (created >= todayStart) ? '作成' : '編集';
      
      items.push({
        type: 'docs',
        time: Utilities.formatDate(lastUpdated, TIMEZONE, TIME_FORMAT),
        content: action + ': 「' + title + '」'
      });
    }
    
    Logger.log('Googleドキュメント履歴取得完了: ' + items.length + '件');
    return { success: true, items: items, error: '' };
    
  } catch (e) {
    Logger.log('getGoogleDocsHistory error: ' + e.message);
    return { success: false, items: [], error: e.message };
  }
}
```

### 2.3 Google Drive履歴取得関数

```javascript
/**
 * Google Drive履歴を取得
 * @returns {Object} {success: boolean, items: Array, error: string}
 */
function getGoogleDriveHistory() {
  Logger.log('Google Drive履歴取得開始');
  
  try {
    var today = new Date();
    var todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    
    // Googleドキュメント以外のファイルを検索
    var query = "modifiedDate >= '" + todayStart.toISOString() + 
                "' and 'me' in owners and mimeType != 'application/vnd.google-apps.document'" +
                " and mimeType != 'application/vnd.google-apps.folder'";
    
    var files = DriveApp.searchFiles(query);
    var items = [];
    
    while (files.hasNext() && items.length < MAX_ITEMS_PER_TOOL) {
      var file = files.next();
      var title = file.getName();
      var lastUpdated = file.getLastUpdated();
      var created = file.getDateCreated();
      
      if (title.length > 30) {
        title = title.substring(0, 30) + '...';
      }
      
      var action = (created >= todayStart) ? 'アップロード' : '編集';
      
      items.push({
        type: 'drive',
        time: Utilities.formatDate(lastUpdated, TIMEZONE, TIME_FORMAT),
        content: action + ': 「' + title + '」'
      });
    }
    
    Logger.log('Google Drive履歴取得完了: ' + items.length + '件');
    return { success: true, items: items, error: '' };
    
  } catch (e) {
    Logger.log('getGoogleDriveHistory error: ' + e.message);
    return { success: false, items: [], error: e.message };
  }
}
```

### 2.4 Dropbox履歴取得関数

```javascript
/**
 * Dropbox履歴を取得
 * @returns {Object} {success: boolean, items: Array, error: string}
 */
function getDropboxHistory() {
  Logger.log('Dropbox履歴取得開始');
  
  try {
    var token = PropertiesService.getScriptProperties()
      .getProperty(PROPERTY_DROPBOX_TOKEN);
    
    if (!token) {
      return { success: false, items: [], error: 'Dropbox Token未設定' };
    }
    
    // Dropbox API: list_folder/get_latest_cursor
    var url = 'https://api.dropboxapi.com/2/files/list_folder';
    var payload = {
      path: '',
      recursive: true,
      include_deleted: false,
      limit: MAX_ITEMS_PER_TOOL
    };
    
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    var json = safeJsonParse_(res.getContentText());
    
    if (!json || json.error) {
      var err = json && json.error_summary ? String(json.error_summary) : 'unknown_error';
      return { success: false, items: [], error: err };
    }
    
    var today = new Date();
    var todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    
    var items = [];
    var entries = json.entries || [];
    
    for (var i = 0; i < entries.length && items.length < MAX_ITEMS_PER_TOOL; i++) {
      var entry = entries[i];
      if (entry['.tag'] !== 'file') continue;
      
      var modifiedTime = new Date(entry.client_modified || entry.server_modified);
      if (modifiedTime < todayStart) continue;
      
      var name = entry.name || '無題';
      if (name.length > 30) {
        name = name.substring(0, 30) + '...';
      }
      
      items.push({
        type: 'dropbox',
        time: Utilities.formatDate(modifiedTime, TIMEZONE, TIME_FORMAT),
        content: '更新: 「' + name + '」'
      });
    }
    
    Logger.log('Dropbox履歴取得完了: ' + items.length + '件');
    return { success: true, items: items, error: '' };
    
  } catch (e) {
    Logger.log('getDropboxHistory error: ' + e.message);
    return { success: false, items: [], error: e.message };
  }
}
```

### 2.5 統合取得関数の拡張

```javascript
/**
 * 全ツール履歴を一括取得（V4拡張）
 */
function getAllToolHistoryV4(dateString) {
  var result = getAllToolHistoryV3(dateString);  // V3の結果を継承
  
  var settings = getToolSettings();
  
  // V4追加ツール
  if (settings.docs !== false) {
    var docsResult = getGoogleDocsHistory();
    result.docs = { items: docsResult.items, error: docsResult.error };
    if (!docsResult.success && docsResult.error) {
      result.errors.push('[Docs] ' + docsResult.error);
    }
  }
  
  if (settings.drive !== false) {
    var driveResult = getGoogleDriveHistory();
    result.drive = { items: driveResult.items, error: driveResult.error };
    if (!driveResult.success && driveResult.error) {
      result.errors.push('[Drive] ' + driveResult.error);
    }
  }
  
  if (settings.dropbox !== false) {
    var dropboxResult = getDropboxHistory();
    result.dropbox = { items: dropboxResult.items, error: dropboxResult.error };
    if (!dropboxResult.success && dropboxResult.error) {
      result.errors.push('[Dropbox] ' + dropboxResult.error);
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
  <input type="checkbox" id="settingDocs" checked>
  <span>Google Docs</span>
</label>
<label class="tool-checkbox">
  <input type="checkbox" id="settingDrive" checked>
  <span>Google Drive</span>
</label>
<label class="tool-checkbox">
  <input type="checkbox" id="settingDropbox" checked>
  <span>Dropbox</span>
</label>
```

### 3.2 JavaScript変更

```javascript
// 設定読み込み・保存にV4ツールを追加
function loadToolSettings() {
  google.script.run
    .withSuccessHandler(function(settings) {
      // V3
      document.getElementById('settingSlack').checked = settings.slack !== false;
      document.getElementById('settingGmail').checked = settings.gmail !== false;
      document.getElementById('settingNotion').checked = settings.notion !== false;
      // V4追加
      document.getElementById('settingDocs').checked = settings.docs !== false;
      document.getElementById('settingDrive').checked = settings.drive !== false;
      document.getElementById('settingDropbox').checked = settings.dropbox !== false;
    })
    .getToolSettings();
}

function saveToolSettingsUI() {
  var settings = {
    // V3
    slack: document.getElementById('settingSlack').checked,
    gmail: document.getElementById('settingGmail').checked,
    notion: document.getElementById('settingNotion').checked,
    // V4追加
    docs: document.getElementById('settingDocs').checked,
    drive: document.getElementById('settingDrive').checked,
    dropbox: document.getElementById('settingDropbox').checked
  };
  google.script.run.saveToolSettings(settings);
}

// 履歴取得をV4に変更
function loadAllHistoryV4() {
  google.script.run
    .withSuccessHandler(onLoadAllHistorySuccessV4)
    .getAllToolHistoryV4(selectedDate);
}

function onLoadAllHistorySuccessV4(result) {
  var lines = [];
  
  // V3ツール（既存）
  // ...
  
  // V4ツール追加
  if (result.docs && result.docs.items) {
    for (var i = 0; i < result.docs.items.length; i++) {
      lines.push('⚫︎ [Docs] ' + result.docs.items[i].content);
    }
  }
  if (result.drive && result.drive.items) {
    for (var j = 0; j < result.drive.items.length; j++) {
      lines.push('⚫︎ [Drive] ' + result.drive.items[j].content);
    }
  }
  if (result.dropbox && result.dropbox.items) {
    for (var k = 0; k < result.dropbox.items.length; k++) {
      lines.push('⚫︎ [Dropbox] ' + result.dropbox.items[k].content);
    }
  }
  
  document.getElementById('todayTasks').value = lines.join('\n');
}
```

---

## 4. 完了条件

| No | 条件 |
|----|------|
| 1 | Googleドキュメント履歴が表示される |
| 2 | Google Drive履歴が表示される |
| 3 | Dropbox履歴が表示される |
| 4 | ツール設定が保存・反映される |
| 5 | V3機能が正常動作する |

---

## 改定履歴

| バージョン | 日付 | 内容 |
|------------|------|------|
| 3.0 | 2026-01-24 | 最終100点版 |
