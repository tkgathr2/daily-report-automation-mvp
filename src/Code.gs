/**
 * 簡単日報くん（WEBアプリ版）
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
const PROPERTY_SLACK_CLIENT_ID = 'SLACK_CLIENT_ID';
const PROPERTY_SLACK_CLIENT_SECRET = 'SLACK_CLIENT_SECRET';
const PROPERTY_SLACK_CHANNEL_ID = 'SLACK_CHANNEL_ID';

// ユーザープロパティキー（ユーザーごと）
const USER_PROPERTY_SLACK_USER_TOKEN = 'SLACK_USER_TOKEN';
const USER_PROPERTY_SLACK_USER_ID = 'SLACK_USER_ID';
const USER_PROPERTY_SLACK_TEAM_ID = 'SLACK_TEAM_ID';
const USER_PROPERTY_SLACK_OAUTH_STATE = 'SLACK_OAUTH_STATE';
const USER_PROPERTY_SLACK_OAUTH_STATE_TS = 'SLACK_OAUTH_STATE_TS';

// タイムゾーン
const TIMEZONE = 'Asia/Tokyo';

// 日付フォーマット
const DATE_FORMAT = 'yyyy/MM/dd';
const TIME_FORMAT = 'HH:mm';

// V2追加定数
const USER_PROPERTY_NEXT_TASKS = 'NEXT_TASKS_DATA';
const DATE_FORMAT_V2 = 'yyyy年MM月dd日';

// V3追加定数
const USER_PROPERTY_TOOL_SETTINGS = 'TOOL_SETTINGS';
const MAX_ITEMS_PER_TOOL = 20;

// ============================================
// WEBアプリエントリーポイント
// ============================================

/**
 * WEBアプリのエントリーポイント
 * HTMLファイルを返却する
 * @returns {HtmlOutput} HTMLページ
 */
function doGet(e) {
  // Slack OAuthコールバック
  if (e && e.parameter) {
    if (e.parameter.error) {
      return HtmlService.createHtmlOutput(
        'Slack連携に失敗しました。エラー：' + String(e.parameter.error)
        + '<br><br><a href="' + getServiceUrl_() + '">アプリに戻る</a>'
      ).setTitle('Slack連携（失敗）');
    }
    if (e.parameter.code) {
      return handleSlackOAuthCallback_(e);
    }
  }

  // 通常表示
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('簡単日報くん')
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
  return getEventsForDate(null);
}

/**
 * 指定日のカレンダー予定を取得
 * プライマリカレンダーから指定日の予定を取得し、フォーマット済みテキストを返却
 * @param {string} dateString - 日付文字列（YYYY-MM-DD形式）、nullの場合は今日
 * @returns {string} フォーマット済み予定テキスト、またはエラーメッセージ
 */
function getEventsForDate(dateString) {
  Logger.log('カレンダー予定取得開始');

  try {
    // 対象日を設定
    let targetDate;
    if (dateString) {
      // YYYY-MM-DD形式をパース
      const parts = dateString.split('-');
      targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      targetDate = new Date();
    }
    
    const targetDateString = Utilities.formatDate(targetDate, TIMEZONE, DATE_FORMAT);
    Logger.log('対象日付：' + targetDateString);

    // 対象日の開始時刻と終了時刻を設定
    const startTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endTime = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

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
      lines.push('終日 ' + event.title);
    } else {
      // 通常イベント
      const startTimeStr = Utilities.formatDate(event.startTime, TIMEZONE, TIME_FORMAT);
      const endTimeStr = Utilities.formatDate(event.endTime, TIMEZONE, TIME_FORMAT);
      lines.push(startTimeStr + '-' + endTimeStr + ' ' + event.title);
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
 * @returns {string} 成功/失敗メッセージ
 */
function sendToSlack(text) {
  Logger.log('Slack送信開始');

  try {
    // 本文のバリデーション
    if (!text || String(text).trim() === '') {
      return 'エラー：送信するテキストがありません。';
    }

    // OAuth連携済みユーザートークンを取得（ユーザーごと）
    const userToken = getSlackUserToken_();
    if (!userToken) {
      return 'エラー：Slack連携が必要です。「Slack連携（認可）」を実行してください。';
    }

    const channelId = getSlackChannelId_();
    if (!channelId) {
      return 'エラー：Slackチャンネル設定がありません。管理者に連絡してください。';
    }

    // 今日の日付を取得
    const todayString = getTodayDateString();

    // Slack投稿本文を生成
    const slackMessage = formatSlackMessage(todayString, text);
    Logger.log('Slack投稿本文生成完了');

    const res = slackApiPost_(
      'https://slack.com/api/chat.postMessage',
      userToken,
      {
        channel: channelId,
        text: slackMessage
      }
    );

    if (res && res.ok) {
      Logger.log('Slack送信完了');
      return '送信成功：Slackに投稿しました。';
    }

    const err = res && res.error ? String(res.error) : 'unknown_error';
    Logger.log('Slack送信失敗：' + err);

    if (err === 'not_in_channel') {
      return 'エラー：#日報に参加していないため投稿できません。#日報に参加してから再度お試しください。';
    }
    if (err === 'missing_scope' || err === 'invalid_auth' || err === 'token_revoked') {
      return 'エラー：Slack連携が無効になりました。再度「Slack連携（認可）」を実行してください。';
    }
    return 'エラー：Slackへの送信に失敗しました。エラー：' + err;

  } catch (error) {
    Logger.log('sendToSlackエラー：' + error.message);
    return 'エラー：予期しないエラーが発生しました。詳細：' + error.message;
  }
}

/**
 * Slack連携状態を取得
 * @returns {{linked: boolean, slackUserId: (string|null)}} 連携状態
 */
function getSlackLinkStatus() {
  const props = PropertiesService.getUserProperties();
  const token = props.getProperty(USER_PROPERTY_SLACK_USER_TOKEN);
  const slackUserId = props.getProperty(USER_PROPERTY_SLACK_USER_ID) || null;
  return {
    linked: !!token,
    slackUserId: slackUserId
  };
}

/**
 * Slack OAuth認可URLを返す（ユーザーごと）
 * @returns {string} 認可URL
 */
function getSlackAuthorizeUrl() {
  const cfg = getSlackClientConfig_();
  if (!cfg.clientId) {
    return '';
  }

  const redirectUri = getServiceUrl_();
  const state = generateAndStoreSlackOAuthState_();

  const params = {
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    user_scope: 'chat:write',
    state: state
  };

  return 'https://slack.com/oauth/v2/authorize?' + toQueryString_(params);
}

// ============================================
// Slack OAuth（実ユーザー投稿）内部実装
// ============================================

function handleSlackOAuthCallback_(e) {
  try {
    const cfg = getSlackClientConfig_();
    if (!cfg.clientId || !cfg.clientSecret) {
      return HtmlService.createHtmlOutput(
        'Slack連携に失敗しました。管理者設定（Client ID/Secret）が不足しています。'
        + '<br><br><a href="' + getServiceUrl_() + '">アプリに戻る</a>'
      ).setTitle('Slack連携（失敗）');
    }

    const code = String(e.parameter.code || '');
    const state = String(e.parameter.state || '');
    if (!verifySlackOAuthState_(state)) {
      return HtmlService.createHtmlOutput(
        'Slack連携に失敗しました。state検証に失敗しました。もう一度「Slack連携（認可）」からやり直してください。'
        + '<br><br><a href="' + getServiceUrl_() + '">アプリに戻る</a>'
      ).setTitle('Slack連携（失敗）');
    }

    const redirectUri = getServiceUrl_();

    const tokenRes = UrlFetchApp.fetch('https://slack.com/api/oauth.v2.access', {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload: {
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        code: code,
        redirect_uri: redirectUri
      },
      muteHttpExceptions: true
    });

    const body = tokenRes.getContentText();
    const json = safeJsonParse_(body);
    if (!json || !json.ok) {
      const err = json && json.error ? String(json.error) : 'unknown_error';
      return HtmlService.createHtmlOutput(
        'Slack連携に失敗しました。エラー：' + err
        + '<br><br><a href="' + getServiceUrl_() + '">アプリに戻る</a>'
      ).setTitle('Slack連携（失敗）');
    }

    // OAuth v2のユーザートークン
    const userToken = json.authed_user && json.authed_user.access_token ? String(json.authed_user.access_token) : '';
    const slackUserId = json.authed_user && json.authed_user.id ? String(json.authed_user.id) : '';
    const teamId = json.team && json.team.id ? String(json.team.id) : '';

    if (!userToken) {
      return HtmlService.createHtmlOutput(
        'Slack連携に失敗しました。ユーザートークンが取得できませんでした。'
        + '<br><br><a href="' + getServiceUrl_() + '">アプリに戻る</a>'
      ).setTitle('Slack連携（失敗）');
    }

    saveSlackUserToken_(userToken, slackUserId, teamId);

    return HtmlService.createHtmlOutput(
      'Slack連携が完了しました。'
      + '<br><br><a href="' + getServiceUrl_() + '">アプリに戻る</a>'
    ).setTitle('Slack連携（完了）');
  } catch (err) {
    return HtmlService.createHtmlOutput(
      'Slack連携に失敗しました。予期しないエラー：' + String(err && err.message ? err.message : err)
      + '<br><br><a href="' + getServiceUrl_() + '">アプリに戻る</a>'
    ).setTitle('Slack連携（失敗）');
  }
}

function saveSlackUserToken_(token, slackUserId, teamId) {
  const props = PropertiesService.getUserProperties();
  props.setProperty(USER_PROPERTY_SLACK_USER_TOKEN, token);
  if (slackUserId) props.setProperty(USER_PROPERTY_SLACK_USER_ID, slackUserId);
  if (teamId) props.setProperty(USER_PROPERTY_SLACK_TEAM_ID, teamId);

  // stateは使い終わったら消す
  props.deleteProperty(USER_PROPERTY_SLACK_OAUTH_STATE);
  props.deleteProperty(USER_PROPERTY_SLACK_OAUTH_STATE_TS);
}

function getSlackUserToken_() {
  const props = PropertiesService.getUserProperties();
  return props.getProperty(USER_PROPERTY_SLACK_USER_TOKEN);
}

function getSlackChannelId_() {
  const properties = PropertiesService.getScriptProperties();
  const channelId = properties.getProperty(PROPERTY_SLACK_CHANNEL_ID);
  return channelId || null;
}

function getSlackClientConfig_() {
  const properties = PropertiesService.getScriptProperties();
  return {
    clientId: properties.getProperty(PROPERTY_SLACK_CLIENT_ID) || '',
    clientSecret: properties.getProperty(PROPERTY_SLACK_CLIENT_SECRET) || ''
  };
}

function generateAndStoreSlackOAuthState_() {
  const props = PropertiesService.getUserProperties();
  const state = Utilities.getUuid();
  props.setProperty(USER_PROPERTY_SLACK_OAUTH_STATE, state);
  props.setProperty(USER_PROPERTY_SLACK_OAUTH_STATE_TS, String(Date.now()));
  return state;
}

function verifySlackOAuthState_(state) {
  const props = PropertiesService.getUserProperties();
  const expected = props.getProperty(USER_PROPERTY_SLACK_OAUTH_STATE) || '';
  const tsStr = props.getProperty(USER_PROPERTY_SLACK_OAUTH_STATE_TS) || '0';
  const ts = Number(tsStr);

  // 10分以内のみ有効
  const isFresh = ts > 0 && (Date.now() - ts) <= 10 * 60 * 1000;
  return !!state && state === expected && isFresh;
}

function slackApiPost_(url, bearerToken, payloadObj) {
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json; charset=utf-8',
    headers: {
      Authorization: 'Bearer ' + bearerToken
    },
    payload: JSON.stringify(payloadObj),
    muteHttpExceptions: true
  });
  return safeJsonParse_(res.getContentText());
}

function safeJsonParse_(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function toQueryString_(params) {
  const keys = Object.keys(params);
  const parts = [];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const v = params[k];
    if (v === undefined || v === null || v === '') continue;
    parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
  }
  return parts.join('&');
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
// ユーティリティ関数
// ============================================

/**
 * WebアプリのURL（/exec）を取得
 * @returns {string} WebアプリURL
 */
function getServiceUrl_() {
  return ScriptApp.getService().getUrl();
}

/**
 * 今日の日付をYYYY/MM/DD形式で取得
 * @returns {string} 日付文字列
 */
function getTodayDateString() {
  const today = new Date();
  return Utilities.formatDate(today, TIMEZONE, DATE_FORMAT);
}

// ============================================
// V2追加関数
// ============================================

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

/**
 * 今日の日付をV2フォーマットで返す
 * @returns {string} YYYY年MM月DD日形式の日付
 */
function getTodayDateFormattedV2() {
  const today = new Date();
  return Utilities.formatDate(today, TIMEZONE, DATE_FORMAT_V2);
}

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

// ============================================
// V3追加関数
// ============================================

/**
 * ツール設定を取得
 * @returns {Object} {slack: boolean, gmail: boolean, notion: boolean}
 */
function getToolSettings() {
  try {
    const dataStr = PropertiesService.getUserProperties()
      .getProperty(USER_PROPERTY_TOOL_SETTINGS);
    
    if (!dataStr) {
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
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    const props = PropertiesService.getUserProperties();
    const slackUserId = props.getProperty(USER_PROPERTY_SLACK_USER_ID);
    
    if (!slackUserId) {
      return { success: false, items: [], error: 'SlackユーザーID不明' };
    }
    
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
    
    const items = [];
    const messages = json.messages && json.messages.matches ? json.messages.matches : [];
    
    for (var i = 0; i < messages.length && items.length < MAX_ITEMS_PER_TOOL; i++) {
      var msg = messages[i];
      var ts = parseFloat(msg.ts) * 1000;
      var msgDate = new Date(ts);
      
      if (msgDate >= todayStart && msgDate <= todayEnd) {
        var channelName = msg.channel && msg.channel.name ? msg.channel.name : 'DM';
        var text = msg.text || '';
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

/**
 * Notion履歴を取得
 * @returns {Object} {success: boolean, items: Array, error: string}
 */
function getNotionHistory() {
  Logger.log('Notion履歴取得開始');
  
  try {
    var props = PropertiesService.getUserProperties();
    var notionToken = props.getProperty(USER_PROPERTY_NOTION_TOKEN);
    
    if (!notionToken) {
      return { success: false, items: [], error: 'Notion未連携' };
    }
    
    var today = new Date();
    var todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    var todayIso = todayStart.toISOString();
    
    var payload = {
      filter: {
        timestamp: 'last_edited_time',
        last_edited_time: {
          on_or_after: todayIso
        }
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      },
      page_size: MAX_ITEMS_PER_TOOL
    };
    
    var res = UrlFetchApp.fetch('https://api.notion.com/v1/search', {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + notionToken,
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
      
      if (err.indexOf('unauthorized') >= 0 || err.indexOf('invalid_token') >= 0) {
        return { success: false, items: [], error: 'Notionトークンが無効です' };
      }
      return { success: false, items: [], error: err };
    }
    
    var items = [];
    var results = json.results || [];
    
    for (var i = 0; i < results.length && items.length < MAX_ITEMS_PER_TOOL; i++) {
      var page = results[i];
      var lastEdited = page.last_edited_time ? new Date(page.last_edited_time) : null;
      
      if (!lastEdited || lastEdited < todayStart) {
        continue;
      }
      
      var title = '(無題)';
      if (page.properties) {
        if (page.properties.title && page.properties.title.title && page.properties.title.title[0]) {
          title = page.properties.title.title[0].plain_text || '(無題)';
        } else if (page.properties.Name && page.properties.Name.title && page.properties.Name.title[0]) {
          title = page.properties.Name.title[0].plain_text || '(無題)';
        }
      }
      
      if (title.length > 30) {
        title = title.substring(0, 30) + '...';
      }
      
      var pageType = page.object === 'database' ? 'DB' : 'ページ';
      
      items.push({
        type: 'notion',
        time: Utilities.formatDate(lastEdited, TIMEZONE, TIME_FORMAT),
        content: pageType + ': 「' + title + '」'
      });
    }
    
    items.sort(function(a, b) {
      return a.time.localeCompare(b.time);
    });
    
    Logger.log('Notion履歴取得完了: ' + items.length + '件');
    return { success: true, items: items, error: '' };
    
  } catch (e) {
    Logger.log('getNotionHistory error: ' + e.message);
    return { success: false, items: [], error: e.message };
  }
}

/**
 * Notionトークンを保存
 * @param {string} token - Notion Integration Token
 * @returns {boolean} 保存成功/失敗
 */
function saveNotionToken(token) {
  try {
    if (!token || token.trim() === '') {
      PropertiesService.getUserProperties().deleteProperty(USER_PROPERTY_NOTION_TOKEN);
      return true;
    }
    PropertiesService.getUserProperties().setProperty(USER_PROPERTY_NOTION_TOKEN, token.trim());
    return true;
  } catch (e) {
    Logger.log('saveNotionToken error: ' + e.message);
    return false;
  }
}

/**
 * Notion連携状態を取得
 * @returns {boolean} 連携済みかどうか
 */
function isNotionLinked() {
  try {
    var token = PropertiesService.getUserProperties().getProperty(USER_PROPERTY_NOTION_TOKEN);
    return !!token;
  } catch (e) {
    return false;
  }
}

/**
 * カレンダー予定とGmail/Slack/Notion履歴を一括取得（V3）
 * @param {string} dateString - 日付文字列
 * @returns {Object} {calendar: string, gmail: Object, slack: Object, notion: Object, errors: Array}
 */
function getAllHistoryV3(dateString) {
  Logger.log('全履歴取得開始（V3）');
  
  var result = {
    calendar: '',
    gmail: { items: [], error: '' },
    slack: { items: [], error: '' },
    notion: { items: [], error: '' },
    errors: []
  };
  
  // ツール設定を取得
  var settings = getToolSettings();
  
  // カレンダー予定取得（既存）
  result.calendar = getEventsForDate(dateString);
  
  // Gmail履歴
  if (settings.gmail) {
    var gmailResult = getGmailHistory();
    result.gmail = { items: gmailResult.items, error: gmailResult.error };
    if (!gmailResult.success && gmailResult.error) {
      result.errors.push('[Gmail] ' + gmailResult.error);
    }
  }
  
  // Slack履歴
  if (settings.slack) {
    var slackResult = getSlackHistory();
    result.slack = { items: slackResult.items, error: slackResult.error };
    if (!slackResult.success && slackResult.error) {
      result.errors.push('[Slack] ' + slackResult.error);
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
  
  Logger.log('全履歴取得完了（V3）');
  return result;
}
