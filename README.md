# 簡単日報くん

Googleカレンダーから今日の予定を取得し、WEBブラウザ上で表示・編集・コピー → Slack送信できるWEBアプリです。

## 機能

- 📅 Googleカレンダーから今日の予定を自動取得
- ✏️ WEBブラウザ上で予定データを編集
- 📋 クリップボードにコピー
- 💬 Slackチャンネルに投稿

## 技術スタック

- Google Apps Script (GAS)
- GAS HTMLサービス（WEBアプリ）
- Google Calendar API
- Slack Incoming Webhook

## クイックスタート

### 1. セットアップ

1. [Google Apps Script](https://script.google.com/) で新しいプロジェクトを作成
2. `Code.gs` に `src/Code.gs` の内容をコピー
3. `Index.html` ファイルを作成し、`src/Index.html` の内容をコピー
4. スクリプトプロパティに `SLACK_WEBHOOK_URL` を設定

### 2. デプロイ

1. GASエディタで「デプロイ」→「新しいデプロイ」→「ウェブアプリ」を選択
2. 設定を入力してデプロイ
3. WEBアプリのURLを取得

### 3. 使用方法

1. WEBアプリのURLにアクセス
2. 「今日の予定を取得」ボタンをクリック
3. テキストエリアで編集（任意）
4. 「コピー」ボタンでコピー、または「Slackに投稿」ボタンで送信

詳細な手順は [使用方法・デプロイ手順書](docs/USAGE.md) を参照してください。

## ドキュメント

- [要件定義書・仕様書](docs/plan.md) - 詳細な仕様と実装方針
- [使用方法・デプロイ手順書](docs/USAGE.md) - セットアップと使用方法
- [プロジェクト情報](docs/project_info.md) - プロジェクトの基本情報

## プロジェクト構成

```
nippou/
├── src/
│   ├── Code.gs          # GASバックエンドコード
│   └── Index.html       # WEBアプリフロントエンド
├── docs/
│   ├── plan.md          # 要件定義書・仕様書
│   ├── USAGE.md         # 使用方法・デプロイ手順書
│   └── project_info.md  # プロジェクト情報
└── README.md            # このファイル
```

## 要件

- Googleアカウント
- Googleカレンダーへのアクセス権限
- Slackワークスペース（Incoming Webhook使用）
- モダンブラウザ（Chrome、Firefox、Safari、Edge等）

## ライセンス

このプロジェクトは個人利用を想定しています。

## 作成日

2026-01-11

## バージョン

2.0（WEBアプリ版）
