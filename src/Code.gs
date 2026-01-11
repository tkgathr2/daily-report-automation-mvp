/**
 * 日報自動生成システム MVP
 *
 * Googleカレンダーと営業KPIシートから情報を取得し、
 * 日報の下書きを自動生成 → 編集 → ワンクリックでSlack送信できるシステム
 *
 * @version 1.0
 * @author Claude Code
 */

// ============================================
// 定数定義
// ============================================

// シート名
const SHEET_NAME_KPI = 'KPI';
const SHEET_NAME_DRAFT = 'DailyReport_Draft';
const SHEET_NAME_CONFIG = 'Config';

// 列インデックス（DailyReport_Draftシート）
const COL_DATE = 0;  // A列：日付
const COL_SCHEDULE = 1;  // B列：スケジュール本文
const COL_KPI = 2;  // C列：KPI本文
const COL_GOOD = 3;  // D列：上手く行ったこと
const COL_BAD = 4;  // E列：上手く行かなかったこと
const COL_TOMORROW = 5;  // F列：明日やること
const COL_SLACK_TEXT = 6;  // G列：Slack投稿本文
const COL_SENT = 7;  // H列：送信済み
const COL_SENT_DATETIME = 8;  // I列：送信日時

// 列インデックス（KPIシート）
const COL_KPI_DATE = 0;  // A列：日付
const COL_KPI_VISIT = 1;  // B列：訪問数

// Config設定項目名
const CONFIG_CALENDAR_ID = 'CALENDAR_ID';
const CONFIG_WEBHOOK_URL = 'SLACK_WEBHOOK_URL';
const CONFIG_CHANNEL = 'SLACK_CHANNEL';

// ============================================
// メイン関数
// ============================================

/**
 * スプレッドシートを開いた際にカスタムメニューを追加
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('日報システム')
    .addItem('日報生成', 'generateDailyReport')
    .addItem('日報送信', 'sendToSlack')
    .addToUi();
}

/**
 * 日報下書き生成のメイン関数
 * カレンダー予定とKPIデータを取得し、DailyReport_Draftシートに下書きを生成
 */
function generateDailyReport() {
  Logger.log('日報生成開始');

  try {
    // 今日の日付を取得
    const todayString = getTodayDateString();
    Logger.log('対象日付：' + todayString);

    // Configシートから設定値を取得
    const calendarId = getConfigValue(CONFIG_CALENDAR_ID);
    if (!calendarId) {
      return; // エラーはgetConfigValue内で表示済み
    }
    Logger.log('カレンダーID取得完了：' + calendarId);

    // カレンダーから予定を取得
    const events = getCalendarEvents(todayString, calendarId);
    if (events === null) {
      return; // エラーはgetCalendarEvents内で表示済み
    }
    Logger.log('カレンダー予定取得完了：' + events.length + '件');

    // スケジュール本文をフォーマット
    const scheduleText = formatScheduleText(events);
    Logger.log('スケジュール本文：' + scheduleText);

    // KPIシートからデータを取得
    const kpiData = getKPIData(todayString);
    if (kpiData === null) {
      return; // エラーはgetKPIData内で表示済み
    }
    Logger.log('KPIデータ取得完了：訪問数=' + kpiData.visit);

    // KPI本文をフォーマット
    const kpiText = formatKPIText(kpiData);
    Logger.log('KPI本文：' + kpiText);

    // DailyReport_Draftシートを取得
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const draftSheet = ss.getSheetByName(SHEET_NAME_DRAFT);
    if (!draftSheet) {
      showError('エラー：DailyReport_Draftシートが見つかりません。シート名を確認してください。');
      return;
    }

    // 該当日の行を検索
    const rowIndex = findRowByDate(draftSheet, todayString, COL_DATE);

    // 行データを準備
    const today = new Date();
    const rowData = [
      todayString,      // A列：日付
      scheduleText,     // B列：スケジュール本文
      kpiText,          // C列：KPI本文
      '',               // D列：上手く行ったこと（空欄）
      '',               // E列：上手く行かなかったこと（空欄）
      '',               // F列：明日やること（空欄）
      '',               // G列：Slack投稿本文（送信時に生成）
      'FALSE',          // H列：送信済み
      ''                // I列：送信日時（空欄）
    ];

    if (rowIndex > 0) {
      // 既存行を上書き（手入力欄は保持）
      const existingData = draftSheet.getRange(rowIndex, 1, 1, 9).getValues()[0];
      rowData[COL_GOOD] = existingData[COL_GOOD] || '';  // 上手く行ったこと
      rowData[COL_BAD] = existingData[COL_BAD] || '';   // 上手く行かなかったこと
      rowData[COL_TOMORROW] = existingData[COL_TOMORROW] || '';  // 明日やること
      rowData[COL_SENT] = existingData[COL_SENT] || 'FALSE';  // 送信済みフラグ
      rowData[COL_SENT_DATETIME] = existingData[COL_SENT_DATETIME] || '';  // 送信日時

      draftSheet.getRange(rowIndex, 1, 1, 9).setValues([rowData]);
      Logger.log('既存行を上書き：行番号=' + rowIndex);
    } else {
      // 新規行を追加
      draftSheet.appendRow(rowData);
      Logger.log('新規行を追加');
    }

    // 完了メッセージ
    Browser.msgBox('日報生成完了', '日報下書きを生成しました。\\n対象日：' + todayString, Browser.Buttons.OK);
    Logger.log('日報生成完了');

  } catch (error) {
    Logger.log('日報生成エラー：' + error.message);
    showError('エラー：日報生成中に予期しないエラーが発生しました。\\n詳細：' + error.message);
  }
}

/**
 * Slack送信のメイン関数
 * DailyReport_Draftシートから当日の日報を取得し、Slackに送信
 */
function sendToSlack() {
  Logger.log('Slack送信開始');

  try {
    // 今日の日付を取得
    const todayString = getTodayDateString();
    Logger.log('対象日付：' + todayString);

    // Configシートから設定値を取得
    const webhookUrl = getConfigValue(CONFIG_WEBHOOK_URL);
    if (!webhookUrl) {
      return; // エラーはgetConfigValue内で表示済み
    }
    Logger.log('Webhook URL取得完了');

    const channel = getConfigValue(CONFIG_CHANNEL);
    if (!channel) {
      return; // エラーはgetConfigValue内で表示済み
    }
    Logger.log('チャンネル名取得完了：' + channel);

    // DailyReport_Draftシートを取得
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const draftSheet = ss.getSheetByName(SHEET_NAME_DRAFT);
    if (!draftSheet) {
      showError('エラー：DailyReport_Draftシートが見つかりません。シート名を確認してください。');
      return;
    }

    // 該当日の行を検索
    const rowIndex = findRowByDate(draftSheet, todayString, COL_DATE);
    if (rowIndex < 0) {
      showError('エラー：本日（' + todayString + '）の日報が存在しません。先に「日報生成」を実行してください。');
      return;
    }

    // 行データを取得
    const rowData = draftSheet.getRange(rowIndex, 1, 1, 9).getValues()[0];

    // 送信済みフラグをチェック
    const sentFlag = String(rowData[COL_SENT]).toUpperCase();
    if (sentFlag === 'TRUE') {
      showError('エラー：この日報は既に送信済みです。再送信する場合は、送信済みフラグをFALSEに変更してください。');
      return;
    }

    // Slack投稿本文を生成
    const slackText = formatDailyReportText(rowData);
    Logger.log('Slack投稿本文生成完了');

    // Slackに送信
    const success = sendSlackMessage(webhookUrl, channel, slackText);
    if (!success) {
      return; // エラーはsendSlackMessage内で表示済み
    }

    // 送信成功時：送信済みフラグと送信日時を更新
    const now = new Date();
    const sentDatetime = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

    draftSheet.getRange(rowIndex, COL_SLACK_TEXT + 1).setValue(slackText);  // G列：Slack投稿本文
    draftSheet.getRange(rowIndex, COL_SENT + 1).setValue('TRUE');  // H列：送信済み
    draftSheet.getRange(rowIndex, COL_SENT_DATETIME + 1).setValue(sentDatetime);  // I列：送信日時

    // 完了メッセージ
    Browser.msgBox('送信完了', 'Slackへの送信が完了しました。\\nチャンネル：' + channel + '\\n送信日時：' + sentDatetime, Browser.Buttons.OK);
    Logger.log('Slack送信完了：' + sentDatetime);

  } catch (error) {
    Logger.log('Slack送信エラー：' + error.message);
    showError('エラー：Slack送信中に予期しないエラーが発生しました。\\n詳細：' + error.message);
  }
}

// ============================================
// カレンダー関連関数
// ============================================

/**
 * カレンダーから指定日の予定を取得
 * @param {string} dateString - 日付文字列（YYYY/MM/DD形式）
 * @param {string} calendarId - カレンダーID
 * @returns {Array|null} イベント配列、エラー時はnull
 */
function getCalendarEvents(dateString, calendarId) {
  try {
    // 日付をパース
    const parts = dateString.split('/');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;  // 月は0始まり
    const day = parseInt(parts[2], 10);

    // 開始時刻と終了時刻を設定（JST基準）
    const startTime = new Date(year, month, day, 0, 0, 0);
    const endTime = new Date(year, month, day, 23, 59, 59);

    // カレンダーを取得
    let calendar;
    try {
      calendar = CalendarApp.getCalendarById(calendarId);
    } catch (e) {
      Logger.log('カレンダー取得エラー：' + e.message);
      showError('エラー：カレンダーIDが無効です。ConfigシートのCALENDAR_IDを確認してください。');
      return null;
    }

    if (!calendar) {
      showError('エラー：カレンダーIDが無効です。ConfigシートのCALENDAR_IDを確認してください。');
      return null;
    }

    // 予定を取得
    let events;
    try {
      events = calendar.getEvents(startTime, endTime);
    } catch (e) {
      Logger.log('カレンダー予定取得エラー：' + e.message);
      if (e.message.includes('forbidden') || e.message.includes('permission')) {
        showError('エラー：カレンダーへのアクセス権限がありません。カレンダーの共有設定を確認してください。');
      } else if (e.message.includes('rate') || e.message.includes('limit')) {
        showError('エラー：APIの利用制限に達しました。しばらく時間をおいてから再度お試しください。');
      } else {
        showError('エラー：カレンダーIDが無効です。ConfigシートのCALENDAR_IDを確認してください。');
      }
      return null;
    }

    // イベント情報を配列に変換
    const eventList = [];
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      eventList.push({
        title: event.getTitle(),
        isAllDay: event.isAllDayEvent(),
        startTime: event.getStartTime(),
        endTime: event.getEndTime()
      });
    }

    // 開始時刻の昇順でソート
    eventList.sort(function(a, b) {
      return a.startTime.getTime() - b.startTime.getTime();
    });

    return eventList;

  } catch (error) {
    Logger.log('getCalendarEventsエラー：' + error.message);
    showError('エラー：カレンダー予定の取得中にエラーが発生しました。\\n詳細：' + error.message);
    return null;
  }
}

/**
 * スケジュール本文をフォーマット
 * @param {Array} events - イベント配列
 * @returns {string} フォーマット済みスケジュール本文
 */
function formatScheduleText(events) {
  if (!events || events.length === 0) {
    return '・予定なし';
  }

  const lines = [];
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.isAllDay) {
      // 終日イベント
      lines.push('・' + event.title + '（終日）');
    } else {
      // 通常イベント
      const startTimeStr = Utilities.formatDate(event.startTime, 'Asia/Tokyo', 'HH:mm');
      const endTimeStr = Utilities.formatDate(event.endTime, 'Asia/Tokyo', 'HH:mm');
      lines.push('・' + event.title + ' ' + startTimeStr + '-' + endTimeStr);
    }
  }

  return lines.join('\n');
}

// ============================================
// KPI関連関数
// ============================================

/**
 * KPIシートから指定日のデータを取得
 * @param {string} dateString - 日付文字列（YYYY/MM/DD形式）
 * @returns {Object|null} KPIデータオブジェクト、エラー時はnull
 */
function getKPIData(dateString) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const kpiSheet = ss.getSheetByName(SHEET_NAME_KPI);

    if (!kpiSheet) {
      showError('エラー：KPIシートが見つかりません。シート名を確認してください。');
      return null;
    }

    // 該当日の行を検索
    const rowIndex = findRowByDate(kpiSheet, dateString, COL_KPI_DATE);
    if (rowIndex < 0) {
      showError('エラー：KPIシートに本日（' + dateString + '）のデータが存在しません。KPIシートにデータを入力してください。');
      return null;
    }

    // 行データを取得
    const rowData = kpiSheet.getRange(rowIndex, 1, 1, 4).getValues()[0];

    // 訪問数を取得・バリデーション
    let visitCount = rowData[COL_KPI_VISIT];

    // 空の場合は0として扱う
    if (visitCount === '' || visitCount === null || visitCount === undefined) {
      visitCount = 0;
    } else if (typeof visitCount !== 'number') {
      // 数値でない場合
      showError('エラー：KPIシートの訪問数が数値ではありません。整数を入力してください。');
      return null;
    } else if (visitCount < 0) {
      // 負の値の場合
      showError('エラー：KPIシートの訪問数が負の値です。0以上の整数を入力してください。');
      return null;
    }

    return {
      date: dateString,
      visit: Math.floor(visitCount)  // 整数に変換
    };

  } catch (error) {
    Logger.log('getKPIDataエラー：' + error.message);
    showError('エラー：KPIデータの取得中にエラーが発生しました。\\n詳細：' + error.message);
    return null;
  }
}

/**
 * KPI本文をフォーマット
 * @param {Object} kpiData - KPIデータオブジェクト
 * @returns {string} フォーマット済みKPI本文
 */
function formatKPIText(kpiData) {
  return '・訪問数：' + kpiData.visit + '件';
}

// ============================================
// Slack関連関数
// ============================================

/**
 * 日報本文をフォーマット（Slack投稿用）
 * @param {Array} rowData - DailyReport_Draftシートの行データ
 * @returns {string} フォーマット済み日報本文
 */
function formatDailyReportText(rowData) {
  const dateStr = rowData[COL_DATE];
  const scheduleText = rowData[COL_SCHEDULE] || '・予定なし';
  const kpiText = rowData[COL_KPI] || '・訪問数：0件';
  const goodText = rowData[COL_GOOD] || '（未記入）';
  const badText = rowData[COL_BAD] || '（未記入）';
  const tomorrowText = rowData[COL_TOMORROW] || '（未記入）';

  // 日付をフォーマット
  let formattedDate = dateStr;
  if (dateStr instanceof Date) {
    formattedDate = Utilities.formatDate(dateStr, 'Asia/Tokyo', 'yyyy/MM/dd');
  }

  // Slack投稿本文を生成
  const text = '【日報】' + formattedDate + '\n\n' +
    '■ 本日のスケジュール\n' + scheduleText + '\n\n' +
    '■ KPI実績\n' + kpiText + '\n\n' +
    '■ 上手く行ったこと\n' + (goodText.trim() === '' ? '（未記入）' : goodText) + '\n\n' +
    '■ 上手く行かなかったこと\n' + (badText.trim() === '' ? '（未記入）' : badText) + '\n\n' +
    '■ 明日やること\n' + (tomorrowText.trim() === '' ? '（未記入）' : tomorrowText);

  return text;
}

/**
 * Slackにメッセージを送信
 * @param {string} webhookUrl - Webhook URL
 * @param {string} channel - チャンネル名
 * @param {string} text - 投稿本文
 * @returns {boolean} 成功時true、失敗時false
 */
function sendSlackMessage(webhookUrl, channel, text) {
  try {
    // リクエストボディを作成
    const payload = {
      channel: channel,
      text: text
    };

    // リクエストオプションを設定
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true  // HTTPエラーでも例外を投げない
    };

    // Slackに送信
    const response = UrlFetchApp.fetch(webhookUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    Logger.log('Slack送信レスポンス：' + responseCode + ' - ' + responseText);

    // レスポンスをチェック
    if (responseCode === 200 && responseText === 'ok') {
      return true;
    } else if (responseCode === 404) {
      showError('エラー：Slack Webhook URLが無効です。ConfigシートのSLACK_WEBHOOK_URLを確認してください。');
      return false;
    } else if (responseCode === 400 && responseText.includes('channel')) {
      showError('エラー：Slackチャンネル名が無効です。ConfigシートのSLACK_CHANNELを確認してください。');
      return false;
    } else {
      showError('エラー：Slackへの送信に失敗しました。ネットワーク接続を確認してください。');
      return false;
    }

  } catch (error) {
    Logger.log('sendSlackMessageエラー：' + error.message);
    if (error.message.includes('Invalid argument') || error.message.includes('Invalid URL')) {
      showError('エラー：Slack Webhook URLが無効です。ConfigシートのSLACK_WEBHOOK_URLを確認してください。');
    } else {
      showError('エラー：Slackへの送信に失敗しました。ネットワーク接続を確認してください。');
    }
    return false;
  }
}

// ============================================
// 設定・ユーティリティ関数
// ============================================

/**
 * Configシートから設定値を取得
 * @param {string} key - 設定項目名
 * @returns {string|null} 設定値、エラー時はnull
 */
function getConfigValue(key) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = ss.getSheetByName(SHEET_NAME_CONFIG);

    if (!configSheet) {
      showError('エラー：Configシートが見つかりません。シート名を確認してください。');
      return null;
    }

    // Configシートのデータを取得
    const data = configSheet.getDataRange().getValues();

    // 設定項目を検索（1行目はヘッダーなのでスキップ）
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === key) {
        const value = data[i][1];
        if (value === '' || value === null || value === undefined) {
          showError('エラー：Configシートの設定項目（' + key + '）の値が空です。');
          return null;
        }
        return String(value);
      }
    }

    // 設定項目が見つからない（各設定項目ごとにメッセージを分ける）
    if (key === CONFIG_CALENDAR_ID) {
      showError('エラー：ConfigシートにCALENDAR_IDが設定されていません。');
    } else if (key === CONFIG_WEBHOOK_URL) {
      showError('エラー：ConfigシートにSLACK_WEBHOOK_URLが設定されていません。');
    } else if (key === CONFIG_CHANNEL) {
      showError('エラー：ConfigシートにSLACK_CHANNELが設定されていません。');
    } else {
      showError('エラー：Configシートに必須設定項目（' + key + '）が設定されていません。');
    }
    return null;

  } catch (error) {
    Logger.log('getConfigValueエラー：' + error.message);
    showError('エラー：設定値の取得中にエラーが発生しました。\\n詳細：' + error.message);
    return null;
  }
}

/**
 * 今日の日付をYYYY/MM/DD形式で取得
 * @returns {string} 日付文字列
 */
function getTodayDateString() {
  const today = new Date();
  return Utilities.formatDate(today, 'Asia/Tokyo', 'yyyy/MM/dd');
}

/**
 * 指定日付の行を検索
 * @param {Sheet} sheet - 検索対象のシート
 * @param {string} dateString - 日付文字列（YYYY/MM/DD形式）
 * @param {number} dateColumnIndex - 日付列のインデックス（0始まり）
 * @returns {number} 行番号（1始まり）、見つからない場合は-1
 */
function findRowByDate(sheet, dateString, dateColumnIndex) {
  const data = sheet.getDataRange().getValues();

  // 1行目はヘッダーなのでスキップ
  for (let i = 1; i < data.length; i++) {
    const cellValue = data[i][dateColumnIndex];

    // セルの値が空の場合はスキップ
    if (cellValue === '' || cellValue === null || cellValue === undefined) {
      continue;
    }

    // 日付を文字列に変換して比較
    let cellDateString;
    if (cellValue instanceof Date) {
      cellDateString = Utilities.formatDate(cellValue, 'Asia/Tokyo', 'yyyy/MM/dd');
    } else {
      cellDateString = String(cellValue);
    }

    if (cellDateString === dateString) {
      return i + 1;  // 行番号は1始まり
    }
  }

  return -1;  // 見つからない場合
}

/**
 * エラーメッセージを表示
 * @param {string} message - エラーメッセージ
 */
function showError(message) {
  Logger.log('エラー：' + message);
  Browser.msgBox('エラー', message, Browser.Buttons.OK);
}
