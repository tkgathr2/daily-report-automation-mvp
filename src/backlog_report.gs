/**
 * backlog_report.gs
 *
 * 簡単日報君 Backlog連携モジュール
 * 本日完了した課題を抽出し、日報用テキストを生成する。
 *
 * 公開関数: getBacklogReport()
 * 返り値: string（日報に挿入するBacklog完了課題テキスト）
 *
 * 必要な ScriptProperties:
 * - BACKLOG_SPACE_BASE_URL
 * - BACKLOG_API_KEY
 *
 * オプション ScriptProperties:
 * - BACKLOG_ACTIVITY_TYPES（デフォルト: '1,2,3,14'）
 * - BACKLOG_ACTIVITY_FETCH_COUNT（デフォルト: '100'）
 *
 * @version 2.0
 * @author Devin AI
 */

// ============================================
// 定数
// ============================================
var BACKLOG_MAX_PAGES = 5;
var BACKLOG_MAX_ISSUES = 50;
var BACKLOG_TIMEZONE = 'Asia/Tokyo';
var BACKLOG_STATUS_COMPLETED = 4;
// TIMEZONE is defined in Code.gs (same value as BACKLOG_TIMEZONE)

// ============================================
// 設定読み込み
// ============================================

/**
 * ScriptProperties から Backlog設定を読み込む
 * @returns {Object} Backlog設定オブジェクト
 */
function getBacklogConfig_() {
  var props = PropertiesService.getScriptProperties();

  var baseUrl = props.getProperty('BACKLOG_SPACE_BASE_URL');
  // ユーザー別APIキーを優先取得（getUserBacklogApiKey はCode.gsで定義）
  var apiKey = getUserBacklogApiKey();

  if (!baseUrl) {
    throw new Error('BACKLOG_SPACE_BASE_URL が未設定です。管理者に設定を依頼してください。');
  }
  if (!apiKey) {
    throw new Error('BACKLOG_API_KEY_MISSING');
  }

  return {
    baseUrl: baseUrl,
    apiKey: apiKey,
    activityTypes: (props.getProperty('BACKLOG_ACTIVITY_TYPES') || '1,2,3,14')
      .split(',')
      .map(function(s) { return s.trim(); })
      .filter(Boolean),
    fetchCount: Number(props.getProperty('BACKLOG_ACTIVITY_FETCH_COUNT') || '100'),
    timezone: BACKLOG_TIMEZONE
  };
}

// ============================================
// API共通関数
// ============================================

/**
 * Backlog API GETリクエスト
 * @param {string} url - リクエストURL
 * @returns {Object|Array} パース済みレスポンス
 */
function backlogApiGet_(url) {
  var res = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: { Accept: 'application/json' }
  });

  var code = res.getResponseCode();
  var text = res.getContentText();

  if (code === 429) {
    Logger.log('BACKLOG_RATE_LIMIT_EXCEEDED');
    throw new Error('RATE_LIMIT_429: ' + text);
  }

  if (code >= 200 && code < 300) {
    return JSON.parse(text);
  }

  throw new Error('Backlog API error: status=' + code + ' body=' + text);
}

// ============================================
// JST判定
// ============================================

/**
 * ISO文字列がJST本日かどうか判定
 * @param {string} isoString - ISO 8601形式の日時文字列（UTC前提）
 * @param {string} timezone - タイムゾーン
 * @returns {boolean} 本日ならtrue
 */
function backlogIsTodayJst_(isoString, timezone) {
  var d = new Date(isoString);
  var today = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');
  var target = Utilities.formatDate(d, timezone, 'yyyy-MM-dd');
  return today === target;
}

// ============================================
// ユーザー情報取得
// ============================================

/**
 * Backlog users/myself を取得
 * @param {Object} config - Backlog設定
 * @returns {Object} ユーザー情報
 */
function getBacklogMyself_(config) {
  return backlogApiGet_(
    config.baseUrl + '/api/v2/users/myself?apiKey=' + encodeURIComponent(config.apiKey)
  );
}

// ============================================
// アクティビティ取得（ページング対応）
// ============================================

/**
 * 本日のアクティビティをページングで取得
 * @param {Object} config - Backlog設定
 * @param {number} userId - ユーザーID
 * @returns {Array} 本日のアクティビティ一覧
 */
function getBacklogTodayActivities_(config, userId) {
  var allActivities = [];
  var maxId = null;
  var query = config.activityTypes.map(function(v) {
    return 'activityTypeId[]=' + encodeURIComponent(v);
  }).join('&');

  for (var page = 0; page < BACKLOG_MAX_PAGES; page++) {
    var url = config.baseUrl + '/api/v2/users/' + userId + '/activities'
      + '?apiKey=' + encodeURIComponent(config.apiKey)
      + '&count=' + config.fetchCount
      + '&order=desc'
      + '&' + query;

    if (maxId !== null) {
      url += '&maxId=' + maxId;
    }

    var activities = backlogApiGet_(url);

    if (activities.length === 0) break;

    for (var i = 0; i < activities.length; i++) {
      if (backlogIsTodayJst_(activities[i].created, config.timezone)) {
        allActivities.push(activities[i]);
      }
    }

    var lastActivity = activities[activities.length - 1];
    if (!backlogIsTodayJst_(lastActivity.created, config.timezone)) {
      break;
    }

    maxId = lastActivity.id - 1;

    if (page === BACKLOG_MAX_PAGES - 1) {
      Logger.log('BACKLOG_ACTIVITY_PAGE_LIMIT_REACHED: 5ページ取得しても末尾が本日');
    }
  }

  return allActivities;
}

// ============================================
// 完了課題の抽出
// ============================================

/**
 * アクティビティからステータスが完了（4）に変更された課題を抽出する
 * 同一課題の重複を排除し、課題ごとに1エントリにまとめる
 * @param {Array} activities - 本日のアクティビティ一覧
 * @returns {Object} issueKey -> {issueKeyId, projectKey, summary, created} のマップ
 */
function extractCompletedIssues_(activities) {
  var issueMap = {};

  for (var i = 0; i < activities.length; i++) {
    var a = activities[i];
    if (!a.content || !a.content.changes) continue;

    for (var j = 0; j < a.content.changes.length; j++) {
      var change = a.content.changes[j];
      if (change.field === 'status' && String(change.new_value) === String(BACKLOG_STATUS_COMPLETED)) {
        var keyId = a.content.key_id;
        var projectKey = a.project ? a.project.projectKey : '';
        var key = projectKey && keyId ? projectKey + '-' + keyId : String(keyId || a.content.id);

        if (!issueMap[key]) {
          issueMap[key] = {
            issueKeyId: keyId,
            issueId: a.content.id,
            projectKey: projectKey,
            issueKey: key,
            summary: a.content.summary || '',
            created: a.created,
            completedTime: Utilities.formatDate(new Date(a.created), BACKLOG_TIMEZONE, 'HH:mm'),
            actualHours: null  // fetchIssueSummaries_で補完
          };
        }
      }
    }
  }

  return issueMap;
}

// ============================================
// issue詳細取得（summaryが空の場合の補完）
// ============================================

/**
 * summaryが空の課題の詳細を取得して補完する
 * @param {Object} config - Backlog設定
 * @param {Object} issueMap - extractCompletedIssues_ の返り値
 * @returns {Object} 補完されたissueMap
 */
function fetchIssueSummaries_(config, issueMap) {
  var keys = Object.keys(issueMap);
  var fetchedCount = 0;

  for (var i = 0; i < keys.length; i++) {
    var entry = issueMap[keys[i]];

    if (entry.summary && entry.actualHours !== null) continue;

    if (fetchedCount >= BACKLOG_MAX_ISSUES) {
      Logger.log('BACKLOG_ISSUE_DETAIL_LIMIT_REACHED: 50課題超のため打ち切り');
      break;
    }

    var issueKey = entry.issueKey;
    if (!issueKey) {
      entry.summary = '(課題名不明)';
      continue;
    }

    try {
      var issue = backlogApiGet_(
        config.baseUrl + '/api/v2/issues/' + encodeURIComponent(issueKey)
        + '?apiKey=' + encodeURIComponent(config.apiKey)
      );
      entry.summary = issue.summary || '(課題名不明)';
      entry.issueKey = issue.issueKey || issueKey;
      entry.actualHours = (issue.actualHours != null) ? issue.actualHours : null;
      fetchedCount++;
    } catch (e) {
      Logger.log('BACKLOG_ISSUE_FETCH_FAILED: issueKey=' + issueKey + ' error=' + e.message);
      entry.summary = '(課題名不明)';
      fetchedCount++;
    }
  }

  return issueMap;
}

// ============================================
// 表示整形
// ============================================

/**
 * issueMapから日報用テキストを生成する
 * @param {Object} config - Backlog設定
 * @param {Object} issueMap - 完了課題のマップ
 * @returns {string} 日報テキスト
 */
function formatBacklogReport_(config, issueMap) {
  var keys = Object.keys(issueMap);
  var lines = [];

  for (var i = 0; i < keys.length; i++) {
    var entry = issueMap[keys[i]];
    var issueUrl = config.baseUrl + '/view/' + entry.issueKey;
    var line = '- <' + issueUrl + '|' + entry.issueKey + ' ' + entry.summary + '>';

    // 完了時間をスケジュール形式で先頭に追加（例: 12:18~）
    if (entry.completedTime) {
      line = entry.completedTime + '~ ' + line;
    }

    // 実績時間を追加（0hも表示）
    if (entry.actualHours != null) {
      line += '（実績: ' + entry.actualHours + 'h）';
    }

    lines.push(line);
  }

  if (lines.length === 0) {
    return 'Backlog完了課題\n本日完了した課題はありません';
  }

  return lines.join('\n');
}

// ============================================
// 公開関数
// ============================================

/**
 * Backlog完了課題レポートを生成する
 *
 * getAllToolHistoryV3() 内で他ツール（Slack/Gmail/Notion）と同様に呼び出す。
 *
 * @returns {string} Backlog完了課題テキスト
 */
function getBacklogReport() {
  try {
    var config = getBacklogConfig_();
    var myself = getBacklogMyself_(config);
    var activities = getBacklogTodayActivities_(config, myself.id);

    Logger.log('Backlog: 本日のアクティビティ取得完了 count=' + activities.length);

    var issueMap = extractCompletedIssues_(activities);
    var completedCount = Object.keys(issueMap).length;
    Logger.log('Backlog: 完了課題数=' + completedCount);

    if (completedCount === 0) {
      return 'Backlog完了課題\n本日完了した課題はありません';
    }

    issueMap = fetchIssueSummaries_(config, issueMap);

    return formatBacklogReport_(config, issueMap);

  } catch (err) {
    Logger.log('getBacklogReport error: ' + String(err));

    try {
      if (typeof recordError_ === 'function') {
        recordError_(err, { component: 'gas-server', action: 'getBacklogReport' });
      }
    } catch (ignore) {}

    var msg = String(err);
    if (msg.indexOf('BACKLOG_API_KEY_MISSING') >= 0) {
      return 'BACKLOG_ERROR:API_KEY_MISSING';
    }
    if (msg.indexOf('429') >= 0 || msg.indexOf('RATE_LIMIT') >= 0) {
      return 'BACKLOG_ERROR:RATE_LIMIT';
    }
    if (msg.indexOf('Authentication failure') >= 0 || msg.indexOf('status=401') >= 0) {
      return 'BACKLOG_ERROR:AUTH_FAILURE';
    }
    return 'BACKLOG_ERROR:UNKNOWN';
  }
}
