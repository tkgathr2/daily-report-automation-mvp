# V7 仕様書（Plan）

## ドキュメント情報

| 項目 | 内容 |
|------|------|
| 文書名 | 簡単日報くん V7 仕様書 |
| バージョン | 3.0（最終100点版） |
| 作成日 | 2026-01-24 |
| フェーズ | Plan（仕様書作成）完了 |
| 関連要件定義書 | docs/specs/V7_requirements_ASK.md |
| 前提バージョン | V6 |

---

## 1. 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| src/Code.gs | 学習データ保存・取得関数追加 |
| src/Index.html | 設定UI拡張 |

---

## 2. Code.gs への追加

### 2.1 追加する定数

```javascript
// V7追加定数
const USER_PROPERTY_TOOL_USAGE = 'TOOL_USAGE_DATA';
const LEARNING_PERIOD_DAYS = 30;
```

### 2.2 利用頻度記録関数

```javascript
/**
 * ツール利用頻度を記録
 * @param {Object} usageCount - {slack: 5, gmail: 3, ...}
 */
function recordToolUsage(usageCount) {
  Logger.log('ツール利用頻度記録開始');
  
  try {
    var props = PropertiesService.getUserProperties();
    var dataStr = props.getProperty(USER_PROPERTY_TOOL_USAGE);
    var data = dataStr ? JSON.parse(dataStr) : { records: [] };
    
    var today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
    
    // 今日のレコードを更新または追加
    var found = false;
    for (var i = 0; i < data.records.length; i++) {
      if (data.records[i].date === today) {
        data.records[i].usage = usageCount;
        found = true;
        break;
      }
    }
    
    if (!found) {
      data.records.push({
        date: today,
        usage: usageCount
      });
    }
    
    // 30日より古いレコードを削除
    var cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - LEARNING_PERIOD_DAYS);
    var cutoffStr = Utilities.formatDate(cutoffDate, TIMEZONE, 'yyyy-MM-dd');
    
    data.records = data.records.filter(function(r) {
      return r.date >= cutoffStr;
    });
    
    props.setProperty(USER_PROPERTY_TOOL_USAGE, JSON.stringify(data));
    Logger.log('ツール利用頻度記録完了');
    
  } catch (e) {
    Logger.log('recordToolUsage error: ' + e.message);
  }
}
```

### 2.3 ツール順序取得関数

```javascript
/**
 * よく使う順のツール順序を取得
 * @returns {Array} ツール名の配列（使用頻度順）
 */
function getToolOrder() {
  try {
    var props = PropertiesService.getUserProperties();
    var dataStr = props.getProperty(USER_PROPERTY_TOOL_USAGE);
    
    if (!dataStr) {
      return getDefaultToolOrder();
    }
    
    var data = JSON.parse(dataStr);
    var records = data.records || [];
    
    // ツールごとの合計を計算
    var totals = {};
    var defaultTools = getDefaultToolOrder();
    
    for (var i = 0; i < defaultTools.length; i++) {
      totals[defaultTools[i]] = 0;
    }
    
    for (var j = 0; j < records.length; j++) {
      var usage = records[j].usage || {};
      for (var tool in usage) {
        if (totals.hasOwnProperty(tool)) {
          totals[tool] += usage[tool];
        }
      }
    }
    
    // 合計が多い順にソート
    var sortedTools = Object.keys(totals).sort(function(a, b) {
      return totals[b] - totals[a];
    });
    
    return sortedTools;
    
  } catch (e) {
    Logger.log('getToolOrder error: ' + e.message);
    return getDefaultToolOrder();
  }
}

/**
 * デフォルトのツール順序
 */
function getDefaultToolOrder() {
  return ['calendar', 'slack', 'gmail', 'notion', 'docs', 'drive', 'dropbox', 'zoom', 'meet', 'internal'];
}
```

### 2.4 統合取得関数の拡張

```javascript
/**
 * 全ツール履歴を一括取得（V7拡張：順序学習付き）
 */
function getAllToolHistoryV7(dateString, useAI) {
  var result = getAllToolHistoryV6(dateString, useAI);
  
  // ツール順序を取得
  result.toolOrder = getToolOrder();
  
  return result;
}

/**
 * 日報送信時の処理（V7拡張）
 */
function sendToSlackV7(reportData) {
  // 送信処理
  var sendResult = sendToSlackV2(reportData);
  
  // 利用頻度を記録
  if (sendResult.indexOf('成功') !== -1) {
    var usageCount = reportData.usageCount || {};
    recordToolUsage(usageCount);
  }
  
  return sendResult;
}
```

---

## 3. Index.html への変更

### 3.1 設定UI拡張（順序表示）

```html
<div class="tool-order-info">
  <p>ツールの表示順序（よく使う順）:</p>
  <ol id="toolOrderList">
    <!-- 動的に生成 -->
  </ol>
</div>
```

### 3.2 JavaScript追加

```javascript
// ツール順序を表示
function renderToolOrder(order) {
  var list = document.getElementById('toolOrderList');
  list.innerHTML = '';
  
  var toolNames = {
    calendar: 'カレンダー',
    slack: 'Slack',
    gmail: 'Gmail',
    notion: 'Notion',
    docs: 'Google Docs',
    drive: 'Google Drive',
    dropbox: 'Dropbox',
    zoom: 'Zoom',
    meet: 'Google Meet',
    internal: '社内ツール'
  };
  
  for (var i = 0; i < order.length; i++) {
    var li = document.createElement('li');
    li.textContent = toolNames[order[i]] || order[i];
    list.appendChild(li);
  }
}

// 送信時に利用件数をカウント
function countToolUsage() {
  var todayTasks = document.getElementById('todayTasks').value;
  var lines = todayTasks.split('\n');
  
  var count = {
    calendar: 0, slack: 0, gmail: 0, notion: 0,
    docs: 0, drive: 0, dropbox: 0, zoom: 0, meet: 0, internal: 0
  };
  
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.indexOf('[予定]') !== -1) count.calendar++;
    if (line.indexOf('[Slack]') !== -1) count.slack++;
    if (line.indexOf('[Gmail]') !== -1) count.gmail++;
    if (line.indexOf('[Notion]') !== -1) count.notion++;
    if (line.indexOf('[Docs]') !== -1) count.docs++;
    if (line.indexOf('[Drive]') !== -1) count.drive++;
    if (line.indexOf('[Dropbox]') !== -1) count.dropbox++;
    if (line.indexOf('[Zoom]') !== -1) count.zoom++;
    if (line.indexOf('[Meet]') !== -1) count.meet++;
    if (line.indexOf('[社内]') !== -1) count.internal++;
  }
  
  return count;
}
```

---

## 4. 完了条件

| No | 条件 |
|----|------|
| 1 | 各ツールのON/OFFが設定できる |
| 2 | OFFにしたツールの履歴が取得されない |
| 3 | よく使うツールが上に表示される |
| 4 | 設定がユーザーごとに保存される |
| 5 | V6機能が正常動作する |

---

## 改定履歴

| バージョン | 日付 | 内容 |
|------------|------|------|
| 3.0 | 2026-01-24 | 最終100点版 |
