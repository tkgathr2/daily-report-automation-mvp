# V6 仕様書（Plan）

## ドキュメント情報

| 項目 | 内容 |
|------|------|
| 文書名 | 簡単日報くん V6 仕様書 |
| バージョン | 3.0（最終100点版） |
| 作成日 | 2026-01-24 |
| フェーズ | Plan（仕様書作成）完了 |
| 関連要件定義書 | docs/specs/V6_requirements_ASK.md |
| 前提バージョン | V5 |

---

## 1. 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| src/Code.gs | AI処理関数追加 |
| src/Index.html | 削除・編集UI追加 |

---

## 2. Code.gs への追加

### 2.1 追加する定数

```javascript
// V6追加定数
const PROPERTY_OPENAI_API_KEY = 'OPENAI_API_KEY';
const MAX_DISPLAY_ITEMS = 10;
```

### 2.2 AI重要度判定関数

```javascript
/**
 * AIで履歴の重要度を判定
 * @param {Array} items - 履歴アイテム配列
 * @returns {Array} 重要度スコア付きアイテム配列
 */
function sortByImportanceAI(items) {
  Logger.log('AI重要度判定開始');
  
  try {
    var apiKey = PropertiesService.getScriptProperties()
      .getProperty(PROPERTY_OPENAI_API_KEY);
    
    if (!apiKey) {
      Logger.log('OpenAI API Key未設定');
      return items;  // そのまま返す
    }
    
    if (!items || items.length === 0) {
      return items;
    }
    
    // プロンプト作成
    var itemsText = items.map(function(item, index) {
      return (index + 1) + '. [' + item.type + '] ' + item.content;
    }).join('\n');
    
    var prompt = '以下の業務履歴を重要度順（仕事の成果に影響が大きい順）に並べ替えてください。\n' +
                 '番号のみをカンマ区切りで出力してください（例: 3,1,5,2,4）。\n\n' +
                 itemsText;
    
    var url = 'https://api.openai.com/v1/chat/completions';
    var payload = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: '業務日報の重要度を判定するアシスタントです。番号のみを出力してください。' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 100,
      temperature: 0.3
    };
    
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    var json = safeJsonParse_(res.getContentText());
    
    if (!json || !json.choices || json.choices.length === 0) {
      Logger.log('AI応答エラー');
      return items;
    }
    
    var order = json.choices[0].message.content.trim();
    var indices = order.split(',').map(function(s) {
      return parseInt(s.trim()) - 1;
    }).filter(function(n) {
      return !isNaN(n) && n >= 0 && n < items.length;
    });
    
    // 並べ替え
    var sortedItems = [];
    var used = {};
    
    for (var i = 0; i < indices.length; i++) {
      var idx = indices[i];
      if (!used[idx]) {
        sortedItems.push(items[idx]);
        used[idx] = true;
      }
    }
    
    // 残りを追加
    for (var j = 0; j < items.length; j++) {
      if (!used[j]) {
        sortedItems.push(items[j]);
      }
    }
    
    Logger.log('AI重要度判定完了');
    return sortedItems;
    
  } catch (e) {
    Logger.log('sortByImportanceAI error: ' + e.message);
    return items;
  }
}
```

### 2.3 絞り込み関数

```javascript
/**
 * 履歴を最大件数に絞り込む
 * @param {Array} items - 履歴アイテム配列
 * @returns {Array} 絞り込まれたアイテム配列
 */
function limitItems(items) {
  if (!items || items.length <= MAX_DISPLAY_ITEMS) {
    return items;
  }
  return items.slice(0, MAX_DISPLAY_ITEMS);
}
```

### 2.4 統合取得関数の拡張

```javascript
/**
 * 全ツール履歴を一括取得（V6拡張：AI処理付き）
 */
function getAllToolHistoryV6(dateString, useAI) {
  var result = getAllToolHistoryV5(dateString);
  
  if (useAI !== false) {
    // 全アイテムを統合
    var allItems = [];
    
    if (result.calendar) {
      var calLines = result.calendar.split('\n').filter(function(l) { return l.trim(); });
      for (var i = 0; i < calLines.length; i++) {
        allItems.push({ type: '予定', content: calLines[i], time: '' });
      }
    }
    
    var tools = ['slack', 'gmail', 'notion', 'docs', 'drive', 'dropbox', 'zoom', 'meet', 'internal'];
    for (var t = 0; t < tools.length; t++) {
      var tool = tools[t];
      if (result[tool] && result[tool].items) {
        for (var j = 0; j < result[tool].items.length; j++) {
          allItems.push(result[tool].items[j]);
        }
      }
    }
    
    // AI処理
    var sortedItems = sortByImportanceAI(allItems);
    var limitedItems = limitItems(sortedItems);
    
    result.processedItems = limitedItems;
  }
  
  return result;
}
```

---

## 3. Index.html への変更

### 3.1 CSS追加

```css
/* V6追加スタイル */
.task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.task-item:hover {
  background-color: #f5f5f5;
}

.task-content {
  flex: 1;
  cursor: text;
}

.task-content.editing {
  background-color: #fff;
  border: 1px solid #3498db;
  padding: 5px;
}

.btn-delete-item {
  padding: 4px 8px;
  font-size: 12px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-delete-item:hover {
  background-color: #c0392b;
}

.ai-toggle {
  margin-bottom: 15px;
}
```

### 3.2 HTML追加

```html
<!-- AI設定 -->
<div class="ai-toggle">
  <label>
    <input type="checkbox" id="useAI" checked>
    AIで重要度順に並べ替え（最大10件）
  </label>
</div>

<!-- 履歴リスト（編集可能） -->
<div id="taskList" class="task-list">
  <!-- 動的に生成 -->
</div>
```

### 3.3 JavaScript追加

```javascript
// タスクリストを生成
function renderTaskList(items) {
  var container = document.getElementById('taskList');
  container.innerHTML = '';
  
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var div = document.createElement('div');
    div.className = 'task-item';
    div.setAttribute('data-index', i);
    
    var content = document.createElement('span');
    content.className = 'task-content';
    content.textContent = '⚫︎ [' + item.type + '] ' + item.content;
    content.onclick = function() { makeEditable(this); };
    
    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete-item';
    deleteBtn.textContent = '削除';
    deleteBtn.onclick = function() { deleteItem(this.parentElement); };
    
    div.appendChild(content);
    div.appendChild(deleteBtn);
    container.appendChild(div);
  }
}

function makeEditable(element) {
  element.contentEditable = true;
  element.classList.add('editing');
  element.focus();
}

function deleteItem(element) {
  element.remove();
  updateTextarea();
}

function updateTextarea() {
  var items = document.querySelectorAll('.task-content');
  var lines = [];
  for (var i = 0; i < items.length; i++) {
    lines.push(items[i].textContent);
  }
  document.getElementById('todayTasks').value = lines.join('\n');
}
```

---

## 4. 完了条件

| No | 条件 |
|----|------|
| 1 | AIで重要度順に並べ替えられる |
| 2 | 最大10件に絞られる |
| 3 | 各項目を削除できる |
| 4 | 各項目を編集できる |
| 5 | AI処理ON/OFFが設定できる |
| 6 | V5機能が正常動作する |

---

## 改定履歴

| バージョン | 日付 | 内容 |
|------------|------|------|
| 3.0 | 2026-01-24 | 最終100点版 |
