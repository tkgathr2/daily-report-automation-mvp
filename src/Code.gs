/**
 * 日報くん（WEBアプリ版）
 *
 * Googleカレンダーから今日の予定を取得し、
 * WEBブラウザ上で表示・編集・コピー → Slack送信できるWEBアプリ
 *
 * @version 2.0
 * @author Claude Code
 */

// ============================================
// 定数定義
// ============================================

// スクリプトプロパティキー
const PROPERTY_WEBHOOK_URL = 'SLACK_WEBHOOK_URL';

// タイムゾーン
const TIMEZONE = 'Asia/Tokyo';

// 日付フォーマット
const DATE_FORMAT = 'yyyy/MM/dd';
const TIME_FORMAT = 'HH:mm';

// ============================================
// WEBアプリエントリーポイント
// ============================================

/**
 * WEBアプリのエントリーポイント
 * HTMLファイルを返却する
 * @returns {HtmlOutput} HTMLページ
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('日報くん')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================
// カレンダー関連関数
// ============================================

/**
 * 今日のカレンダー予定を取得
 * プライマリカレンダーから当日の予定を取得し、フォーマット済みテキストを返却
 * @returns {string} フォーマット済み予定テキスト、またはエラーメッセージ
 */
function getTodayEvents() {
  Logger.log('カレンダー予定取得開始');

  try {
    // 今日の日付を取得
    const todayString = getTodayDateString();
    Logger.log('対象日付：' + todayString);

    // 今日の開始時刻と終了時刻を設定
    const today = new Date();
    const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // プライマリカレンダーを取得
    let calendar;
    try {
      calendar = CalendarApp.getCalendarById('primary');
    } catch (e) {
      Logger.log('カレンダーアクセスエラー：' + e.message);
      return 'エラー：カレンダーへのアクセス権限がありません。権限を確認してください。';
    }

    if (!calendar) {
      Logger.log('カレンダー取得失敗：プライマリカレンダーが見つかりません');
      return 'エラー：カレンダーへのアクセス権限がありません。権限を確認してください。';
    }

    // 予定を取得
    let events;
    try {
      events = calendar.getEvents(startTime, endTime);
    } catch (e) {
      Logger.log('カレンダー予定取得エラー：' + e.message);
      return 'エラー：カレンダーから予定を取得できませんでした。しばらく時間をおいてから再度お試しください。';
    }

    Logger.log('カレンダー予定取得完了：' + events.length + '件');

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

    // テキスト形式にフォーマット
    const scheduleText = formatScheduleText(eventList);
    Logger.log('スケジュールテキスト生成完了');

    return scheduleText;

  } catch (error) {
    Logger.log('getTodayEventsエラー：' + error.message);
    return 'エラー：予期しないエラーが発生しました。詳細：' + error.message;
  }
}

/**
 * イベント配列をテキスト形式にフォーマット
 * @param {Array} events - イベント配列
 * @returns {string} フォーマット済みテキスト
 */
function formatScheduleText(events) {
  if (!events || events.length === 0) {
    return '';  // 予定が0件の場合は空文字列
  }

  const lines = [];
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.isAllDay) {
      // 終日イベント
      lines.push('・' + event.title + '（終日）');
    } else {
      // 通常イベント
      const startTimeStr = Utilities.formatDate(event.startTime, TIMEZONE, TIME_FORMAT);
      const endTimeStr = Utilities.formatDate(event.endTime, TIMEZONE, TIME_FORMAT);
      lines.push('・' + event.title + ' ' + startTimeStr + '-' + endTimeStr);
    }
  }

  return lines.join('\n');
}

// ============================================
// Slack送信関連関数
// ============================================

/**
 * Slackに投稿
 * @param {string} text - テキストエリアの内容
 * @param {string} channel - チャンネル名（#から始まる）
 * @returns {string} 成功/失敗メッセージ
 */
function sendToSlack(text, channel) {
  Logger.log('Slack送信開始');

  try {
    // チャンネル名のバリデーション
    if (!channel || !channel.startsWith('#')) {
      Logger.log('チャンネル名エラー：' + channel);
      return 'エラー：チャンネル名が無効です。#から始まる形式で入力してください。';
    }

    // Webhook URLを取得
    const webhookUrl = getWebhookUrl();
    if (!webhookUrl) {
      Logger.log('Webhook URL未設定');
      return 'エラー：Slack Webhook URLが設定されていません。設定を確認してください。';
    }

    // 今日の日付を取得
    const todayString = getTodayDateString();

    // Slack投稿本文を生成
    const slackMessage = formatSlackMessage(todayString, text);
    Logger.log('Slack投稿本文生成完了');

    // リクエストボディを作成
    const payload = {
      channel: channel,
      text: slackMessage
    };

    // リクエストオプションを設定
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    // Slackに送信
    let response;
    try {
      response = UrlFetchApp.fetch(webhookUrl, options);
    } catch (e) {
      Logger.log('Slack送信エラー：' + e.message);
      if (e.message.includes('Invalid argument') || e.message.includes('Invalid URL')) {
        return 'エラー：Slack Webhook URLが無効です。設定を確認してください。';
      }
      return 'エラー：Slackへの送信に失敗しました。ネットワーク接続を確認してください。';
    }

    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    Logger.log('Slack送信レスポンス：' + responseCode + ' - ' + responseText);

    // レスポンスをチェック
    if (responseCode === 200 && responseText === 'ok') {
      Logger.log('Slack送信完了');
      return '送信成功：Slackに投稿しました。';
    } else if (responseCode === 404) {
      return 'エラー：Slack Webhook URLが無効です。設定を確認してください。';
    } else {
      return 'エラー：Slackへの送信に失敗しました。ネットワーク接続を確認してください。';
    }

  } catch (error) {
    Logger.log('sendToSlackエラー：' + error.message);
    return 'エラー：予期しないエラーが発生しました。詳細：' + error.message;
  }
}

/**
 * Slack投稿本文を生成
 * @param {string} date - 日付（YYYY/MM/DD形式）
 * @param {string} text - テキストエリアの内容
 * @returns {string} Slack投稿本文
 */
function formatSlackMessage(date, text) {
  return '【日報】' + date + '\n\n■ 本日のスケジュール\n' + text;
}

// ============================================
// 設定管理関数
// ============================================

/**
 * スクリプトプロパティからWebhook URLを取得
 * @returns {string|null} Webhook URL、未設定の場合はnull
 */
function getWebhookUrl() {
  const properties = PropertiesService.getScriptProperties();
  const url = properties.getProperty(PROPERTY_WEBHOOK_URL);
  return url || null;
}

/**
 * スクリプトプロパティにWebhook URLを設定
 * @param {string} url - Webhook URL
 */
function setWebhookUrl(url) {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty(PROPERTY_WEBHOOK_URL, url);
  Logger.log('Webhook URL設定完了');
}

// ============================================
// ユーティリティ関数
// ============================================

/**
 * 今日の日付をYYYY/MM/DD形式で取得
 * @returns {string} 日付文字列
 */
function getTodayDateString() {
  const today = new Date();
  return Utilities.formatDate(today, TIMEZONE, DATE_FORMAT);
}
