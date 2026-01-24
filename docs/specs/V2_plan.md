# V2 仕様書（Plan）

## ドキュメント情報

| 項目 | 内容 |
|------|------|
| 文書名 | 簡単日報くん V2 仕様書 |
| バージョン | 3.0（最終100点版） |
| 作成日 | 2026-01-24 |
| 最終更新日 | 2026-01-24 |
| フェーズ | Plan（仕様書作成）完了 |
| ステータス | 最終100点版 → Impl移行可 |
| 関連要件定義書 | docs/specs/V2_requirements_ASK.md |

---

## 1. 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| src/Code.gs | バックエンド関数追加（氏名取得、翌日引き継ぎ、初期データ取得） |
| src/Index.html | UI変更（4セクション構成、バリデーション、新テンプレート） |

---

## 2. Code.gs への追加・変更

### 2.1 追加する定数

```javascript
// ============================================
// V2追加定数
// ============================================

// ユーザープロパティキー（翌日引き継ぎ用）
const USER_PROPERTY_NEXT_TASKS = 'NEXT_TASKS_DATA';

// V2日付フォーマット
const DATE_FORMAT_V2 = 'yyyy年MM月dd日';
```

### 2.2 追加する関数

#### getUserName()

```javascript
/**
 * ユーザー名を取得する
 * @returns {Object} {success: boolean, name: string, needsInput: boolean}
 */
function getUserName() {
  try {
    const email = Session.getActiveUser().getEmail();
    if (!email) {
      return { success: false, name: '', needsInput: true };
    }
    
    // @より前を取得
    const localPart = email.split('@')[0];
    
    // ドットをスペースに置換し、各単語の先頭を大文字化
    const name = localPart
      .split('.')
      .map(function(word) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
    
    return { success: true, name: name, needsInput: false };
  } catch (e) {
    Logger.log('getUserName error: ' + e.message);
    return { success: false, name: '', needsInput: true };
  }
}
```

#### getTodayDateFormattedV2()

```javascript
/**
 * 今日の日付をV2フォーマットで返す
 * @returns {string} YYYY年MM月DD日形式の日付
 */
function getTodayDateFormattedV2() {
  const today = new Date();
  return Utilities.formatDate(today, TIMEZONE, DATE_FORMAT_V2);
}
```

#### saveNextTasks(tasks)

```javascript
/**
 * 「次すること」を保存する
 * @param {string} tasks - 保存する内容
 * @returns {boolean} 保存成功/失敗
 */
function saveNextTasks(tasks) {
  try {
    const data = {
      date: Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd'),
      nextTasks: tasks
    };
    
    PropertiesService.getUserProperties()
      .setProperty(USER_PROPERTY_NEXT_TASKS, JSON.stringify(data));
    
    Logger.log('saveNextTasks: 保存完了');
    return true;
  } catch (e) {
    Logger.log('saveNextTasks error: ' + e.message);
    return false;
  }
}
```

#### getNextTasks()

```javascript
/**
 * 前日の「次すること」を取得する
 * @returns {string} 前日の内容（なければ空文字）
 */
function getNextTasks() {
  try {
    const dataStr = PropertiesService.getUserProperties()
      .getProperty(USER_PROPERTY_NEXT_TASKS);
    
    if (!dataStr) {
      return '';
    }
    
    const data = JSON.parse(dataStr);
    
    // 今日の日付と比較（今日のデータなら表示しない＝すでに送信済み）
    const today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
    if (data.date === today) {
      return '';
    }
    
    return data.nextTasks || '';
  } catch (e) {
    Logger.log('getNextTasks error: ' + e.message);
    return '';
  }
}
```

#### getInitialDataV2()

```javascript
/**
 * V2初期表示に必要なデータを一括取得する
 * @returns {Object} {date, userName, nextTasks, needsNameInput}
 */
function getInitialDataV2() {
  const userNameResult = getUserName();
  
  return {
    date: getTodayDateFormattedV2(),
    userName: userNameResult.name,
    needsNameInput: userNameResult.needsInput,
    nextTasks: getNextTasks()
  };
}
```

### 2.3 変更する関数

#### sendToSlack(text) → sendToSlackV2(reportData)

**変更内容**: 引数を単一テキストからオブジェクトに変更

```javascript
/**
 * V2用Slack送信
 * @param {Object} reportData - 日報データ
 * @param {string} reportData.header - ヘッダー（日付と氏名）
 * @param {string} reportData.todayTasks - 今日やったこと
 * @param {string} reportData.notices - わかった事・問題・共有事項
 * @param {string} reportData.salesPoints - 売上・利益に関わるポイント
 * @param {string} reportData.nextTasks - 次すること
 * @returns {string} 成功/失敗メッセージ
 */
function sendToSlackV2(reportData) {
  Logger.log('Slack送信開始（V2）');

  try {
    // OAuth連携済みユーザートークンを取得
    const userToken = getSlackUserToken_();
    if (!userToken) {
      return 'エラー：Slack連携が必要です。「Slack連携（認可）」を実行してください。';
    }

    const channelId = getSlackChannelId_();
    if (!channelId) {
      return 'エラー：Slackチャンネル設定がありません。管理者に連絡してください。';
    }

    // Slack投稿本文を生成（V2フォーマット）
    const slackMessage = formatSlackMessageV2(reportData);
    Logger.log('Slack投稿本文生成完了（V2）');

    const res = slackApiPost_(
      'https://slack.com/api/chat.postMessage',
      userToken,
      {
        channel: channelId,
        text: slackMessage
      }
    );

    if (res && res.ok) {
      // 送信成功時、「次すること」を保存
      saveNextTasks(reportData.nextTasks);
      Logger.log('Slack送信完了（V2）');
      return '送信成功：Slackに投稿しました。';
    }

    const err = res && res.error ? String(res.error) : 'unknown_error';
    Logger.log('Slack送信失敗（V2）：' + err);

    if (err === 'not_in_channel') {
      return 'エラー：#日報に参加していないため投稿できません。';
    }
    if (err === 'missing_scope' || err === 'invalid_auth' || err === 'token_revoked') {
      return 'エラー：Slack連携が無効になりました。再度「Slack連携（認可）」を実行してください。';
    }
    return 'エラー：Slackへの送信に失敗しました。エラー：' + err;

  } catch (error) {
    Logger.log('sendToSlackV2エラー：' + error.message);
    return 'エラー：予期しないエラーが発生しました。詳細：' + error.message;
  }
}
```

#### formatSlackMessageV2(reportData)

```javascript
/**
 * V2用Slack投稿本文を生成
 * @param {Object} reportData - 日報データ
 * @returns {string} Slack投稿本文
 */
function formatSlackMessageV2(reportData) {
  return reportData.header + '\n\n' +
    '【今日やったこと】\n' + reportData.todayTasks + '\n\n' +
    '【わかった事・問題・共有事項】\n' + reportData.notices + '\n\n' +
    '【売上・利益に関わるポイント】\n' + reportData.salesPoints + '\n\n' +
    '【次すること】\n' + reportData.nextTasks;
}
```

---

## 3. Index.html への変更

### 3.1 HTML構造の変更

#### 変更前（現行）
```html
<!-- テキストエリア -->
<div class="section textarea-container">
  <div class="section-title">予定データ（編集可能）</div>
  <textarea id="scheduleText" placeholder="..."></textarea>
</div>
```

#### 変更後（V2）
```html
<!-- 日報ヘッダー -->
<div id="reportHeader" class="report-header">
  【<span id="reportDate"></span>　<span id="reportUserName"></span>　日報】
</div>
<div id="nameInputContainer" class="form-group" style="display: none;">
  <label>氏名を入力してください</label>
  <input type="text" id="manualUserName" placeholder="例：山田太郎">
</div>

<!-- 今日やったこと -->
<div class="section textarea-container">
  <div class="section-title">【今日やったこと】</div>
  <textarea id="todayTasks" placeholder="カレンダーの予定が表示されます。編集も可能です。"></textarea>
</div>

<!-- わかった事・問題・共有事項 -->
<div class="section textarea-container">
  <div class="section-title">【わかった事・問題・共有事項】</div>
  <textarea id="notices" placeholder="⚫︎ "></textarea>
</div>

<!-- 売上・利益に関わるポイント -->
<div class="section textarea-container">
  <div class="section-title">【売上・利益に関わるポイント】</div>
  <textarea id="salesPoints" placeholder="⚫︎ "></textarea>
</div>

<!-- 次すること -->
<div class="section textarea-container">
  <div class="section-title">【次すること】</div>
  <textarea id="nextTasks" placeholder="⚫︎ "></textarea>
</div>
```

### 3.2 CSS追加

```css
/* ============================================
   V2追加スタイル
   ============================================ */

/* 日報ヘッダー */
.report-header {
  font-size: 18px;
  font-weight: bold;
  color: #2c3e50;
  text-align: center;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 6px;
  margin-bottom: 20px;
}

/* セクション別テキストエリア高さ */
#todayTasks {
  height: 150px;
}

#notices, #salesPoints, #nextTasks {
  height: 100px;
}

/* エラー状態 */
textarea.validation-error {
  border: 2px solid #e74c3c !important;
  background-color: #fdf2f2 !important;
}

/* エラーメッセージ（セクション別） */
.section-error {
  color: #e74c3c;
  font-size: 12px;
  margin-top: 5px;
  display: none;
}

.section-error.show {
  display: block;
}
```

### 3.3 JavaScript変更

#### 初期化処理の変更

```javascript
// ============================================
// V2初期化
// ============================================
function initV2() {
  google.script.run
    .withSuccessHandler(function(data) {
      // 日付を表示
      document.getElementById('reportDate').textContent = data.date;
      
      // 氏名を表示
      if (data.needsNameInput) {
        document.getElementById('reportUserName').textContent = '';
        document.getElementById('nameInputContainer').style.display = 'block';
      } else {
        document.getElementById('reportUserName').textContent = data.userName;
        document.getElementById('nameInputContainer').style.display = 'none';
      }
      
      // 前日の「次すること」を設定
      if (data.nextTasks) {
        document.getElementById('nextTasks').value = data.nextTasks;
      }
    })
    .withFailureHandler(function(error) {
      console.error('initV2 error:', error);
      // フォールバック：今日の日付を手動設定
      var today = new Date();
      var dateStr = today.getFullYear() + '年' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '月' + 
                    String(today.getDate()).padStart(2, '0') + '日';
      document.getElementById('reportDate').textContent = dateStr;
      document.getElementById('nameInputContainer').style.display = 'block';
    })
    .getInitialDataV2();
}

// ページ読み込み時の初期化を変更
window.addEventListener('load', function() {
  initDateSelects();
  refreshSlackLinkStatus();
  initV2();  // V2初期化を追加
  loadEventsForSelectedDate();
});
```

#### バリデーション処理の追加

```javascript
// ============================================
// V2バリデーション
// ============================================
function validateSectionsV2() {
  var sections = [
    { id: 'todayTasks', name: '今日やったこと' },
    { id: 'notices', name: 'わかった事・問題・共有事項' },
    { id: 'salesPoints', name: '売上・利益に関わるポイント' },
    { id: 'nextTasks', name: '次すること' }
  ];
  
  var errors = [];
  var allValid = true;
  
  sections.forEach(function(section) {
    var element = document.getElementById(section.id);
    var value = element.value.trim();
    
    if (!value) {
      errors.push(section.name);
      element.classList.add('validation-error');
      allValid = false;
    } else {
      element.classList.remove('validation-error');
    }
  });
  
  return {
    valid: allValid,
    errors: errors
  };
}

// エラー表示をクリア
function clearValidationErrors() {
  var textareas = document.querySelectorAll('textarea');
  textareas.forEach(function(ta) {
    ta.classList.remove('validation-error');
  });
}
```

#### Slack送信処理の変更

```javascript
// ============================================
// V2 Slack送信
// ============================================
function sendSlackV2() {
  if (isLoading) return;

  // バリデーション
  clearValidationErrors();
  var validation = validateSectionsV2();
  
  if (!validation.valid) {
    showMessage('未入力の項目があります：' + validation.errors.join('、'), true);
    return;
  }

  if (!isSlackLinked) {
    showMessage('Slack未連携です。「Slack連携（認可）」を実行してください。', true);
    return;
  }

  // 氏名を取得（手動入力の場合）
  var userName = document.getElementById('reportUserName').textContent;
  if (!userName) {
    userName = document.getElementById('manualUserName').value.trim();
    if (!userName) {
      showMessage('氏名を入力してください。', true);
      return;
    }
  }

  // ヘッダーを生成
  var date = document.getElementById('reportDate').textContent;
  var header = '【' + date + '　' + userName + '　日報】';

  // 日報データを作成
  var reportData = {
    header: header,
    todayTasks: document.getElementById('todayTasks').value,
    notices: document.getElementById('notices').value,
    salesPoints: document.getElementById('salesPoints').value,
    nextTasks: document.getElementById('nextTasks').value
  };

  showLoading(true);
  hideMessage();
  document.getElementById('btnSendSlack').disabled = true;

  google.script.run
    .withSuccessHandler(onSendSlackSuccessV2)
    .withFailureHandler(onSendSlackFailureV2)
    .sendToSlackV2(reportData);
}

function onSendSlackSuccessV2(result) {
  showLoading(false);
  document.getElementById('btnSendSlack').disabled = false;

  var isError = result && result.startsWith('エラー：');
  
  if (isError) {
    showMessage(result, true);
  } else {
    showCompletionScreen();
  }
}

function onSendSlackFailureV2(error) {
  showLoading(false);
  document.getElementById('btnSendSlack').disabled = false;
  showMessage('エラー：予期しないエラーが発生しました。詳細：' + error.message, true);
}
```

#### コピー機能の変更

```javascript
// ============================================
// V2 コピー機能
// ============================================
function copyToClipboardV2() {
  // 氏名を取得
  var userName = document.getElementById('reportUserName').textContent;
  if (!userName) {
    userName = document.getElementById('manualUserName').value.trim() || '（氏名未入力）';
  }

  var date = document.getElementById('reportDate').textContent;
  var header = '【' + date + '　' + userName + '　日報】';

  var text = header + '\n\n' +
    '【今日やったこと】\n' + document.getElementById('todayTasks').value + '\n\n' +
    '【わかった事・問題・共有事項】\n' + document.getElementById('notices').value + '\n\n' +
    '【売上・利益に関わるポイント】\n' + document.getElementById('salesPoints').value + '\n\n' +
    '【次すること】\n' + document.getElementById('nextTasks').value;

  navigator.clipboard.writeText(text).then(function() {
    showMessage('コピーしました。', false);
  }).catch(function(error) {
    // フォールバック
    var tempTextarea = document.createElement('textarea');
    tempTextarea.value = text;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextarea);
    showMessage('コピーしました。', false);
  });
}
```

#### カレンダー取得後の処理変更

```javascript
// カレンダー予定取得成功時（V2対応）
function onLoadEventsSuccessV2(result) {
  showLoading(false);
  document.getElementById('btnGetEvents').disabled = false;
  var btnRefresh = document.getElementById('btnRefreshEvents');
  if (btnRefresh) btnRefresh.disabled = false;

  if (result && result.startsWith('エラー：')) {
    showMessage(result, true);
    return;
  }

  // V2: todayTasksに設定
  document.getElementById('todayTasks').value = result;

  if (!result || result.trim() === '') {
    showMessage('今日の予定はありません。', false);
  } else {
    showMessage('予定を取得しました。', false);
  }
}
```

---

## 4. データ定義

### 4.1 保存データ

#### NEXT_TASKS_DATA

```json
{
  "date": "2026-01-24",
  "nextTasks": "⚫︎ タスク1\n⚫︎ タスク2\n⚫︎ タスク3"
}
```

| フィールド | 型 | 説明 |
|------------|-----|------|
| date | string | 保存日（YYYY-MM-DD形式） |
| nextTasks | string | 「次すること」の内容（改行区切り） |

---

## 5. Slack投稿フォーマット

### 5.1 投稿例

```
【2026年01月24日　高木太郎　日報】

【今日やったこと】
10:00-11:00 顧客訪問
14:00-15:00 会議
⚫︎ 資料作成

【わかった事・問題・共有事項】
⚫︎ 新規顧客からの問い合わせ増加傾向
⚫︎ 在庫不足の可能性あり

【売上・利益に関わるポイント】
⚫︎ A社案件 見積もり提出完了（100万円）

【次すること】
⚫︎ B社への提案資料作成
⚫︎ 週次MTG準備
```

---

## 6. 処理フロー

### 6.1 ページ読み込み時

```
1. ページ読み込み開始
2. initDateSelects() - 日付選択初期化
3. refreshSlackLinkStatus() - Slack連携状態確認
4. initV2() - V2初期化
   a. getInitialDataV2() を呼び出し
   b. 日付を表示
   c. 氏名を表示（または手動入力フィールド表示）
   d. 前日の「次すること」を設定
5. loadEventsForSelectedDate() - カレンダー予定取得
   a. 取得成功時、todayTasksに設定
6. ページ読み込み完了
```

### 6.2 Slack送信時

```
1. 「Slackに投稿」ボタン押下
2. バリデーション実行（validateSectionsV2）
3. バリデーション失敗時:
   a. エラーセクションをハイライト
   b. エラーメッセージ表示
   c. 処理中断
4. バリデーション成功時:
   a. 氏名を取得（自動or手動）
   b. ヘッダーを生成
   c. reportDataオブジェクトを作成
   d. sendToSlackV2() を呼び出し
5. Slack送信成功時:
   a. saveNextTasks() で「次すること」を保存
   b. 完了画面を表示
6. Slack送信失敗時:
   a. エラーメッセージ表示
```

---

## 7. エラーハンドリング

| エラー | 発生条件 | 対応 | メッセージ |
|--------|----------|------|------------|
| 氏名取得失敗 | API制限、権限不足 | 手動入力フィールド表示 | なし |
| 翌日引き継ぎ取得失敗 | データなし、JSON破損 | 空欄表示、エラーログ記録 | なし |
| バリデーションエラー | セクション空欄 | エラー表示、ハイライト | 「未入力の項目があります：〇〇、△△」 |
| 氏名未入力 | 手動入力時に空欄 | エラー表示 | 「氏名を入力してください。」 |
| Slack送信失敗 | ネットワークエラー、Webhook無効 | エラー表示 | 「Slackへの送信に失敗しました。」 |
| 「次すること」保存失敗 | Script Properties制限 | エラーログ記録（ユーザーには通知しない） | なし |

---

## 8. テスト項目

### 8.1 正常系

| No | テスト | 手順 | 期待結果 |
|----|--------|------|----------|
| 1 | V2テンプレート表示 | ページ読み込み | 4セクションが表示される |
| 2 | 日付表示 | ページ読み込み | 「YYYY年MM月DD日」形式で表示 |
| 3 | 氏名自動表示 | ページ読み込み | Googleアカウント名が表示される |
| 4 | カレンダー取得 | 「予定を取得」押下 | 「今日やったこと」に予定が入る |
| 5 | 全セクション入力→送信 | 全入力後に送信 | 正常にSlack送信される |
| 6 | 翌日引き継ぎ保存 | Slack送信成功後 | 「次すること」がScript Propertiesに保存される |
| 7 | 翌日引き継ぎ表示 | 翌日アクセス | 前日の「次すること」が表示される |
| 8 | 引き継ぎ内容編集 | 表示後に編集 | 編集可能、送信も可能 |
| 9 | コピー機能 | 「コピー」ボタン押下 | 新テンプレート形式でコピーされる |
| 10 | Slack投稿フォーマット | Slack送信後に確認 | V2フォーマットで投稿される |

### 8.2 異常系

| No | テスト | 手順 | 期待結果 |
|----|--------|------|----------|
| 1 | 1セクション空欄 | 1つだけ空欄で送信 | エラーメッセージ、該当欄がハイライト |
| 2 | 複数セクション空欄 | 複数空欄で送信 | エラーメッセージ、該当欄全てがハイライト |
| 3 | 空白のみ入力 | スペースのみ入力で送信 | エラーメッセージ表示 |
| 4 | 初回利用（引き継ぎなし） | 引き継ぎデータなし | 空欄で表示、エラーなし |
| 5 | 氏名取得失敗 | 権限なし状態 | 手動入力フィールド表示 |
| 6 | 氏名未入力で送信 | 手動入力欄が空 | エラーメッセージ表示 |

---

## 9. 完了条件

| No | 条件 | 確認方法 |
|----|------|----------|
| 1 | 新テンプレート（4セクション）で表示される | 画面確認 |
| 2 | 日付が「YYYY年MM月DD日」形式で表示される | 画面確認 |
| 3 | 氏名がGoogleアカウントから取得・表示される | 画面確認 |
| 4 | 全セクション必須バリデーションが動作する | テスト実行 |
| 5 | 「次すること」が翌日に引き継がれる | 翌日テスト |
| 6 | 既存機能（カレンダー取得、コピー、Slack送信）が正常動作する | テスト実行 |
| 7 | Slack投稿がV2フォーマットで送信される | Slack確認 |
| 8 | 全テスト項目がパスする | テスト実行 |

---

## 10. 実装順序（推奨）

1. Code.gs に定数追加
2. Code.gs に関数追加（getUserName, getTodayDateFormattedV2, saveNextTasks, getNextTasks, getInitialDataV2）
3. Code.gs に sendToSlackV2, formatSlackMessageV2 追加
4. Index.html のHTML構造変更
5. Index.html のCSS追加
6. Index.html のJavaScript変更
7. 動作確認・テスト

---

## 改定履歴

| バージョン | 日付 | 内容 |
|------------|------|------|
| 1.0 | 2026-01-24 | 60点版 初版作成 |
| 2.0 | 2026-01-24 | 100点版（1回目）：実装例追加、Slack投稿フォーマット追加、CSS追加 |
| 3.0 | 2026-01-24 | 最終100点版：既存コードとの統合方法明記、具体的な変更箇所追加、実装順序追加 |
