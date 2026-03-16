/**
 * backlog_phase0_check.gs
 *
 * フェーズ0検証スクリプト
 * 目的:
 * - users/myself を取得して userId を確認
 * - activities を取得して actualHours 更新時の changes を確認
 * - field名・activityTypeId・old_value/new_value の形式を確定する
 *
 * 使い方:
 * 1. GASエディタにこのファイルを追加
 * 2. ScriptProperties に BACKLOG_SPACE_BASE_URL と BACKLOG_API_KEY を設定
 * 3. backlogPhase0Check() を実行
 * 4. ログ出力を確認し、検証記録を記入する
 *
 * @version 1.0
 */

/**
 * フェーズ0検証メイン関数
 * 実行すると以下をログ出力する:
 * - myself情報（userId, name）
 * - activities一覧（簡略化）
 * - actualHours関連のchangesのみ抽出した詳細
 */
function backlogPhase0Check() {
  var props = PropertiesService.getScriptProperties();
  var baseUrl = props.getProperty('BACKLOG_SPACE_BASE_URL');
  var apiKey = props.getProperty('BACKLOG_API_KEY');
  var activityTypesCsv = props.getProperty('BACKLOG_ACTIVITY_TYPES') || '2,3,14';
  var fetchCount = Number(props.getProperty('BACKLOG_ACTIVITY_FETCH_COUNT') || '20');

  if (!baseUrl || !apiKey) {
    throw new Error('BACKLOG_SPACE_BASE_URL または BACKLOG_API_KEY が未設定です');
  }

  // --- Step 1: users/myself ---
  Logger.log('=== Step 1: users/myself ===');
  var myself = backlogPhase0ApiGet_(
    baseUrl + '/api/v2/users/myself?apiKey=' + encodeURIComponent(apiKey)
  );
  Logger.log('userId=' + myself.id);
  Logger.log('userName=' + myself.name);
  Logger.log('mailAddress=' + myself.mailAddress);

  // --- Step 2: activities 取得 ---
  Logger.log('=== Step 2: activities 取得 ===');
  var activityTypes = activityTypesCsv.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  var query = activityTypes.map(function(v) { return 'activityTypeId[]=' + encodeURIComponent(v); }).join('&');
  var activitiesUrl = baseUrl + '/api/v2/users/' + myself.id + '/activities'
    + '?apiKey=' + encodeURIComponent(apiKey)
    + '&count=' + fetchCount
    + '&order=desc'
    + '&' + query;

  var activities = backlogPhase0ApiGet_(activitiesUrl);
  Logger.log('取得件数=' + activities.length);

  // --- Step 3: 全activities簡略ログ ---
  Logger.log('=== Step 3: activities 簡略一覧 ===');
  var simplified = activities.map(function(a) {
    return {
      id: a.id,
      type: a.type,
      created: a.created,
      project: a.project ? a.project.projectKey : null,
      issueKeyId: a.content && a.content.key_id ? a.content.key_id : null,
      summary: a.content && a.content.summary ? a.content.summary : null,
      changesCount: a.content && a.content.changes ? a.content.changes.length : 0,
      changes: a.content && a.content.changes ? a.content.changes : []
    };
  });
  Logger.log(JSON.stringify(simplified, null, 2));

  // --- Step 4: actualHours関連のchangesのみ抽出 ---
  Logger.log('=== Step 4: actualHours 関連 changes 詳細 ===');
  var actualHoursChanges = [];
  activities.forEach(function(a) {
    if (!a.content || !a.content.changes) return;
    a.content.changes.forEach(function(change) {
      // field名を確認するため、全changesのfield名をログ出力
      // actualHours / actual_hours / 実績時間 などの可能性がある
      var fieldLower = (change.field || '').toLowerCase();
      if (fieldLower.indexOf('actual') >= 0 || fieldLower.indexOf('hour') >= 0 || fieldLower.indexOf('実績') >= 0) {
        actualHoursChanges.push({
          activityId: a.id,
          activityType: a.type,
          created: a.created,
          issueKeyId: a.content.key_id,
          summary: a.content.summary,
          field: change.field,
          old_value: change.old_value,
          new_value: change.new_value,
          type: change.type
        });
      }
    });
  });

  if (actualHoursChanges.length > 0) {
    Logger.log('actualHours関連のchanges: ' + actualHoursChanges.length + '件');
    Logger.log(JSON.stringify(actualHoursChanges, null, 2));
  } else {
    Logger.log('actualHours関連のchangesが見つかりません。');
    Logger.log('全changesのfield名一覧を出力します:');
    var allFields = [];
    activities.forEach(function(a) {
      if (!a.content || !a.content.changes) return;
      a.content.changes.forEach(function(change) {
        if (allFields.indexOf(change.field) < 0) {
          allFields.push(change.field);
        }
      });
    });
    Logger.log('field名一覧: ' + JSON.stringify(allFields));
  }

  // --- Step 5: rateLimit確認（任意） ---
  Logger.log('=== Step 5: rateLimit 確認 ===');
  try {
    var rateLimit = backlogPhase0ApiGet_(
      baseUrl + '/api/v2/rateLimit?apiKey=' + encodeURIComponent(apiKey)
    );
    Logger.log('rateLimit=' + JSON.stringify(rateLimit, null, 2));
  } catch (e) {
    Logger.log('rateLimit取得スキップ: ' + e.message);
  }

  Logger.log('=== フェーズ0検証完了 ===');
}

/**
 * Backlog API GETリクエスト（検証用）
 * @param {string} url - リクエストURL
 * @returns {Object|Array} パース済みレスポンス
 */
function backlogPhase0ApiGet_(url) {
  var res = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: { Accept: 'application/json' }
  });

  var code = res.getResponseCode();
  var text = res.getContentText();

  if (code === 429) {
    Logger.log('BACKLOG_RATE_LIMIT_EXCEEDED: status=429');
    throw new Error('RATE_LIMIT_429: ' + text);
  }

  if (code >= 200 && code < 300) {
    return JSON.parse(text);
  }

  throw new Error('Backlog API error: status=' + code + ' body=' + text);
}
