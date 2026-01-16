# チェックポイント（実装手順）

> **注意**: このドキュメントは現在のWEBアプリ版（v2.0）の実装手順です。

## CP-01: GASプロジェクトの初期設定

- [x] Google Apps Scriptで新規プロジェクト作成
- [x] Code.gsファイルにバックエンドコードを配置
- [x] Index.htmlファイルにフロントエンドコードを配置

## CP-02: Slack App設定（OAuth）

- [x] Slack APIでAppを作成
- [x] OAuth & PermissionsでRedirect URLを設定
- [x] User Token Scopesに`chat:write`を追加
- [x] Client IDとClient Secretを取得

## CP-03: スクリプトプロパティ設定

- [x] `SLACK_CLIENT_ID`を設定
- [x] `SLACK_CLIENT_SECRET`を設定
- [x] `SLACK_CHANNEL_ID`を設定

## CP-04: WEBアプリデプロイ

- [x] 「デプロイ」→「新しいデプロイ」→「ウェブアプリ」
- [x] 実行ユーザー：自分
- [x] アクセス権限を設定
- [x] デプロイURLを取得

## CP-05: 動作確認

- [x] 画面表示：WEBアプリが正常に表示される
- [x] 予定取得：Googleカレンダーから今日の予定を取得できる
- [x] 編集：テキストエリアで編集できる
- [x] コピー：クリップボードにコピーできる
- [x] Slack連携：OAuth認可フローが動作する
- [x] Slack投稿：ユーザーとしてSlackに投稿できる
