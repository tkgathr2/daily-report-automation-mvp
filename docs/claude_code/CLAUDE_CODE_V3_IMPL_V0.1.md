# Claude Code への指示：V3 実装（段階実行）

**バージョン**: V0.1
**作成日**: 2026-02-08

---

## これは Claude Code への指示です。

---

## SSOT

- 唯一仕様書: `docs/plan.md` 27章（V3仕様）
- V2仕様（26章）を壊さないこと

---

## SEC-01（シークレット注意）

この工程ではシークレット情報が必要になる可能性があります。SEC-01 で停止します。

- **Notion Integration Token**: Script Properties `NOTION_INTEGRATION_TOKEN` → 手動投入
- **Slack追加スコープ（`search:read`）**: Slack App管理画面で追加 → ユーザー再認可

シークレット値はチャット・md・ログに残さないこと。

---

## 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/Index.html` | 日付指定UI復活、ツール設定UI（Slack/Gmail/Gmail受信/Notion）、履歴グループ表示、Slack連携ボタン復活 |
| `src/Code.gs` | Slackスコープ追加、履歴取得関数（Slack/Gmail/Notion）、ツール設定関数、統合取得関数 |

---

## 段階実行手順

### V0.1: 日付指定UIの復活

**目的**: カレンダー予定を指定日で取得できるようにする

**手順**:
1. `src/Index.html` の「日付選択・予定取得セクション（MVP版では非表示）」コメントを解除する（1392〜1414行付近）
2. `loadEventsForSelectedDate()` 関数を復活（現在コメント内で参照されている）
3. `initCalendarDatePicker()` を復活し、`window.load` 内で呼び出す
4. `loadCalendarEvents()` は **当日の自動取得用**として残す（初期表示で自動反映）
5. 日付指定UIで日付を変えた場合は `getEventsForDate(dateString)` をカレンダーのみで呼ぶ
6. **「今日の予定を取得」ボタン**は「予定を取得」ボタンに文言変更（指定日の予定を取得するため）

**完了条件**:
- 日付ピッカー（年/月/日セレクト）が表示される
- 前日/翌日ボタンが機能する
- 指定日のカレンダー予定が「今日やったこと」に反映される
- 初期表示は当日の予定が自動反映される

---

### V0.2: Slack OAuthスコープ追加

**目的**: Slack履歴取得に必要な `search:read` スコープを追加する

**手順**:
1. `src/Code.gs` の `getSlackAuthorizeUrl()` 内の `user_scope` を `'chat:write,search:read'` に変更（現在は `'chat:write'` のみ）
2. `src/Index.html` にSlack連携（認可）ボタンを **復活**させる（V2で撤去した箇所）
   - ただし、表示条件は「Slack履歴取得がON」かつ「未認可」の場合のみ
3. Slack連携状態チェック関数（`refreshSlackLinkStatus` 等）を復活させる

**SEC-01停止点**: Slack App管理画面でUser Token Scopesに `search:read` を追加する作業はユーザー手動。

**完了条件**:
- `getSlackAuthorizeUrl()` が `chat:write,search:read` を含むURLを生成する
- Slack連携ボタンがUIに表示される
- 認可フローが正常に動作する（再認可でスコープ追加）

---

### V0.3: Slack履歴取得関数＋画面反映

**目的**: Slack投稿・DM件名を自動取得して表示する

**手順**:
1. `src/Code.gs` に `getSlackHistory()` 関数を追加（`docs/specs/V3_plan.md` 2.3節を参考、ただし `MAX_ITEMS_PER_TOOL = 50` に変更）
2. DM表示: チャンネル名が取得できない場合は「DM」と表示。メッセージは30文字に短縮
3. `src/Index.html` で取得結果を「今日やったこと」内にグループ表示

**表示形式**:
```
⚫︎ [Slack] #general: 「会議の件、了解しました」
⚫︎ [Slack] DM: 「資料の件ですが...」
```

**完了条件**:
- Slack履歴が「今日やったこと」に表示される
- DM件名は30文字に短縮され、全文は表示されない
- 最大50件に制限される
- Slack未連携の場合、エラーメッセージが表示され他は正常動作

---

### V0.4: Gmail履歴取得関数＋画面反映

**目的**: 送信メール件名を自動取得して表示する

**手順**:
1. `src/Code.gs` に `getGmailHistory()` 関数を追加（`docs/specs/V3_plan.md` 2.4節を参考、ただし `MAX_ITEMS_PER_TOOL = 50`）
2. **デフォルトは送信メールのみ**（受信はツール設定の `gmailReceived` がtrueの場合のみ取得）
3. `src/Index.html` で取得結果を「今日やったこと」内にグループ表示（Slackの後）

**表示形式**:
```
⚫︎ [Gmail] 送信: 「〇〇様 見積書送付の件」
⚫︎ [Gmail] 受信(△△株式会社): 「お問い合わせの件」
```

**完了条件**:
- Gmail送信履歴が「今日やったこと」に表示される
- 受信メールはデフォルトOFF（設定でON可能）
- 最大50件に制限される
- GmailApp権限エラー時、エラーメッセージが表示され他は正常動作

---

### V0.5: Notion履歴取得関数＋画面反映

**目的**: Notion編集/作成ページを自動取得して表示する

**手順**:
1. `src/Code.gs` に `getNotionHistory()` 関数を追加（`docs/specs/V3_plan.md` 2.5節を参考、ただし `MAX_ITEMS_PER_TOOL = 50`）
2. `src/Index.html` で取得結果を「今日やったこと」内にグループ表示（Gmailの後）

**SEC-01停止点**: `NOTION_INTEGRATION_TOKEN` が未設定の場合、エラーメッセージ表示で停止（他ツールは動作）。

**表示形式**:
```
⚫︎ [Notion] 編集: 「プロジェクトA 議事録」
⚫︎ [Notion] 作成: 「週次レポート 2/8」
```

**完了条件**:
- Notion履歴が「今日やったこと」に表示される
- Token未設定時、「Notion連携が設定されていません。」と表示され他は正常動作
- 最大50件に制限される

---

### V0.6: ツールON/OFF設定UI＋保存＋反映

**目的**: 各ツールのON/OFFを個別設定できるUIを追加する

**手順**:
1. `src/Index.html` にチェックボックスUI（Slack / Gmail / Gmail受信 / Notion）を追加
2. 「設定を保存」ボタンで `saveToolSettings()` を呼び出し、UserPropertiesに保存
3. 保存形式: `{"slack": true, "gmail": true, "gmailReceived": false, "notion": true}`
4. 画面読み込み時に `getToolSettings()` で設定を復元
5. 既存の settingGmail / settingNotion チェックボックスがある場合は再利用・拡張

**完了条件**:
- 4つのチェックボックス（Slack/Gmail/Gmail受信/Notion）が表示される
- 設定保存→リロード後も設定が維持される
- OFFにしたツールの履歴は取得されない

---

### V0.7: 統合取得関数＋グループ表示

**目的**: 全ツールの履歴を一括取得し、グループ順で表示する

**手順**:
1. `src/Code.gs` に `getAllToolHistoryV3(dateString)` 関数を追加（`docs/specs/V3_plan.md` 2.6節を参考）
   - `dateString` はカレンダーのみに使用（Slack/Gmail/Notionは常にnull=今日）
   - ツール設定に基づいてON/OFFを制御
   - `gmailReceived` 設定をGmail取得関数に渡す
2. `src/Index.html` で「今日やったこと」の表示を統合関数の結果に切り替え
3. 表示順: カレンダー→Slack→Gmail→Notion（各グループ内は時刻昇順）

**完了条件**:
- 全ツールの履歴がグループ順で表示される
- カレンダーは日付指定日、他ツールは今日のデータ
- ツールOFF設定が反映される

---

### V0.8: エラーハンドリング（独立動作）

**目的**: 1ツール失敗時に他ツールが正常動作することを保証する

**手順**:
1. `getAllToolHistoryV3()` 内で各ツール取得を `try-catch` で囲む（既にV3_plan.mdに記載あり）
2. エラー発生時はそのツールのセクションに「[ツール名] 取得エラー: メッセージ」を表示
3. 他ツールの取得・表示は継続
4. 全ツール取得合計のタイムアウト: 各ツール5秒以内を想定（GAS実行時間6分制限の範囲内）

**完了条件**:
- Slack未認可でもGmail/Notion/カレンダーが正常動作する
- Notion Token未設定でもSlack/Gmail/カレンダーが正常動作する
- Gmail権限エラーでもSlack/Notion/カレンダーが正常動作する

---

### V0.9: 動作確認チェックリスト

以下をすべて確認し、結果を報告すること。

| No | 確認項目 | 期待結果 |
|----|----------|----------|
| 1 | 日付指定UIが表示される | 年/月/日セレクト＋前日/翌日ボタンが見える |
| 2 | 指定日のカレンダー予定が取得できる | 過去/未来の日付でカレンダー予定が変わる |
| 3 | Slack連携ボタンが表示される | 「Slack連携（認可）」ボタンが見える |
| 4 | Slack履歴が表示される（連携済みの場合） | `⚫︎ [Slack] #...` 形式で表示 |
| 5 | Gmail履歴（送信）が表示される | `⚫︎ [Gmail] 送信: ...` 形式で表示 |
| 6 | Notion履歴が表示される（Token設定済みの場合） | `⚫︎ [Notion] 編集/作成: ...` 形式で表示 |
| 7 | 表示順がカレンダー→Slack→Gmail→Notion | グループ順で表示 |
| 8 | ツールON/OFF設定が保存・反映される | OFFにしたツールの履歴が非表示 |
| 9 | 1ツールエラーで他が正常動作 | Notion Token未設定でもカレンダー/Gmail表示 |
| 10 | V2機能が正常動作 | テンプレ/バリデーション/引き継ぎ/Webhook送信/コピー |
| 11 | Slack DMは件名30文字のみ | 全文は表示されない |
| 12 | 日付指定でカレンダーのみ変わる | Slack/Gmail/Notionは常に今日 |

---

## 更新履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| V0.1 | 2026-02-08 | V3実装指示（段階実行V0.1〜V0.9）初版作成 |
