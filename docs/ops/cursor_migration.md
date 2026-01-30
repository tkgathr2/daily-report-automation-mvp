# Cursor移行ガイド

## 基本方針

- リポジトリの正は GitHub master
- ローカルは作業コピーであり、必ず push して GitHub に反映する

## Cursorで開くフォルダ

```
C:\Users\takag\00_dev\daily-report-automation-mvp
```

## 最初に確認するファイル

- docs/plan.md（全体計画）
- docs/backlog.md（残タスク）
- docs/specs/（各機能仕様）

## 役割分担

| 担当 | 作業内容 |
|------|----------|
| Cursor | 要件定義、仕様作成、ドキュメント整備 |
| Devin | 実装、テスト、PR作成 |
| GAS直編集 | 原則禁止（緊急時のみ） |

## ルール

- 1タスク = 1PR
- 仕様外の実装は禁止
- PR前に仕様を確定させる

## 日常フロー

1. 仕様を作成または更新する
2. git add . → commit → push
3. Devinに1PR単位で実装を依頼
4. PRをレビューする
5. 問題なければmerge

## トラブル時の確認順

1. git status（変更状態）
2. git branch（現在ブランチ）
3. git pull origin master（最新化）
4. git diff（差分確認）
