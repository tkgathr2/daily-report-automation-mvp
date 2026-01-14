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
const PROPERTY_WEBHOOK_URL = 'SLACK_WEBHOOK_URL';
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

// ============================================
// WEBアプリエントリーポイント
// ============================================

/**
 * WEBアプリのエントリーポイント
 * HTMLファイルを返却する
 * @returns {HtmlOutput} HTMLページ
 */
function doGet(e) {
  // #region agent log
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    Logger.log(
      '[oauth] doGet enter hasParam=' + (!!(e && e.parameter)) +
      ' hasError=' + (!!p.error) +
      ' hasCode=' + (!!p.code) +
      ' hasState=' + (!!p.state) +
      ' codeLen=' + (p.code ? String(p.code).length : 0) +
      ' stateTail=' + (p.state ? String(p.state).slice(-4) : '')
    );
  } catch (logErr) {
    Logger.log('[oauth] doGet logErr=' + String(logErr && logErr.message ? logErr.message : logErr).slice(0, 80));
  }
  // #endregion agent log

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
 * @param {Object} opts - オプション（telemetry用）
 * @returns {string} フォーマット済み予定テキスト、またはエラーメッセージ
 */
function getTodayEvents(opts) {
  // [telemetry] クライアント計測（秘密情報なし）
  try {
    opts = opts || {};
    var tel = {
      tag: String(opts.tag || 'unknown').slice(0, 50),
      hrefBase: String(opts.hrefBase || '').slice(0, 120)
    };
    Logger.log('[telemetry] ' + JSON.stringify(tel));
  } catch (telErr) {
    Logger.log('[telemetry] error: ' + String(telErr.message || telErr).slice(0, 80));
  }

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
    // #region agent log
    Logger.log(
      '[oauth] callback enter hasCode=' + (!!(e && e.parameter && e.parameter.code)) +
      ' hasState=' + (!!(e && e.parameter && e.parameter.state)) +
      ' codeLen=' + (e && e.parameter && e.parameter.code ? String(e.parameter.code).length : 0) +
      ' stateTail=' + (e && e.parameter && e.parameter.state ? String(e.parameter.state).slice(-4) : '')
    );
    // #endregion agent log

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

    // #region agent log
    Logger.log('[oauth] state verify ok');
    // #endregion agent log

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

    // #region agent log
    Logger.log(
      '[oauth] oauth.v2.access http=' + tokenRes.getResponseCode() +
      ' bodyLen=' + (body ? String(body).length : 0)
    );
    // #endregion agent log

    const json = safeJsonParse_(body);
    if (!json || !json.ok) {
      const err = json && json.error ? String(json.error) : 'unknown_error';

      // #region agent log
      Logger.log('[oauth] oauth.v2.access not ok err=' + err);
      // #endregion agent log

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

    // #region agent log
    Logger.log('[oauth] token ok slackUserId=' + (slackUserId ? slackUserId : ''));
    // #endregion agent log

    saveSlackUserToken_(userToken, slackUserId, teamId);

    // #region agent log
    Logger.log('[oauth] saved user token (no-secret)');
    // #endregion agent log

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

/**
 * Googleアカウントの表示名を取得
 * @returns {string} 表示名、取得できない場合は「簡単日報くん」
 */
function getUserDisplayName() {
  try {
    const user = Session.getEffectiveUser();
    const email = user.getEmail();
    if (email) {
      return email.split('@')[0];
    }
  } catch (e) {
    Logger.log('ユーザー名取得エラー: ' + e.message);
  }
  return '簡単日報くん';
}

// ============================================
// クライアント計測（デバッグ用）
// ============================================

/**
 * クライアント側の計測データを受け取りログ出力
 * @param {Object} payload - 計測データ（秘密情報を含まないこと）
 */
function debugClientTelemetry(payload) {
  try {
    const safe = {
      tag: String(payload.tag || '').slice(0, 50),
      hrefBase: String(payload.hrefBase || '').slice(0, 100),
      hasBtnGet: !!payload.hasBtnGet,
      hasBtnSlackConnect: !!payload.hasBtnSlackConnect,
      hasGoogleScript: !!payload.hasGoogleScript,
      errorMessage: String(payload.errorMessage || '').slice(0, 200),
      errorFile: String(payload.errorFile || '').slice(0, 100),
      errorLine: payload.errorLine || 0
    };
    Logger.log('[telemetry] ' + JSON.stringify(safe));
  } catch (e) {
    Logger.log('[telemetry] error: ' + String(e.message).slice(0, 100));
  }
}
