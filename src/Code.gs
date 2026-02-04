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
 * ユーザーのアクセス権限をチェック
 * @returns {boolean} アクセス許可されている場合はtrue
 */
function checkUserAccess() {
  try {
    const email = Session.getActiveUser().getEmail();
    if (!email) {
      return false;
    }
    
    const domain = email.split('@')[1];
    if (!domain) {
      return false;
    }
    
    // 許可されたドメインかチェック
    return ALLOWED_DOMAINS.includes(domain.toLowerCase());
  } catch (e) {
    Logger.log('アクセスチェックエラー: ' + e.message);
    return false;
  }
}

/**
 * 管理者権限をチェック
 * @returns {boolean} 管理者の場合はtrue
 */
function checkAdminAccess() {
  try {
    const email = Session.getActiveUser().getEmail();
    if (!email) {
      return false;
    }
    
    const domain = email.split('@')[1];
    if (!domain) {
      return false;
    }
    
    return ADMIN_DOMAINS.includes(domain.toLowerCase());
  } catch (e) {
    Logger.log('管理者チェックエラー: ' + e.message);
    return false;
  }
}

/**
 * 現在のユーザー情報を取得
 * @returns {Object} ユーザー情報
 */
function getCurrentUserInfo() {
  const email = Session.getActiveUser().getEmail() || '';
  const domain = email ? email.split('@')[1] : '';
  return {
    email: email,
    domain: domain,
    isAdmin: ADMIN_DOMAINS.includes(domain.toLowerCase()),
    isAllowed: ALLOWED_DOMAINS.includes(domain.toLowerCase())
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
      <title>アクセス権限がありません - 簡単日報くん</title>
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
        <h1>簡単日報くん</h1>
        <h2>アクセス権限がありません</h2>
        <p>このアプリケーションにアクセスする権限がありません。</p>
        <div class="email">${email}</div>
        <p>アクセスが必要な場合は、管理者にお問い合わせください。</p>
      </div>
    </body>
    </html>
  `;
  return HtmlService.createHtmlOutput(html)
    .setTitle('アクセス権限がありません - 簡単日報くん')
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
      <title>管理画面 - 簡単日報くん</title>
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
            <span class="info-value">${userInfo.email}</span>
          </div>
          <div class="info-row">
            <span class="info-label">ドメイン</span>
            <span class="info-value">${userInfo.domain}</span>
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
    .setTitle('管理画面 - 簡単日報くん')
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
    
    // 管理画面へのアクセス
    if (e.parameter.page === 'admin') {
      if (!checkAdminAccess()) {
        return createAccessDeniedPage();
      }
      return createAdminPage();
    }
  }

  // アクセス権限チェック
  if (!checkUserAccess()) {
    return createAccessDeniedPage();
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

  // 固定のOAuthプロキシURLを使用（Slack Appに登録されているURL）
  const redirectUri = getSlackRedirectUri_();
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

    // 固定のOAuthプロキシURLを使用（認可時と同じURLを使用する必要がある）
    const redirectUri = getSlackRedirectUri_();

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

// OAuth Proxy URL（Slack Appに登録する固定のredirect_uri）
// これにより、どのドメインのユーザーでも同じredirect_uriを使用できる
const OAUTH_PROXY_URL = 'https://kantan-nippou.takagi.bz/oauth/callback';

/**
 * Slack OAuth用のリダイレクトURIを取得
 * 固定のOAuthプロキシURLを返す（Slack Appに登録されているURL）
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
  // 現在のURLを取得（デプロイメントIDは動的に取得）
  const currentUrl = ScriptApp.getService().getUrl();
  // ドメイン部分を takagi.bz に置換
  // 例: script.google.com/a/kotsuyudo.com/macros/s/... → script.google.com/a/macros/takagi.bz/s/...
  return currentUrl.replace(/script\.google\.com\/a\/[^\/]+\/macros/, 'script.google.com/a/macros/takagi.bz');
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
