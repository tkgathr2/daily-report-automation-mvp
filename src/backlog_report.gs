/**
 * backlog_report.gs
 *
 * 簡単日報君 Backlog連携モジュール
 * 本日 actualHours が更新された課題を抽出し、日報用テキストを生成する。
 *
 * 公開関数: getBacklogReport()
 * 返り値: string（日報に挿入するBacklog作業実績テキスト）
 *
 * 必要な ScriptProperties:
 * - BACKLOG_SPACE_BASE_URL
 * - BACKLOG_API_KEY
 * - BACKLOG_ACTIVITY_ACTUAL_HOURS_FIELD（フェーズ0検証後に確定）
 * - BACKLOG_ACTIVITY_TYPES（フェーズ0検証後に確定）
 * - BACKLOG_ACTIVITY_FETCH_COUNT
 * - BACKLOG_DETAIL_MODE
 * - BACKLOG_ENABLE_CURRENT_ACTUAL_HOURS
 *
 * @version 1.0
 * @author Devin AI
 */

// ============================================
// 定数
// ============================================
var BACKLOG_MAX_PAGES = 5;
var BACKLOG_MAX_ISSUES = 50;
var BACKLOG_TIMEZONE = 'Asia/Tokyo';

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
  var apiKey = props.getProperty('BACKLOG_API_KEY');

  if (!baseUrl || !apiKey) {
    throw new Error('BACKLOG_SPACE_BASE_URL または BACKLOG_API_KEY が未設定です');
  }

  return {
    baseUrl: baseUrl,
    apiKey: apiKey,
    actualHoursField: props.getProperty('BACKLOG_ACTIVITY_ACTUAL_HOURS_FIELD') || 'actualHours',
    activityTypes: (props.getProperty('BACKLOG_ACTIVITY_TYPES') || '2,14')
      .split(',')
      .map(function(s) { return s.trim(); })
      .filter(Boolean),
    fetchCount: Number(props.getProperty('BACKLOG_ACTIVITY_FETCH_COUNT') || '100'),
    detailMode: props.getProperty('BACKLOG_DETAIL_MODE') || 'simple',
    enableCurrentActualHours: (props.getProperty('BACKLOG_ENABLE_CURRENT_ACTUAL_HOURS') || 'false') === 'true',
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
// 時間表示変換
// ============================================

/**
 * 時間数値を日本語表示に変換
 * @param {number} value - 時間（小数）
 * @returns {string} 日本語表示（例: "1時間30分"）、0の場合は空文字
 */
function backlogFormatHours_(value) {
  var totalMinutes = Math.round(Number(value) * 60);
  var hours = Math.floor(totalMinutes / 60);
  var minutes = totalMinutes % 60;

  if (hours === 0 && minutes === 0) return '';
  if (hours > 0 && minutes > 0) return hours + '時間' + minutes + '分';
  if (hours > 0 && minutes === 0) return hours + '時間';
  return minutes + '分';
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

    // 2ページ目以降はmaxIdで前ページ末尾より古いアクティビティを取得
    if (maxId !== null) {
      url += '&maxId=' + maxId;
    }

    var activities = backlogApiGet_(url);

    if (activities.length === 0) break;

    // 本日分のみフィルタして追加
    for (var i = 0; i < activities.length; i++) {
      if (backlogIsTodayJst_(activities[i].created, config.timezone)) {
        allActivities.push(activities[i]);
      }
    }

    // 末尾activityがJST本日かチェック
    var lastActivity = activities[activities.length - 1];
    if (!backlogIsTodayJst_(lastActivity.created, config.timezone)) {
      break;
    }

    // 次ページ用にmaxIdを更新（末尾のid - 1 でそれより古いものを取得）
    maxId = lastActivity.id - 1;

    if (page === BACKLOG_MAX_PAGES - 1) {
      Logger.log('BACKLOG_ACTIVITY_PAGE_LIMIT_REACHED: 5ページ取得しても末尾が本日');
    }
  }

  return allActivities;
}

// ============================================
// actualHours change 抽出
// ============================================

/**
 * アクティビティからactualHours変更を抽出
 * @param {Array} activities - アクティビティ一覧
 * @param {string} actualHoursField - actualHoursのfield名
 * @returns {Array} actualHours変更一覧
 */
function extractActualHoursChanges_(activities, actualHoursField) {
  var changes = [];

  for (var i = 0; i < activities.length; i++) {
    var a = activities[i];
    if (!a.content || !a.content.changes) continue;

    for (var j = 0; j < a.content.changes.length; j++) {
      var change = a.content.changes[j];
      if (change.field === actualHoursField) {
        changes.push({
          activityId: a.id,
          activityType: a.type,
          created: a.created,
          issueId: a.content.id,
          issueKeyId: a.content.key_id,
          projectId: a.project ? a.project.id : null,
          projectKey: a.project ? a.project.projectKey : null,
          oldValue: change.old_value,
          newValue: change.new_value
        });
      }
    }
  }

  return changes;
}

// ============================================
// 差分集計
// ============================================

/**
 * 差分値を正規化する
 * @param {*} value - old_value または new_value
 * @returns {number} 正規化された数値
 */
function normalizeHoursValue_(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  var num = Number(value);
  return isNaN(num) ? 0 : num;
}

/**
 * actualHours変更を課題ごとに集計する
 * @param {Array} changes - extractActualHoursChanges_ の返り値
 * @returns {Object} issueKeyId -> {issueId, projectKey, totalDiff, changes} のマップ
 */
function aggregateByIssue_(changes) {
  // created昇順（古い順）にソート
  changes.sort(function(a, b) {
    return new Date(a.created).getTime() - new Date(b.created).getTime();
  });

  var issueMap = {};

  for (var i = 0; i < changes.length; i++) {
    var c = changes[i];
    var key = c.issueKeyId || c.issueId;

    var oldVal = normalizeHoursValue_(c.oldValue);
    var newVal = normalizeHoursValue_(c.newValue);

    // new_value が null の場合は警告ログ
    if (c.newValue === null || c.newValue === undefined || c.newValue === '') {
      Logger.log('ACTUAL_HOURS_RESET_DETECTED: issueKeyId=' + key + ' old=' + c.oldValue + ' new=' + c.newValue);
    }

    var diff = newVal - oldVal;

    if (!issueMap[key]) {
      issueMap[key] = {
        issueId: c.issueId,
        issueKeyId: c.issueKeyId,
        projectKey: c.projectKey,
        totalDiff: 0,
        changes: []
      };
    }

    issueMap[key].totalDiff += diff;
    issueMap[key].changes.push({
      oldValue: oldVal,
      newValue: newVal,
      diff: diff,
      created: c.created
    });
  }

  return issueMap;
}

// ============================================
// issue詳細取得
// ============================================

/**
 * 課題詳細を取得してissueMapに補完する
 * @param {Object} config - Backlog設定
 * @param {Object} issueMap - aggregateByIssue_ の返り値
 * @returns {Object} 補完されたissueMap
 */
function fetchIssueDetails_(config, issueMap) {
  var keys = Object.keys(issueMap);
  var fetchedCount = 0;

  for (var i = 0; i < keys.length; i++) {
    if (fetchedCount >= BACKLOG_MAX_ISSUES) {
      Logger.log('BACKLOG_ISSUE_DETAIL_LIMIT_REACHED: 50課題超のため打ち切り');
      break;
    }

    var key = keys[i];
    var entry = issueMap[key];

    // issueKeyを組み立て（projectKey-issueKeyId）
    var issueKey = entry.projectKey && entry.issueKeyId
      ? entry.projectKey + '-' + entry.issueKeyId
      : null;

    if (!issueKey && entry.issueId) {
      // issueKeyが組み立てられない場合はissueIdで取得
      issueKey = String(entry.issueId);
    }

    if (!issueKey) {
      entry.summary = '(課題名不明)';
      entry.issueKey = key;
      entry.currentActualHours = null;
      continue;
    }

    try {
      var issue = backlogApiGet_(
        config.baseUrl + '/api/v2/issues/' + encodeURIComponent(issueKey)
        + '?apiKey=' + encodeURIComponent(config.apiKey)
      );
      entry.summary = issue.summary || '(課題名不明)';
      entry.issueKey = issue.issueKey || issueKey;
      entry.currentActualHours = issue.actualHours;
      fetchedCount++;
    } catch (e) {
      Logger.log('BACKLOG_ISSUE_FETCH_FAILED: issueKey=' + issueKey + ' error=' + e.message);
      entry.summary = '(課題名不明)';
      entry.issueKey = issueKey;
      entry.currentActualHours = null;
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
 * @param {Object} issueMap - fetchIssueDetails_ 後のissueMap
 * @returns {string} 日報テキスト
 */
function formatBacklogReport_(config, issueMap) {
  var keys = Object.keys(issueMap);
  var lines = [];
  var totalHours = 0;

  for (var i = 0; i < keys.length; i++) {
    var entry = issueMap[keys[i]];

    // 最終 todayAddedHours が 0以下 または 表示変換後に 0分 なら除外
    if (entry.totalDiff <= 0) continue;
    var formattedDiff = backlogFormatHours_(entry.totalDiff);
    if (!formattedDiff) continue;

    totalHours += entry.totalDiff;

    var issueUrl = config.baseUrl + '/view/' + entry.issueKey;
    var line = '- ' + entry.issueKey + ' ' + entry.summary + ' (' + formattedDiff + ')';

    // 現在の累計実績時間（有効時のみ）
    if (config.enableCurrentActualHours && entry.currentActualHours !== null && entry.currentActualHours !== undefined) {
      var currentFormatted = backlogFormatHours_(entry.currentActualHours);
      if (currentFormatted) {
        line += ' [累計: ' + currentFormatted + ']';
      }
    }

    line += '\n  ' + issueUrl;
    lines.push(line);
  }

  if (lines.length === 0) {
    return 'Backlog作業実績\n本日の実績時間更新はありません';
  }

  var totalFormatted = backlogFormatHours_(totalHours);
  var header = 'Backlog作業実績';
  var footer = '合計: ' + (totalFormatted || '0分');

  return header + '\n' + lines.join('\n') + '\n' + footer;
}

// ============================================
// 公開関数
// ============================================

/**
 * Backlog作業実績レポートを生成する
 *
 * 既存の日報生成メイン関数から呼び出す。
 * 接続候補:
 * - getAllToolHistoryV3() 内で他ツール（Slack/Gmail/Notion）と同様に呼び出す
 * - sendToSlackV2() の todayTasks にBacklog実績を追加する
 * - Index.html のフロントエンドから google.script.run.getBacklogReport() で呼び出す
 *
 * @returns {string} Backlog作業実績テキスト
 */
function getBacklogReport() {
  try {
    var config = getBacklogConfig_();
    var myself = getBacklogMyself_(config);
    var activities = getBacklogTodayActivities_(config, myself.id);

    Logger.log('Backlog: 本日のアクティビティ取得完了 count=' + activities.length);

    // actualHours change の抽出
    var changes = extractActualHoursChanges_(activities, config.actualHoursField);
    Logger.log('Backlog: actualHours変更件数=' + changes.length);

    if (changes.length === 0) {
      return 'Backlog作業実績\n本日の実績時間更新はありません';
    }

    // 差分集計（created昇順ソート → 課題ごと集計 → マイナス修正反映）
    var issueMap = aggregateByIssue_(changes);

    // issue詳細取得（issueKey / summary / currentActualHours 補完）
    issueMap = fetchIssueDetails_(config, issueMap);

    // 表示整形
    return formatBacklogReport_(config, issueMap);

  } catch (err) {
    Logger.log('getBacklogReport error: ' + String(err));

    // エラー観測基盤に記録（既存のrecordError_が利用可能な場合）
    try {
      if (typeof recordError_ === 'function') {
        recordError_(err, { component: 'gas-server', action: 'getBacklogReport' });
      }
    } catch (ignore) {}

    var msg = String(err);
    if (msg.indexOf('429') >= 0 || msg.indexOf('RATE_LIMIT') >= 0) {
      return 'Backlog作業実績\nBacklog取得エラー（レート制限）';
    }
    return 'Backlog作業実績\nBacklog取得エラー';
  }
}
