/**
 * 簡単日報君（WEBアプリ版）
 *
 * Googleカレンダーから今日の予定を取得し、
 * WEBブラウザ上で表示・編集・コピー → Slack送信できるWEBアプリ
 *
 * @version 4.0
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
const USER_PROPERTY_BACKLOG_API_KEY = 'USER_BACKLOG_API_KEY';

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
const MAX_ITEMS_PER_TOOL = 50;

// AI要約定数（Claude優先、Geminiフォールバック）
const PROPERTY_ANTHROPIC_API_KEY = 'ANTHROPIC_API_KEY';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const PROPERTY_GEMINI_API_KEY = 'GEMINI_API_KEY';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';

// アプリURL（フッター用）
const APP_URL = 'https://nippou.up.railway.app';

// エラー観測基盤
const KNOWHOW_MEMORIZE_URL = 'https://knowhow.up.railway.app/api/devin/memorize';
const ERROR_PROJECT_KEY = 'daily-report-automation-mvp';
const ERROR_TOOL_NAME = 'daily-report';
const PROPERTY_ERROR_NOTIFY_ENABLED = 'ERROR_NOTIFY_ENABLED';

// ============================================
// エラー観測基盤（Error Observability）
// ============================================

/**
 * ランダムID生成（依存追加なし）
 * @returns {string} 16桁のランダムHex文字列
 */
function generateErrorId_() {
  var chars = '0123456789abcdef';
  var id = '';
  for (var i = 0; i < 16; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * ERROR_NOTIFY_ENABLED フラグを読む
 * @returns {boolean} true = Slack通知有効
 */
function isNotifyEnabled_() {
  try {
    var val = PropertiesService.getScriptProperties().getProperty(PROPERTY_ERROR_NOTIFY_ENABLED);
    return val === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * スタックトレースを先頭10行に短縮
 * @param {string} stack
 * @returns {string}
 */
function truncateStack_(stack) {
  if (!stack) return '';
  var lines = String(stack).split('\n');
  return lines.slice(0, 10).join('\n');
}

/**
 * 秘匿情報をマスクする
 * @param {string} text
 * @returns {string}
 */
function maskSecrets_(text) {
  if (!text) return '';
  var s = String(text);
  // Slackトークン
  s = s.replace(/xox[pboa]-[0-9A-Za-z\-]+/g, 'xox*-****');
  // OAuthコード
  s = s.replace(/code=[^&\s]+/g, 'code=****');
  // メールアドレス
  s = s.replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '****@****.***');
  // client_secret
  s = s.replace(/client_secret=[^&\s]+/g, 'client_secret=****');
  // Bearer トークン
  s = s.replace(/Bearer\s+[^\s]+/g, 'Bearer ****');
  return s;
}

/**
 * ErrorEvent オブジェクトを生成する
 * @param {Error|Object} e - エラーオブジェクト
 * @param {Object} context - 追加コンテキスト {component, action, url}
 * @returns {Object} ErrorEvent
 */
function buildErrorEvent_(e, context) {
  var ctx = context || {};
  var email = '';
  try {
    email = Session.getActiveUser().getEmail() || '';
    // メールアドレスはドメインのみ保持
    if (email) {
      var parts = email.split('@');
      email = '***@' + (parts[1] || '***');
    }
  } catch (ignore) {}

  var requestId = generateErrorId_();
  var errorId = generateErrorId_();
  var message = '';
  var stack = '';
  if (e && e.message) {
    message = maskSecrets_(e.message);
    stack = truncateStack_(maskSecrets_(e.stack || ''));
  } else {
    message = maskSecrets_(String(e || 'unknown error'));
  }

  return {
    timestamp: new Date().toISOString(),
    env: 'production',
    app: ERROR_PROJECT_KEY,
    component: ctx.component || 'gas-server',
    requestId: requestId,
    errorId: errorId,
    userEmail: email,
    action: ctx.action || 'unknown',
    url: maskSecrets_(ctx.url || ''),
    message: message,
    stack: stack,
    context: ctx.extra || {}
  };
}

/**
 * ノウハウキングにエラーを記録する
 * @param {Object} errorEvent - buildErrorEvent_ の返り値
 */
function sendKnowhowMemorize_(errorEvent) {
  try {
    var payload = {
      project_key: ERROR_PROJECT_KEY,
      raw_log: JSON.stringify(errorEvent),
      tool: ERROR_TOOL_NAME,
      status: 'error',
      environment: errorEvent.env || 'production',
      tags: ['error', 'daily-report', errorEvent.component || 'unknown']
    };
    UrlFetchApp.fetch(KNOWHOW_MEMORIZE_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    Logger.log('エラー記録完了: errorId=' + errorEvent.errorId);
  } catch (memErr) {
    Logger.log('ノウハウキング記録失敗: ' + memErr.message);
  }
}

/**
 * Slackにエラー通知を送る（ERROR_NOTIFY_ENABLED=true の場合のみ）
 * @param {Object} errorEvent - buildErrorEvent_ の返り値
 */
function sendSlackError_(errorEvent) {
  if (!isNotifyEnabled_()) return;
  try {
    var channelId = getSlackChannelId_();
    if (!channelId) return;
    var userToken = getSlackUserToken_();
    if (!userToken) return;
    var text = ':rotating_light: *エラー通知*\n'
      + '`errorId`: ' + errorEvent.errorId + '\n'
      + '`component`: ' + errorEvent.component + '\n'
      + '`action`: ' + errorEvent.action + '\n'
      + '`message`: ' + errorEvent.message + '\n'
      + '`timestamp`: ' + errorEvent.timestamp;
    slackApiPost_('https://slack.com/api/chat.postMessage', userToken, {
      channel: channelId,
      text: text
    });
  } catch (slackErr) {
    Logger.log('Slackエラー通知失敗: ' + slackErr.message);
  }
}

/**
 * エラーを観測基盤に記録する（統合関数）
 * @param {Error|Object} e - エラーオブジェクト
 * @param {Object} context - {component, action, url, extra}
 */
function recordError_(e, context) {
  try {
    var errorEvent = buildErrorEvent_(e, context);
    sendKnowhowMemorize_(errorEvent);
    sendSlackError_(errorEvent);
  } catch (ignore) {
    Logger.log('recordError_ 自体が失敗: ' + (ignore && ignore.message ? ignore.message : ignore));
  }
}

/**
 * クライアントサイドからのエラーログを受け取る
 * @param {Object} clientErrorData - クライアントで生成したErrorEventデータ
 */
function logClientError(clientErrorData) {
  try {
    if (!clientErrorData) return;
    // クライアントデータをサーバー側でErrorEventに正規化
    var errorEvent = {
      timestamp: clientErrorData.timestamp || new Date().toISOString(),
      env: 'production',
      app: ERROR_PROJECT_KEY,
      component: 'gas-client',
      requestId: clientErrorData.requestId || generateErrorId_(),
      errorId: clientErrorData.errorId || generateErrorId_(),
      userEmail: '',
      action: maskSecrets_(clientErrorData.action || 'client-error'),
      url: maskSecrets_(clientErrorData.url || ''),
      message: maskSecrets_(clientErrorData.message || 'unknown client error'),
      stack: truncateStack_(maskSecrets_(clientErrorData.stack || '')),
      context: clientErrorData.context || {}
    };
    // メールアドレスはサーバー側で安全に取得
    try {
      var email = Session.getActiveUser().getEmail() || '';
      if (email) {
        var parts = email.split('@');
        errorEvent.userEmail = '***@' + (parts[1] || '***');
      }
    } catch (ignore) {}

    sendKnowhowMemorize_(errorEvent);
    sendSlackError_(errorEvent);
  } catch (e) {
    Logger.log('logClientError失敗: ' + (e && e.message ? e.message : e));
  }
}


// ============================================
// ユーティリティ
// ============================================

/**
 * HTMLエスケープ（XSS対策 / BUG-003修正）
 * @param {string} str - エスケープ対象の文字列
 * @returns {string} HTMLエスケープ済みの文字列
 */
function escapeHtml_(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================
// アクセス制御
// ============================================

// 許可されたドメイン（このドメインのユーザーは全員アクセス可能）
const ALLOWED_DOMAINS = [
  'takagi.bz',
  'stepupnext.com',
  'kotsuyudo.com'
];

// 管理者ドメイン（管理画面にアクセス可能）
const ADMIN_DOMAINS = [
  'takagi.bz'
];

/**
 * ユーザーのドメインを取得（共通ヘルパー）
 * @returns {string} ドメイン（取得できない場合は空文字）
 */
function getUserDomain_() {
  try {
    const email = Session.getActiveUser().getEmail();
    if (!email) return '';
    const domain = email.split('@')[1];
    return domain ? domain.toLowerCase() : '';
  } catch (e) {
    Logger.log('ドメイン取得エラー: ' + e.message);
    return '';
  }
}

/**
 * ユーザーのアクセス権限をチェック
 * @returns {boolean} アクセス許可されている場合はtrue
 */
function checkUserAccess() {
  const domain = getUserDomain_();
  return domain && ALLOWED_DOMAINS.includes(domain);
}

/**
 * 管理者権限をチェック
 * @returns {boolean} 管理者の場合はtrue
 */
function checkAdminAccess() {
  const domain = getUserDomain_();
  return domain && ADMIN_DOMAINS.includes(domain);
}

/**
 * 現在のユーザー情報を取得
 * @returns {Object} ユーザー情報
 */
function getCurrentUserInfo() {
  const email = Session.getActiveUser().getEmail() || '';
  const domain = getUserDomain_();
  return {
    email: email,
    domain: domain,
    isAdmin: ADMIN_DOMAINS.includes(domain),
    isAllowed: ALLOWED_DOMAINS.includes(domain)
  };
}

/**
 * アクセス拒否ページを生成（いりでくん風デザイン）
 * @returns {HtmlOutput} アクセス拒否ページ
 */
function createAccessDeniedPage() {
  const email = Session.getActiveUser().getEmail() || '不明';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>アクセス権限がありません - 簡単日報君</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(180deg, #00bfff 0%, #87ceeb 50%, #e0f7ff 100%);
        }
        .container {
          background: white;
          padding: 40px 30px;
          border-radius: 20px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          text-align: center;
          max-width: 400px;
          width: 90%;
        }
        .logo {
          margin-bottom: 20px;
        }
        .logo svg {
          width: 60px;
          height: 60px;
        }
        h1 {
          color: #00a0e9;
          margin: 0 0 8px 0;
          font-size: 22px;
          font-weight: bold;
        }
        h2 {
          color: #e74c3c;
          margin: 20px 0 15px 0;
          font-size: 18px;
        }
        p {
          color: #666;
          line-height: 1.6;
          margin: 10px 0;
          font-size: 14px;
        }
        .email {
          background: #f5f5f5;
          padding: 12px;
          border-radius: 10px;
          font-family: monospace;
          margin: 20px 0;
          font-size: 14px;
          color: #333;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#333" stroke-width="3"/>
            <text x="50" y="58" text-anchor="middle" font-size="32" font-weight="bold" fill="#333">髙</text>
            <line x1="50" y1="5" x2="50" y2="15" stroke="#333" stroke-width="3"/>
            <line x1="50" y1="85" x2="50" y2="95" stroke="#333" stroke-width="3"/>
          </svg>
        </div>
        <h1>簡単日報君</h1>
        <h2>アクセス権限がありません</h2>
        <p>このアプリケーションにアクセスする権限がありません。</p>
        <div class="email">${escapeHtml_(email)}</div>
        <p>アクセスが必要な場合は、管理者にお問い合わせください。</p>
      </div>
    </body>
    </html>
  `;
  return HtmlService.createHtmlOutput(html)
    .setTitle('アクセス権限がありません - 簡単日報君')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 管理画面を生成
 * @returns {HtmlOutput} 管理画面ページ
 */
function createAdminPage() {
  const userInfo = getCurrentUserInfo();
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>管理画面 - 簡単日報君</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        h1 {
          color: #333;
          margin: 0;
        }
        .back-link {
          color: #667eea;
          text-decoration: none;
        }
        .card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .card h2 {
          margin-top: 0;
          color: #333;
          font-size: 18px;
          border-bottom: 2px solid #667eea;
          padding-bottom: 10px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #eee;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          color: #666;
          font-weight: 500;
        }
        .info-value {
          color: #333;
        }
        .domain-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .domain-list li {
          padding: 10px 15px;
          background: #f8f9fa;
          border-radius: 8px;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .domain-list li.admin {
          background: #e8f4fd;
          border-left: 3px solid #667eea;
        }
        .badge {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          background: #667eea;
          color: white;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }
        .stat-box {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 12px;
          text-align: center;
        }
        .stat-number {
          font-size: 32px;
          font-weight: bold;
        }
        .stat-label {
          font-size: 14px;
          opacity: 0.9;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>管理画面</h1>
          <a href="${getServiceUrl_()}" class="back-link">← アプリに戻る</a>
        </div>
        
        <div class="card">
          <h2>現在のユーザー</h2>
          <div class="info-row">
            <span class="info-label">メールアドレス</span>
            <span class="info-value">${escapeHtml_(userInfo.email)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">ドメイン</span>
            <span class="info-value">${escapeHtml_(userInfo.domain)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">権限</span>
            <span class="info-value">${userInfo.isAdmin ? '管理者' : '一般ユーザー'}</span>
          </div>
        </div>
        
        <div class="card">
          <h2>許可されたドメイン</h2>
          <ul class="domain-list">
            ${ALLOWED_DOMAINS.map(domain => {
              const isAdmin = ADMIN_DOMAINS.includes(domain);
              return '<li class="' + (isAdmin ? 'admin' : '') + '">' +
                '<span>@' + domain + '</span>' +
                (isAdmin ? '<span class="badge">管理者</span>' : '') +
                '</li>';
            }).join('')}
          </ul>
        </div>
        
        <div class="card">
          <h2>システム情報</h2>
          <div class="stats">
            <div class="stat-box">
              <div class="stat-number">${ALLOWED_DOMAINS.length}</div>
              <div class="stat-label">許可ドメイン数</div>
            </div>
            <div class="stat-box">
              <div class="stat-number">${ADMIN_DOMAINS.length}</div>
              <div class="stat-label">管理者ドメイン数</div>
            </div>
          </div>
        </div>
        
        <div class="card">
          <h2>管理画面URL</h2>
          <div class="info-row">
            <span class="info-label">管理画面</span>
            <span class="info-value" style="word-break: break-all;">${getServiceUrl_()}?page=admin</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  return HtmlService.createHtmlOutput(html)
    .setTitle('管理画面 - 簡単日報君')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================
// WEBアプリエントリーポイント
// ============================================

/**
 * WEBアプリのエントリーポイント
 * HTMLファイルを返却する
 * @returns {HtmlOutput} HTMLページ
 */
function doGet(e) {
  try {
    // Slack OAuthコールバック
    if (e && e.parameter) {
      if (e.parameter.error) {
        return createOAuthErrorPage_(
          'Slack連携に失敗しました',
          'Slackからエラーが返されました：' + escapeHtml_(String(e.parameter.error || '')) + '。「Slack連携（認可）」をやり直してください。'
        );
      }
      if (e.parameter.code) {
        return handleSlackOAuthCallback_(e);
      }
      
      // 管理画面へのアクセス
      if (e.parameter.page === 'admin') {
        if (!checkAdminAccess()) {
          return createAccessDeniedPage();
        }
        return createAdminPage();
      }
    }

    // 直接アクセス防止: Railway経由（?from=nippou）でない場合はリダイレクト
    if (!e || !e.parameter || e.parameter.from !== 'nippou') {
      return HtmlService.createHtmlOutput(
        '<html><head><script>window.top.location.href="' + APP_URL + '";</script></head>' +
        '<body style="font-family:sans-serif;text-align:center;padding:40px;">' +
        '<p>リダイレクト中...</p>' +
        '<p><a href="' + APP_URL + '" target="_top">自動でリダイレクトされない場合はこちら</a></p>' +
        '</body></html>'
      ).setTitle('リダイレクト中');
    }

    // アクセス権限チェック
    if (!checkUserAccess()) {
      return createAccessDeniedPage();
    }

    // 通常表示
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('簡単日報君')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    Logger.log('doGet予期しないエラー: ' + (err && err.message ? err.message : err));
    recordError_(err, { component: 'gas-server', action: 'doGet', url: 'GAS /exec' });
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;text-align:center;padding:40px;">'
      + '<h2 style="color:#e74c3c;">予期しないエラーが発生しました</h2>'
      + '<p style="color:#666;">ページを再読み込みするか、<a href="' + APP_URL + '" style="color:#00a0e9;">ログイン画面</a>に戻ってください。</p>'
      + '</div>'
    ).setTitle('エラー - 簡単日報君');
  }
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
 * ユーザー自身が所有するカレンダーから指定日の予定を取得し、フォーマット済みテキストを返却
 * 共有カレンダーの予定は除外される
 * @param {string} dateString - 日付文字列（YYYY-MM-DD形式）、nullの場合は今日
 * @returns {string} フォーマット済み予定テキスト、またはエラーメッセージ
 */
function getEventsForDate(dateString) {
  Logger.log('カレンダー予定取得開始');

  try {
    // 現在のユーザーのメールアドレスを取得
    const userEmail = Session.getActiveUser().getEmail();
    Logger.log('ユーザーメール：' + userEmail);

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

    // ユーザーが所有するカレンダーを取得（共有カレンダーは除外）
    let calendar;
    try {
      // ユーザーのメールアドレスでカレンダーを取得（自分のカレンダーのみ）
      calendar = CalendarApp.getCalendarById(userEmail);
      if (!calendar) {
        // フォールバック：デフォルトカレンダーを使用
        calendar = CalendarApp.getDefaultCalendar();
      }
    } catch (e) {
      Logger.log('カレンダーアクセスエラー：' + e.message);
      return 'エラー：カレンダーへのアクセス権限がありません。権限を確認してください。';
    }

    if (!calendar) {
      Logger.log('カレンダー取得失敗：カレンダーが見つかりません');
      return 'エラー：カレンダーへのアクセス権限がありません。権限を確認してください。';
    }

    Logger.log('カレンダー取得成功：' + calendar.getName());

    // 予定を取得
    let events;
    try {
      events = calendar.getEvents(startTime, endTime);
    } catch (e) {
      Logger.log('カレンダー予定取得エラー：' + e.message);
      return 'エラー：カレンダーから予定を取得できませんでした。しばらく時間をおいてから再度お試しください。';
    }

    Logger.log('カレンダー予定取得完了：' + events.length + '件');

    // イベント情報を配列に変換（ユーザー自身の予定のみ）
    const eventList = [];
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      // 予定の作成者を確認
      const creators = event.getCreators();
      const isCreator = creators.some(function(creator) {
        return creator.toLowerCase() === userEmail.toLowerCase();
      });
      
      // 自分が参加者として招待された予定も含める
      const guestList = event.getGuestList();
      const isInvited = guestList.some(function(guest) {
        return guest.getEmail().toLowerCase() === userEmail.toLowerCase();
      });
      
      // 作成者情報がない場合（自分のカレンダーで自分が作成した予定は creators が空の場合がある）
      // この場合、ゲストリストも空であれば自分の予定として扱う
      const isOwnPrivateEvent = creators.length === 0 && guestList.length === 0;
      
      // 自分が作成した予定、自分が招待された予定、または自分のプライベート予定のみを追加
      if (isCreator || isInvited || isOwnPrivateEvent) {
        eventList.push({
          title: event.getTitle(),
          isAllDay: event.isAllDayEvent(),
          startTime: event.getStartTime(),
          endTime: event.getEndTime()
        });
      }
    }

    Logger.log('フィルタリング後の予定数：' + eventList.length + '件');

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
    recordError_(error, { component: 'gas-server', action: 'getTodayEvents' });
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
 * Gmail再認証URLを返す（GASのOAuthスコープ再認可）
 * @returns {string|null} 再認証が必要な場合はURL、不要ならnull
 */
function getGmailReauthorizeUrl() {
  try {
    // GmailAppにアクセスしてみて権限を確認
    GmailApp.search('in:sent', 0, 1);
    return null; // 権限あり
  } catch (e) {
    Logger.log('Gmail権限エラー: ' + e.message);
    var authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
    var authUrl = authInfo.getAuthorizationUrl();
    return authUrl || null;
  }
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

  // 固定のOAuthプロキシURLを使用（Slack Appに登録されているURL）
  const redirectUri = getSlackRedirectUri_();
  const state = generateAndStoreSlackOAuthState_();

  const params = {
    client_id: cfg.clientId,
    redirect_uri: redirectUri,
    user_scope: 'chat:write,search:read',
    state: state
  };

  return 'https://slack.com/oauth/v2/authorize?' + toQueryString_(params);
}

// ============================================
// Slack OAuth（実ユーザー投稿）内部実装
// ============================================

/**
 * OAuthコールバック用のエラーページを生成
 * @param {string} message - エラーメッセージ
 * @param {string} [guidance] - ユーザーへのガイド
 * @returns {HtmlOutput}
 */
function createOAuthErrorPage_(message, guidance) {
  var guidanceHtml = guidance ? '<p style="color:#666;font-size:14px;margin:15px 0;">' + guidance + '</p>' : '';
  return HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;text-align:center;padding:40px;">'
    + '<h2 style="color:#e74c3c;">' + escapeHtml_(message) + '</h2>'
    + guidanceHtml
    + '<br><a href="' + APP_URL + '" style="color:#00a0e9;font-weight:bold;text-decoration:none;">アプリに戻る</a>'
    + '</div>'
  ).setTitle('Slack連携（失敗）');
}

function handleSlackOAuthCallback_(e) {
  try {
    const cfg = getSlackClientConfig_();
    if (!cfg.clientId || !cfg.clientSecret) {
      Logger.log('OAuth失敗: Client ID/Secret未設定');
      return createOAuthErrorPage_(
        'Slack連携に失敗しました',
        '管理者設定（Client ID/Secret）が不足しています。管理者にお問い合わせください。'
      );
    }

    const code = String(e.parameter.code || '');
    const state = String(e.parameter.state || '');

    if (!code) {
      Logger.log('OAuth失敗: codeパラメータが空');
      return createOAuthErrorPage_(
        'Slack連携に失敗しました',
        '認可コードが取得できませんでした。「Slack連携（認可）」からやり直してください。'
      );
    }

    if (!verifySlackOAuthState_(state)) {
      Logger.log('OAuth失敗: state検証失敗 (state=' + state + ')');
      return createOAuthErrorPage_(
        'Slack連携に失敗しました（セッション期限切れ）',
        '認証セッションが期限切れ（10分以内）か、ページを再読み込みしました。アプリに戻って「Slack連携（認可）」をもう一度クリックしてください。'
      );
    }

    // 固定のOAuthプロキシURLを使用（認可時と同じURLを使用する必要がある）
    const redirectUri = getSlackRedirectUri_();

    var tokenRes;
    try {
      tokenRes = UrlFetchApp.fetch('https://slack.com/api/oauth.v2.access', {
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
    } catch (fetchErr) {
      Logger.log('OAuthトークン交換ネットワークエラー: ' + fetchErr.message);
      return createOAuthErrorPage_(
        'Slackへの接続に失敗しました',
        'ネットワークエラーが発生しました。しばらく時間をおいてから再度お試しください。'
      );
    }

    var httpStatus = tokenRes.getResponseCode();
    if (httpStatus >= 500) {
      Logger.log('OAuthトークン交換: Slackサーバーエラー HTTP ' + httpStatus);
      return createOAuthErrorPage_(
        'Slackサーバーが一時的に利用できません',
        'Slack側の障害の可能性があります。しばらく時間をおいてから再度お試しください。'
      );
    }

    const body = tokenRes.getContentText();
    const json = safeJsonParse_(body);
    if (!json || !json.ok) {
      const err = json && json.error ? String(json.error) : 'unknown_error';
      Logger.log('OAuthトークン交換失敗: ' + err);

      // エラー別の分かりやすいメッセージ
      var oauthErrorMessages = {
        'code_already_used': 'この認可コードは既に使用済みです。ページを再読み込みした可能性があります。アプリに戻って「Slack連携（認可）」をもう一度クリックしてください。',
        'invalid_code': '認可コードが無効です。「Slack連携（認可）」をやり直してください。',
        'invalid_client_id': '管理者設定（Client ID）が不正です。管理者にお問い合わせください。',
        'bad_client_secret': '管理者設定（Client Secret）が不正です。管理者にお問い合わせください。',
        'bad_redirect_uri': 'リダイレクトURIが不正です。管理者にお問い合わせください。',
        'oauth_authorization_url_mismatch': '認可URLが一致しません。管理者にお問い合わせください。'
      };
      var guidance = oauthErrorMessages[err] || 'Slack連携に失敗しました（' + escapeHtml_(err) + '）。「Slack連携（認可）」をやり直してください。';
      return createOAuthErrorPage_('Slack連携に失敗しました', guidance);
    }

    // OAuth v2のユーザートークン
    const userToken = json.authed_user && json.authed_user.access_token ? String(json.authed_user.access_token) : '';
    const botToken = json.access_token ? String(json.access_token) : '';
    const slackUserId = json.authed_user && json.authed_user.id ? String(json.authed_user.id) : '';
    const teamId = json.team && json.team.id ? String(json.team.id) : '';

    Logger.log('OAuth応答: userToken prefix=' + (userToken ? userToken.substring(0, 5) : 'なし') +
               ', botToken prefix=' + (botToken ? botToken.substring(0, 5) : 'なし'));

    if (!userToken) {
      return createOAuthErrorPage_(
        'Slack連携に失敗しました',
        'ユーザートークンが取得できませんでした。「Slack連携（認可）」をやり直してください。'
      );
    }

    saveSlackUserToken_(userToken, slackUserId, teamId);

    var tokenPrefix = userToken.substring(0, 5);
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;text-align:center;padding:40px;">'
      + '<h2 style="color:#27ae60;">Slack連携が完了しました</h2>'
      + '<p style="color:#666;">トークン種別: ' + escapeHtml_(tokenPrefix) + '</p>'
      + '<br><a href="' + APP_URL + '" style="color:#00a0e9;font-weight:bold;text-decoration:none;">アプリに戻る</a>'
      + '</div>'
    ).setTitle('Slack連携（完了）');
  } catch (err) {
    Logger.log('OAuthコールバック予期しないエラー: ' + (err && err.message ? err.message : err));
    recordError_(err, { component: 'gas-server', action: 'handleSlackOAuthCallback' });
    return createOAuthErrorPage_(
      'Slack連携に失敗しました',
      '予期しないエラーが発生しました。しばらく時間をおいてから「Slack連携（認可）」をやり直してください。'
    );
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

// クライアント用: Script PropertiesからSlackチャンネルIDを取得
function getSlackChannelIdForClient() {
  return getSlackChannelId_();
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
  if (!bearerToken) {
    Logger.log('slackApiPost_: bearerTokenが空');
    return { ok: false, error: 'not_authed' };
  }

  var payloadStr;
  try {
    payloadStr = JSON.stringify(payloadObj);
  } catch (jsonErr) {
    Logger.log('slackApiPost_: payloadのJSON変換失敗: ' + jsonErr.message);
    return { ok: false, error: 'invalid_payload' };
  }

  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json; charset=utf-8',
    headers: {
      Authorization: 'Bearer ' + bearerToken
    },
    payload: payloadStr,
    muteHttpExceptions: true
  });

  var httpStatus = res.getResponseCode();
  if (httpStatus >= 500) {
    Logger.log('slackApiPost_: Slackサーバーエラー HTTP ' + httpStatus);
    return { ok: false, error: 'service_unavailable' };
  }
  if (httpStatus === 429) {
    Logger.log('slackApiPost_: レートリミット HTTP 429');
    return { ok: false, error: 'ratelimited' };
  }

  var body = res.getContentText();
  var parsed = safeJsonParse_(body);
  if (!parsed) {
    Logger.log('slackApiPost_: レスポンスJSONパース失敗 (HTTP ' + httpStatus + ')');
    return { ok: false, error: 'invalid_response' };
  }
  return parsed;
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

// ============================================
// ユーティリティ関数
// ============================================

// OAuth Proxy URL（Slack Appに登録する固定のredirect_uri）
// これにより、どのドメインのユーザーでも同じredirect_uriを使用できる
const OAUTH_PROXY_URL = 'https://nippou.up.railway.app/oauth/callback';

/**
 * Slack OAuth用のリダイレクトURIを取得
 * Railwayドメインを返す（Slack Appに登録されているURL）
 * @returns {string} OAuth redirect URI
 */
function getSlackRedirectUri_() {
  return OAUTH_PROXY_URL;
}

/**
 * WebアプリのURL（/exec）を取得
 * アプリ内のリンク用（「アプリに戻る」など）
 * @returns {string} WebアプリURL
 */
function getServiceUrl_() {
  return APP_URL;
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
 * ログインユーザーのGoogleプロフィール画像URLを取得
 * @returns {string|null} プロフィール画像URL（取得できない場合はnull）
 */
function getUserProfilePictureUrl() {
  try {
    // Google OAuth2 userinfo エンドポイントからプロフィール情報を取得
    const url = 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json';
    const response = UrlFetchApp.fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
      },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const userInfo = JSON.parse(response.getContentText());
      if (userInfo.picture) {
        Logger.log('プロフィール画像URL取得成功: ' + userInfo.picture);
        return userInfo.picture;
      }
    }
    Logger.log('プロフィール画像URL取得失敗: HTTP ' + response.getResponseCode());
    return null;
  } catch (e) {
    Logger.log('getUserProfilePictureUrl error: ' + e.message);
    return null;
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
    
    // SSOT 26.8: 「直近送信日まで遡って引き継ぐ」
    // 今日送信した場合は、同日中は引き継ぎ表示しない（翌日以降に表示される）
    // 同日複数回送信は「最後に送信した内容が勝つ」（saveNextTasksで毎回上書き）
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
 * Webhook URLをScript Propertiesから取得する
 * @returns {string|null} Webhook URL（未設定時はnull）
 */
function getSlackWebhookUrl_() {
  const properties = PropertiesService.getScriptProperties();
  const url = properties.getProperty('SLACK_WEBHOOK_URL');
  return url || null;
}

/**
 * V2用Slack送信（Incoming Webhook方式）
 * @param {Object} reportData - 日報データ
 * @param {string} reportData.header - ヘッダー（日付と氏名）
 * @param {string} reportData.todayTasks - 今日やったこと
 * @param {string} reportData.notices - わかった事・問題・共有事項
 * @param {string} reportData.salesPoints - 売上・利益・経費削減に関わるポイント
 * @param {string} reportData.nextTasks - 次すること
 * @param {string} [reportData.overtime] - 残業時間（例: "1時間30分"）
 * @returns {string} 成功/失敗メッセージ
 */
/**
 * Slack APIエラーをユーザー向けメッセージに変換
 * @param {string} errorCode - Slack APIエラーコード
 * @returns {{message: string, shouldClearToken: boolean, shouldRetry: boolean}}
 */
function getSlackErrorInfo_(errorCode) {
  var errorMap = {
    // トークン関連（再認可必要）
    'token_revoked':    { message: 'エラー：Slack連携が解除されています。「Slack連携（認可）」から再連携してください。', shouldClearToken: true, shouldRetry: false },
    'token_expired':    { message: 'エラー：Slack連携の有効期限が切れました。「Slack連携（認可）」から再連携してください。', shouldClearToken: true, shouldRetry: false },
    'invalid_auth':     { message: 'エラー：Slack認証が無効です。「Slack連携（認可）」から再連携してください。', shouldClearToken: true, shouldRetry: false },
    'not_authed':       { message: 'エラー：Slack認証がありません。「Slack連携（認可）」から連携してください。', shouldClearToken: true, shouldRetry: false },
    'account_inactive': { message: 'エラー：Slackアカウントが無効です。アカウント状態を確認してください。', shouldClearToken: true, shouldRetry: false },
    // チャンネル関連（管理者対応必要）
    'channel_not_found': { message: 'エラー：投稿先のSlackチャンネルが見つかりません。管理者にお問い合わせください。', shouldClearToken: false, shouldRetry: false },
    'is_archived':      { message: 'エラー：投稿先のSlackチャンネルがアーカイブされています。管理者にお問い合わせください。', shouldClearToken: false, shouldRetry: false },
    'not_in_channel':   { message: 'エラー：チャンネルに参加していません。Slackで対象チャンネルに参加してから再度お試しください。', shouldClearToken: false, shouldRetry: false },
    // 権限関連
    'missing_scope':    { message: 'エラー：Slack権限が不足しています。「Slack連携（認可）」から再連携してください。', shouldClearToken: true, shouldRetry: false },
    'ekm_access_denied':{ message: 'エラー：アクセスが制限されています。管理者にお問い合わせください。', shouldClearToken: false, shouldRetry: false },
    // メッセージ関連
    'msg_too_long':     { message: 'エラー：日報の文字数が多すぎます。内容を短くしてから再度お試しください。', shouldClearToken: false, shouldRetry: false },
    'no_text':          { message: 'エラー：送信内容が空です。日報を入力してから送信してください。', shouldClearToken: false, shouldRetry: false },
    // レートリミット
    'ratelimited':      { message: 'エラー：Slackの送信制限に達しました。少し時間をおいて（1分程度）から再度お試しください。', shouldClearToken: false, shouldRetry: true },
    // サーバーエラー
    'internal_error':   { message: 'エラー：Slack側でエラーが発生しました。しばらく時間をおいてから再度お試しください。', shouldClearToken: false, shouldRetry: true },
    'service_unavailable': { message: 'エラー：Slackが一時的に利用できません。しばらく時間をおいてから再度お試しください。', shouldClearToken: false, shouldRetry: true },
    'request_timeout':  { message: 'エラー：Slackへの接続がタイムアウトしました。再度お試しください。', shouldClearToken: false, shouldRetry: true }
  };
  
  var info = errorMap[errorCode];
  if (info) return info;
  return { message: 'エラー：Slackへの送信に失敗しました（' + errorCode + '）。再度お試しください。', shouldClearToken: false, shouldRetry: true };
}

/**
 * 無効なSlackトークンをクリア（再認可を促す）
 */
function clearSlackUserToken_() {
  var props = PropertiesService.getUserProperties();
  props.deleteProperty(USER_PROPERTY_SLACK_USER_TOKEN);
  props.deleteProperty(USER_PROPERTY_SLACK_USER_ID);
  props.deleteProperty(USER_PROPERTY_SLACK_TEAM_ID);
  Logger.log('無効なSlackトークンをクリアしました');
}

function sendToSlackV2(reportData) {
  Logger.log('Slack送信開始（V2）');

  try {
    // 入力バリデーション
    if (!reportData) {
      Logger.log('Slack送信失敗：reportDataがnull');
      return 'エラー：送信データがありません。ページを再読み込みしてからやり直してください。';
    }

    var userToken = getSlackUserToken_();
    var channelId = getSlackChannelId_();

    if (!userToken) {
      Logger.log('Slack送信失敗：ユーザートークンなし');
      return 'エラー：Slack連携が必要です。画面下部の「Slack連携（認可）」ボタンからSlackアカウントを連携してください。';
    }

    var tokenType = userToken.substring(0, 5);
    Logger.log('トークン種別: ' + tokenType + ' (xoxp-=ユーザー, xoxb-=ボット)');

    if (tokenType === 'xoxb-') {
      Logger.log('警告: ボットトークンが使用されています。ユーザー名義で投稿するにはユーザートークン(xoxp-)が必要です。');
    }

    if (!channelId) {
      Logger.log('Slack送信失敗：チャンネルID未設定');
      return 'エラー：Slackチャンネルが設定されていません。管理者にScript PropertiesへSLACK_CHANNEL_IDを設定するよう依頼してください。';
    }

    var slackMessage = formatSlackMessageV2(reportData);

    // メッセージ長さチェック（Slack上限4000040000文字）
    if (slackMessage.length > 39000) {
      Logger.log('Slack送信失敗：メッセージが長すぎる (' + slackMessage.length + '文字)');
      return 'エラー：日報の文字数が多すぎます（' + slackMessage.length + '文字）。内容を短くしてから再度お試しください。';
    }

    // Slack API呼び出し（リトライ付き）
    var apiRes = null;
    var lastError = '';
    var maxRetries = 2;
    for (var attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        apiRes = slackApiPost_('https://slack.com/api/chat.postMessage', userToken, {
          channel: channelId,
          text: slackMessage,
          as_user: true
        });
      } catch (fetchErr) {
        Logger.log('Slack APIネットワークエラー (attempt ' + (attempt + 1) + '): ' + fetchErr.message);
        lastError = fetchErr.message;
        if (attempt < maxRetries) {
          Utilities.sleep(1000 * (attempt + 1));
          continue;
        }
        return 'エラー：Slackへの接続に失敗しました。ネットワークを確認して再度お試しください。';
      }

      if (apiRes && apiRes.ok) {
        break;
      }

      // リトライ可能なエラーの場合のみリトライ
      var errCode = (apiRes && apiRes.error) ? apiRes.error : 'unknown_error';
      var errInfo = getSlackErrorInfo_(errCode);
      if (errInfo.shouldRetry && attempt < maxRetries) {
        Logger.log('Slack APIリトライ (attempt ' + (attempt + 1) + '): ' + errCode);
        Utilities.sleep(1000 * (attempt + 1));
        continue;
      }
      break;
    }

    Logger.log('chat.postMessage 応答: ' + JSON.stringify(apiRes));

    if (apiRes && apiRes.ok) {
      saveNextTasks(reportData.nextTasks);
      Logger.log('Slack送信完了（token type: ' + tokenType + '）');
      return '送信成功：Slackに投稿しました。';
    }

    var errorMsg = (apiRes && apiRes.error) ? apiRes.error : '不明なエラー';
    Logger.log('chat.postMessage 失敗: ' + errorMsg);

    var errorInfo = getSlackErrorInfo_(errorMsg);

    // 無効トークンの自動クリア
    if (errorInfo.shouldClearToken) {
      clearSlackUserToken_();
    }

    return errorInfo.message;

  } catch (error) {
    Logger.log('sendToSlackV2エラー：' + error.message);
    recordError_(error, { component: 'gas-server', action: 'sendToSlackV2' });
    return 'エラー：予期しないエラーが発生しました。しばらく待ってから再度お試しください。';
  }
}

/**
 * V2用Slack投稿本文を生成
 * @param {Object} reportData - 日報データ
 * @returns {string} Slack投稿本文
 */
function formatSlackMessageV2(reportData) {
  var msg = reportData.header + '\n\n' +
    '【今日やったこと】\n' + reportData.todayTasks + '\n\n' +
    '【わかった事・問題・共有事項】\n' + reportData.notices + '\n\n' +
    '【売上・利益・経費削減に関わるポイント】\n' + reportData.salesPoints + '\n\n' +
    '【次すること】\n' + reportData.nextTasks + '\n\n';

  if (reportData.overtime) {
    msg += '【残業時間】\n' + reportData.overtime + '\n\n';
  }

  msg += '---\n' +
    'Powered by <' + APP_URL + '|簡単日報君>';

  return msg;
}

// ============================================
// V3追加関数
// ============================================

/**
 * ツール設定を取得
 * @returns {Object} {slackSent: boolean, slackReceived: boolean, gmail: boolean, gmailReceived: boolean, backlog: boolean}
 */
function getToolSettings() {
  try {
    const dataStr = PropertiesService.getUserProperties()
      .getProperty(USER_PROPERTY_TOOL_SETTINGS);

    if (!dataStr) {
      return { slackSent: true, slackReceived: false, gmail: true, gmailReceived: false, backlog: false, sortOrder: 'category' };
    }

    const parsed = JSON.parse(dataStr);
    // 後方互換: 旧slack設定はslackSentに変換
    var slackSent = parsed.slackSent !== undefined ? !!parsed.slackSent : (parsed.slack !== false);
    var slackReceived = !!parsed.slackReceived;
    return {
      slackSent: slackSent,
      slackReceived: slackReceived,
      gmail: parsed.gmail !== false,
      gmailReceived: !!parsed.gmailReceived,
      backlog: !!parsed.backlog,
      sortOrder: parsed.sortOrder || 'category'
    };
  } catch (e) {
    Logger.log('getToolSettings error: ' + e.message);
    return { slackSent: true, slackReceived: false, gmail: true, gmailReceived: false, backlog: false, sortOrder: 'category' };
  }
}

/**
 * ユーザー別Backlog APIキーを保存
 * @param {string} apiKey - Backlog APIキー
 * @returns {boolean}
 */
function saveUserBacklogApiKey(apiKey) {
  try {
    var props = PropertiesService.getUserProperties();
    if (apiKey && apiKey.trim()) {
      props.setProperty(USER_PROPERTY_BACKLOG_API_KEY, apiKey.trim());
    } else {
      props.deleteProperty(USER_PROPERTY_BACKLOG_API_KEY);
    }
    return true;
  } catch (e) {
    Logger.log('saveUserBacklogApiKey error: ' + e.message);
    return false;
  }
}

/**
 * ユーザー別Backlog APIキーを取得（UserProperties優先、なければScriptProperties）
 * @returns {string} APIキー（未設定なら空文字）
 */
function getUserBacklogApiKey() {
  try {
    var userKey = PropertiesService.getUserProperties().getProperty(USER_PROPERTY_BACKLOG_API_KEY);
    if (userKey) return userKey;
    // フォールバック: ScriptPropertiesの共有キー（後方互換）
    return PropertiesService.getScriptProperties().getProperty('BACKLOG_API_KEY') || '';
  } catch (e) {
    Logger.log('getUserBacklogApiKey error: ' + e.message);
    return '';
  }
}

/**
 * ユーザーのBacklog APIキー設定状態を返す
 * @returns {Object} {hasKey: boolean, isUserKey: boolean}
 */
function getBacklogKeyStatus() {
  try {
    var props = PropertiesService.getScriptProperties();
    var spaceUrl = props.getProperty('BACKLOG_SPACE_BASE_URL') || '';
    var userKey = PropertiesService.getUserProperties().getProperty(USER_PROPERTY_BACKLOG_API_KEY);
    if (userKey) return { hasKey: true, isUserKey: true, spaceUrl: spaceUrl };
    var sharedKey = props.getProperty('BACKLOG_API_KEY');
    if (sharedKey) return { hasKey: true, isUserKey: false, spaceUrl: spaceUrl };
    return { hasKey: false, isUserKey: false, spaceUrl: spaceUrl };
  } catch (e) {
    return { hasKey: false, isUserKey: false, spaceUrl: '' };
  }
}

/**
 * ツール設定を保存
 * @param {Object} settings - {slack, gmail, gmailReceived, backlog}
 * @returns {boolean}
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
 * AI要約（Claude優先、Geminiフォールバック）
 * @param {string} prompt - プロンプト
 * @returns {{text: string, error: string}} 要約結果
 */
function summarizeWithAI_(prompt) {
  var props = PropertiesService.getScriptProperties();
  var anthropicKey = props.getProperty(PROPERTY_ANTHROPIC_API_KEY);
  var geminiKey = props.getProperty(PROPERTY_GEMINI_API_KEY);

  // Claude優先
  if (anthropicKey) {
    var result = callClaudeAPI_(prompt, anthropicKey);
    if (result.text) return result;
    Logger.log('Claude API失敗、Geminiにフォールバック: ' + result.error);
  }

  // Geminiフォールバック
  if (geminiKey) {
    return callGeminiAPI_(prompt, geminiKey);
  }

  Logger.log('AI APIキー未設定（ANTHROPIC_API_KEYまたはGEMINI_API_KEY）');
  return { text: '', error: 'AI要約: APIキー未設定。スクリプトプロパティにANTHROPIC_API_KEYまたはGEMINI_API_KEYを設定してください。' };
}

function callClaudeAPI_(prompt, apiKey) {
  try {
    const payload = {
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    };
    const res = UrlFetchApp.fetch(CLAUDE_API_URL, {
      method: 'post',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const statusCode = res.getResponseCode();
    const json = JSON.parse(res.getContentText());
    if (statusCode === 429) {
      return { text: '', error: 'Claude APIレート制限' };
    }
    if (statusCode >= 400) {
      var errMsg = (json.error && json.error.message) ? json.error.message : 'HTTP ' + statusCode;
      return { text: '', error: 'Claude API: ' + errMsg };
    }
    if (json.content && json.content[0] && json.content[0].text) {
      Logger.log('Claude APIで要約成功');
      return { text: json.content[0].text, error: '' };
    }
    return { text: '', error: 'Claude応答パース失敗' };
  } catch (e) {
    return { text: '', error: 'Claude API: ' + e.message };
  }
}

function callGeminiAPI_(prompt, apiKey) {
  try {
    const url = GEMINI_API_URL + GEMINI_MODEL + ':generateContent?key=' + apiKey;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
    };
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const statusCode = res.getResponseCode();
    const json = JSON.parse(res.getContentText());
    if (statusCode === 429) {
      return { text: '', error: 'AI要約: API利用上限に達しました。しばらく待ってから再試行してください。' };
    }
    if (statusCode >= 400) {
      var errMsg = (json.error && json.error.message) ? json.error.message : 'HTTP ' + statusCode;
      return { text: '', error: 'Gemini API: ' + errMsg };
    }
    if (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) {
      Logger.log('Gemini APIで要約成功');
      return { text: json.candidates[0].content.parts[0].text || '', error: '' };
    }
    return { text: '', error: 'Gemini応答パース失敗' };
  } catch (e) {
    return { text: '', error: 'Gemini API: ' + e.message };
  }
}

/**
 * Slack/Gmailの生テキストからタスク要約を生成
 * @param {Array} rawTexts - [{direction: '送信'/'受信', channel: '#general'/宛先, text: 本文}]
 * @param {string} toolName - 'Slack' or 'Gmail'
 * @returns {string} タスク要約（改行区切り）
 */
function generateTaskSummary_(rawTexts, toolName) {
  if (!rawTexts || rawTexts.length === 0) return '';

  var dataLines = rawTexts.map(function(item) {
    var timeStr = item.time ? item.time + ' ' : '';
    return '- ' + timeStr + '[' + item.direction + '] ' + (item.channel ? item.channel + ': ' : '') + item.text;
  }).join('\n');

  var prompt = 'あなたは日報作成アシスタントです。以下の' + toolName + 'の送受信履歴を分析し、プロジェクト・案件・話題ごとにグルーピングして日報用の要約を作成してください。\n\n'
    + '【出力フォーマット】\n'
    + 'グループ見出し（プロジェクト名やチャンネル名）\n'
    + '・HH:mm~ 箇条書き項目1\n'
    + '・HH:mm~ 箇条書き項目2\n'
    + '\n'
    + '別のグループ見出し\n'
    + '・箇条書き項目\n\n'
    + '【ルール】\n'
    + '- 関連するメッセージを同じグループにまとめる\n'
    + '- グループ見出しはプロジェクト名・チャンネル名・案件名など（装飾記号なし）\n'
    + '- 各箇条書きは「・」で始め、時刻（HH:mm~）を先頭に付けて、何をしたか・結果を簡潔に書く（例: ・09:30~ 資料送付）\n'
    + '- グループ間は空行で区切る\n'
    + '- 挨拶や雑談は除外\n'
    + '- 最大5グループ、各グループ最大5項目\n'
    + '- **必ず日本語で出力すること**。ベトナム語・中国語・ミャンマー語・英語など外国語のメッセージも内容を日本語に翻訳して要約する\n\n'
    + '【' + toolName + '履歴】\n' + dataLines;

  var aiResult = summarizeWithAI_(prompt);
  if (aiResult.error) return { text: '', error: aiResult.error };
  var summary = aiResult.text;
  if (!summary) return { text: '', error: '' };

  // グループ構造を保持した後処理 + フォールバック
  var lines = summary.split('\n');
  var cleaned = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trimEnd();
    if (line.trim().length === 0) {
      // 空行はグループ間の区切りとして保持
      if (cleaned.length > 0 && cleaned[cleaned.length - 1] !== '') {
        cleaned.push('');
      }
      continue;
    }
    // 箇条書き行（・で始まる）はそのまま保持
    if (line.trim().startsWith('・')) {
      cleaned.push(line.trim());
    } else {
      // グループ見出し行: 先頭の記号を除去
      var heading = line.replace(/^[\s]*[-●▪▸►*#]+\s*/, '').trim();
      if (heading.length > 0) {
        cleaned.push(heading);
      }
    }
  }
  // 末尾の空行を除去
  while (cleaned.length > 0 && cleaned[cleaned.length - 1] === '') {
    cleaned.pop();
  }

  // フォールバック: cleaned が空なら元のsummaryをそのまま返す
  if (cleaned.length === 0) {
    return { text: summary, error: '' };
  }

  return { text: cleaned.join('\n'), error: '' };
}

/**
 * Slack履歴を取得
 * @param {boolean} includeSent - 送信メッセージを含めるか
 * @param {boolean} includeReceived - 受信メッセージを含めるか
 * @returns {Object} {success, items, rawTexts, error}
 */
function getSlackHistory(includeSent, includeReceived, dateString) {
  Logger.log('Slack履歴取得開始（送信:' + includeSent + ', 受信:' + includeReceived + ', 日付:' + (dateString || '今日') + '）');

  try {
    const userToken = getSlackUserToken_();
    if (!userToken) {
      return { success: false, items: [], rawTexts: [], error: 'Slack未連携です。「Slack連携（認可）」を実行してください。' };
    }

    // 対象日を設定（dateStringがあればその日、なければ今日）
    let targetDate;
    if (dateString) {
      const parts = dateString.split('-');
      targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      targetDate = new Date();
    }
    const todayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const todayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

    // 前日の日付でafter:フィルタ（after:は指定日を除外するため、前日を指定すると対象日のメッセージが取得される）
    const yesterday = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = Utilities.formatDate(yesterday, TIMEZONE, 'yyyy-MM-dd');
    // 過去日指定時はbefore:で翌日を指定して範囲を絞る
    const beforeFilter = dateString ? ' before:' + Utilities.formatDate(new Date(targetDate.getTime() + 24 * 60 * 60 * 1000), TIMEZONE, 'yyyy-MM-dd') : '';

    const items = [];
    const rawTexts = [];

    // 送信メッセージ（from:me）
    if (includeSent) {
      const sentQuery = 'from:me after:' + yesterdayStr + beforeFilter;
      const sentItems = fetchSlackMessages_(userToken, sentQuery, todayStart, todayEnd, '送信');
      items.push.apply(items, sentItems.items);
      rawTexts.push.apply(rawTexts, sentItems.rawTexts);
    }

    // 受信メッセージ（to:me = メンションやDM）
    if (includeReceived) {
      const receivedQuery = 'to:me after:' + yesterdayStr + beforeFilter;
      const receivedItems = fetchSlackMessages_(userToken, receivedQuery, todayStart, todayEnd, '受信');
      items.push.apply(items, receivedItems.items);
      rawTexts.push.apply(rawTexts, receivedItems.rawTexts);
    }

    // 時刻順にソート
    items.sort(function(a, b) { return a.time.localeCompare(b.time); });

    Logger.log('Slack履歴取得完了: ' + items.length + '件');
    return { success: true, items: items, rawTexts: rawTexts, error: '' };

  } catch (e) {
    Logger.log('getSlackHistory error: ' + e.message);
    var errMsg = 'Slack履歴を取得できませんでした。';
    if (e.message === 'SLACK_MISSING_SCOPE') {
      errMsg = 'Slackの権限が不足しています。「Slack連携（認可）」から再連携してください。';
    } else if (e.message && e.message !== errMsg) {
      // fetchSlackMessages_からの詳細エラーメッセージをそのまま伝える
      errMsg = e.message;
    }
    return { success: false, items: [], rawTexts: [], error: errMsg };
  }
}

/**
 * Slack検索APIでメッセージを取得するヘルパー
 * @param {string} userToken - Slackユーザートークン
 * @param {string} query - 検索クエリ
 * @param {Date} todayStart - 今日の開始
 * @param {Date} todayEnd - 今日の終了
 * @param {string} direction - '送信' or '受信'
 * @returns {Object} {items, rawTexts}
 */
function fetchSlackMessages_(userToken, query, todayStart, todayEnd, direction) {
  const params = {
    query: query,
    sort: 'timestamp',
    sort_dir: 'asc',
    count: 20
  };

  const url = 'https://slack.com/api/search.messages?' + toQueryString_(params);
  const res = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: { 'Authorization': 'Bearer ' + userToken },
    muteHttpExceptions: true
  });

  const json = safeJsonParse_(res.getContentText());
  const items = [];
  const rawTexts = [];

  if (!json || !json.ok) {
    var slackErr = json && json.error ? json.error : 'unknown';
    Logger.log('Slack検索失敗（' + direction + '）: ' + slackErr);
    if (slackErr === 'missing_scope') {
      // スコープ不足: トークンをクリアして再認証を促す
      clearSlackUserToken_();
      throw new Error('SLACK_MISSING_SCOPE');
    }
    // 認証エラーの場合はトークンをクリアして再認証を促す
    if (slackErr === 'token_revoked' || slackErr === 'invalid_auth' || slackErr === 'account_inactive' || slackErr === 'token_expired') {
      clearSlackUserToken_();
      throw new Error('Slackの認証が無効です。「Slack連携（認可）」から再連携してください。（エラー: ' + slackErr + '）');
    }
    // その他のエラーもスローして呼び出し元に伝える
    throw new Error('Slack API エラー: ' + slackErr);
  }

  const messages = json.messages && json.messages.matches ? json.messages.matches : [];

  for (var i = 0; i < messages.length && items.length < MAX_ITEMS_PER_TOOL; i++) {
    var msg = messages[i];
    var ts = parseFloat(msg.ts) * 1000;
    var msgDate = new Date(ts);

    if (msgDate >= todayStart && msgDate <= todayEnd) {
      var channelName = msg.channel && msg.channel.name ? msg.channel.name : 'DM';
      var fullText = msg.text || '';
      var displayText = fullText.length > 30 ? fullText.substring(0, 30) + '...' : fullText;

      var prefix = channelName === 'DM' ? 'DM' : '#' + channelName;
      items.push({
        type: 'slack',
        time: Utilities.formatDate(msgDate, TIMEZONE, TIME_FORMAT),
        content: '[' + direction + '] ' + prefix + ': 「' + displayText + '」'
      });

      // AI要約用に全文テキストを保存（時刻付き）
      rawTexts.push({
        direction: direction,
        channel: prefix,
        time: Utilities.formatDate(msgDate, TIMEZONE, TIME_FORMAT),
        text: fullText.substring(0, 500)
      });
    }
  }

  return { items: items, rawTexts: rawTexts };
}

/**
 * Gmail履歴を取得（AI要約用の生データも返す）
 * @param {boolean} includeSent - 送信メールを含めるか
 * @param {boolean} includeReceived - 受信メールも含めるか
 * @returns {Object} {success, items, rawTexts, error}
 */
function getGmailHistory(includeSent, includeReceived, dateString) {
  Logger.log('Gmail履歴取得開始（送信:' + includeSent + ', 受信:' + includeReceived + ', 日付:' + (dateString || '今日') + '）');

  try {
    // 対象日を設定（dateStringがあればその日、なければ今日）
    let targetDate;
    if (dateString) {
      const parts = dateString.split('-');
      targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      targetDate = new Date();
    }
    // after:は指定日を除外するため、前日を指定して対象日のメールを取得
    const yesterday = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);
    const dateStr = Utilities.formatDate(yesterday, TIMEZONE, 'yyyy/MM/dd');
    // before:で対象日の翌日を指定して範囲を絞る
    const nextDay = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    const nextDayStr = Utilities.formatDate(nextDay, TIMEZONE, 'yyyy/MM/dd');
    const items = [];
    const rawTexts = [];

    // 送信メール（最大20件に制限して高速化）
    if (includeSent) {
    const sentQuery = 'in:sent after:' + dateStr + (dateString ? ' before:' + nextDayStr : '');
    const sentThreads = GmailApp.search(sentQuery, 0, 20);

    for (let i = 0; i < sentThreads.length && items.length < MAX_ITEMS_PER_TOOL; i++) {
      const messages = sentThreads[i].getMessages();
      const lastMessage = messages[messages.length - 1];
      const date = lastMessage.getDate();
      let subject = lastMessage.getSubject() || '(件名なし)';
      let body = lastMessage.getPlainBody() || '';
      let to = lastMessage.getTo() || '';
      if (subject.length > 30) {
        var displaySubject = subject.substring(0, 30) + '...';
      } else {
        var displaySubject = subject;
      }

      items.push({
        type: 'gmail',
        time: Utilities.formatDate(date, TIMEZONE, TIME_FORMAT),
        content: '送信: 「' + displaySubject + '」'
      });

      // AI要約用に件名+本文を保存（時刻付き）
      rawTexts.push({
        direction: '送信',
        channel: to.length > 30 ? to.substring(0, 30) + '...' : to,
        time: Utilities.formatDate(date, TIMEZONE, TIME_FORMAT),
        text: '件名: ' + subject + ' / 本文: ' + body.substring(0, 300)
      });
    }

    } // end includeSent

    // 受信メール（設定がONの場合のみ）
    if (includeReceived) {
      const receivedQuery = 'in:inbox after:' + dateStr + (dateString ? ' before:' + nextDayStr : '') + ' -in:sent';
      const receivedThreads = GmailApp.search(receivedQuery, 0, 20);

      for (let j = 0; j < receivedThreads.length && items.length < MAX_ITEMS_PER_TOOL; j++) {
        const rMessages = receivedThreads[j].getMessages();
        const rLastMessage = rMessages[rMessages.length - 1];
        const rDate = rLastMessage.getDate();
        let rSubject = rLastMessage.getSubject() || '(件名なし)';
        let rFrom = rLastMessage.getFrom() || '';
        let rBody = rLastMessage.getPlainBody() || '';
        if (rFrom.length > 15) {
          var displayFrom = rFrom.substring(0, 15) + '...';
        } else {
          var displayFrom = rFrom;
        }
        if (rSubject.length > 25) {
          var displayRSubject = rSubject.substring(0, 25) + '...';
        } else {
          var displayRSubject = rSubject;
        }

        items.push({
          type: 'gmail',
          time: Utilities.formatDate(rDate, TIMEZONE, TIME_FORMAT),
          content: '受信(' + displayFrom + '): 「' + displayRSubject + '」'
        });

        rawTexts.push({
          direction: '受信',
          channel: rFrom.length > 30 ? rFrom.substring(0, 30) + '...' : rFrom,
          time: Utilities.formatDate(rDate, TIMEZONE, TIME_FORMAT),
          text: '件名: ' + rSubject + ' / 本文: ' + rBody.substring(0, 300)
        });
      }
    }

    items.sort(function(a, b) { return a.time.localeCompare(b.time); });

    Logger.log('Gmail履歴取得完了: ' + items.length + '件');
    return { success: true, items: items, rawTexts: rawTexts, error: '' };

  } catch (e) {
    Logger.log('getGmailHistory error: ' + e.message);
    return { success: false, items: [], rawTexts: [], error: 'Gmail履歴を取得できませんでした。' };
  }
}

/**
 * 全ツール履歴を一括取得（V3）
 * @param {string} dateString - カレンダー用日付（YYYY-MM-DD）、nullで今日
 * @returns {Object} {calendar, slack, gmail, backlog, errors}
 */
function getAllToolHistoryV3(dateString) {
  Logger.log('全ツール履歴取得開始（V3）');

  const result = {
    calendar: '',
    slack: { items: [], error: '' },
    gmail: { items: [], error: '' },
    backlog: { text: '', error: '' },
    errors: []
  };

  const settings = getToolSettings();

  // カレンダー予定取得（日付指定対応）
  try {
    result.calendar = getEventsForDate(dateString);
  } catch (e) {
    Logger.log('カレンダー取得エラー: ' + e.message);
    result.calendar = '';
    result.errors.push('[カレンダー] ' + e.message);
  }

  // Slack履歴（日付指定対応）— 送信・受信を個別制御
  var slackRawTexts = [];
  if (settings.slackSent || settings.slackReceived) {
    try {
      const slackResult = getSlackHistory(settings.slackSent, settings.slackReceived, dateString);
      result.slack = { items: slackResult.items, error: slackResult.error, summary: '' };
      slackRawTexts = slackResult.rawTexts || [];
      if (!slackResult.success && slackResult.error) {
        result.errors.push('[Slack] ' + slackResult.error);
      }
    } catch (e) {
      Logger.log('Slack取得エラー: ' + e.message);
      result.errors.push('[Slack] ' + e.message);
    }
  }

  // Gmail履歴（日付指定対応）— 送信・受信を個別制御
  var gmailRawTexts = [];
  if (settings.gmail || settings.gmailReceived) {
    try {
      const gmailResult = getGmailHistory(settings.gmail, settings.gmailReceived, dateString);
      result.gmail = { items: gmailResult.items, error: gmailResult.error, summary: '' };
      gmailRawTexts = gmailResult.rawTexts || [];
      if (!gmailResult.success && gmailResult.error) {
        result.errors.push('[Gmail] ' + gmailResult.error);
      }
    } catch (e) {
      Logger.log('Gmail取得エラー: ' + e.message);
      result.errors.push('[Gmail] ' + e.message);
    }
  }

  // AI要約（Claude優先、Geminiフォールバック）
  try {
    if (slackRawTexts.length > 0) {
      var slackSummaryResult = generateTaskSummary_(slackRawTexts, 'Slack');
      if (slackSummaryResult.text) {
        result.slack.summary = slackSummaryResult.text;
        Logger.log('Slack AI要約完了: ' + slackSummaryResult.text.split('\n').length + '件');
      }
      if (slackSummaryResult.error) {
        result.slack.summaryError = slackSummaryResult.error;
        Logger.log('Slack AI要約エラー: ' + slackSummaryResult.error);
      }
    }
    if (gmailRawTexts.length > 0) {
      var gmailSummaryResult = generateTaskSummary_(gmailRawTexts, 'Gmail');
      if (gmailSummaryResult.text) {
        result.gmail.summary = gmailSummaryResult.text;
        Logger.log('Gmail AI要約完了: ' + gmailSummaryResult.text.split('\n').length + '件');
      }
      if (gmailSummaryResult.error) {
        result.gmail.summaryError = gmailSummaryResult.error;
        Logger.log('Gmail AI要約エラー: ' + gmailSummaryResult.error);
      }
    }
  } catch (e) {
    Logger.log('AI要約エラー（継続）: ' + e.message);
  }

  // Backlog完了課題（日付指定対応）
  result.backlog = { text: '', error: '' };
  if (settings.backlog) {
    try {
      var backlogText = getBacklogReport(dateString);
      result.backlog = { text: backlogText, error: '' };
    } catch (e) {
      Logger.log('Backlog取得エラー: ' + e.message);
      result.backlog = { text: '', error: e.message };
      result.errors.push('[Backlog] ' + e.message);
    }
  }

  Logger.log('全ツール履歴取得完了（V3）');
  return result;
}
