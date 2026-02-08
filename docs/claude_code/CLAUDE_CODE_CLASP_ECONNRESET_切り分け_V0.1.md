# Claude Code への指示：clasp push ECONNRESET 切り分け V0.1

## これは Claude Code への指示です。

---

## 目的

`clasp push` 実行時の `Unable to connect to API (ECONNRESET)` を、**推測せず**に切り分けて解消し、`clasp push`→`clasp deploy` を再開できる状態にする。

---

## 前提

- 作業ディレクトリ：`C:\Users\takag\00_dev\daily-report-automation-mvp`
- `.clasp.json` が存在する

---

## 注意（認証コード等）

この工程では認証のためのコード/トークン等が表示される可能性があります。  
それらはシークレット同等として扱い、**チャット・md・ログに貼らない**でください。

---

## 手順（V0.1）

### 0) いま動いている clasp を止める

1. `clasp push` がリトライ中なら `Ctrl + C` で中断する（1回だけでOK）

---

### 1) 状態・バージョンを採取（ログ用）

```powershell
cd C:\Users\takag\00_dev\daily-report-automation-mvp
git status
type .clasp.json
clasp -v
clasp status
```

---

### 2) ネットワーク/名前解決/443疎通を確認

```powershell
Resolve-DnsName googleapis.com
Resolve-DnsName script.google.com
Test-NetConnection googleapis.com -Port 443
Test-NetConnection script.google.com -Port 443
```

追加でHTTP疎通：

```powershell
try { Invoke-WebRequest https://www.googleapis.com/discovery/v1/apis -UseBasicParsing -TimeoutSec 20 | Out-Null; "OK: webapis" } catch { "NG: webapis"; $_.Exception.Message }
try { Invoke-WebRequest https://script.google.com -UseBasicParsing -TimeoutSec 20 | Out-Null; "OK: script.google.com" } catch { "NG: script.google.com"; $_.Exception.Message }
```

---

### 3) プロキシ/VPNの影響を確認

```powershell
echo "HTTP_PROXY=$env:HTTP_PROXY"
echo "HTTPS_PROXY=$env:HTTPS_PROXY"
echo "NO_PROXY=$env:NO_PROXY"
```

- もしVPN/社内プロキシ配下なら、一時的にVPN切断 or 別回線で再実行を検討する（この時点では**変更せず**、事実だけ記録）

---

### 4) push を再試行（まず通常）

```powershell
cd C:\Users\takag\00_dev\daily-report-automation-mvp
clasp push
```

ここで成功したら、このファイルは終了してよい（次は `docs/claude_code/CLAUDE_CODE_V2_DEPLOY_V0.1.md` に進む）。

---

### 5) まだ ECONNRESET なら：認証状態を確認→再ログイン

1) まず `clasp login` 状態を疑う（切れた可能性がある）。

2) 再ログインを実施（ブラウザが必要になるため、コードを扱う場面は停止する）

```powershell
clasp logout
clasp login --no-localhost
```

`clasp login --no-localhost` で表示されたURLを開き、認証後に出るコードをターミナルへ貼り付ける。  
（コードはシークレット同等。**チャットに貼らない**）

ログイン完了後、再度 push：

```powershell
clasp push
```

---

## 結果報告（Claude Code → Chat）

以下だけを日本語で報告してください（シークレットは出さない）：

1. `clasp push` が **成功/失敗**
2. 失敗なら、`ECONNRESET` が出続けるかどうか
3. `Test-NetConnection` の結果（OK/NGだけ）

