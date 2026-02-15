const http = require('http');
const url = require('url');

const TARGET_URL = process.env.TARGET_URL || 'https://script.google.com/a/macros/takagi.bz/s/AKfycbyRu1Sye5cpmXqoqfGOI2BBReFh4cvqhkSr9CW7JS2XyhY7q32tv3A5gLG5rGwNtO5a4Q/exec';

// OAuth Proxy: 固定のredirect_uriを使用してSlack OAuthを処理
// これにより、どのドメインのユーザーでも同じredirect_uriを使用できる
const OAUTH_CALLBACK_PATH = '/oauth/callback';

const loginPageHTML = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>簡単日報くん - ログイン</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='45' fill='%2300a0e9'/%3E%3Ctext x='50' y='62' text-anchor='middle' font-size='40' font-weight='bold' fill='white' font-family='sans-serif'%3E%E9%AB%99%3C/text%3E%3C/svg%3E">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: linear-gradient(180deg, #00bfff 0%, #87ceeb 50%, #e0f7ff 100%);
    }
    .login-card {
      background: white;
      border-radius: 20px;
      padding: 40px 30px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      text-align: center;
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
      font-size: 22px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #00a0e9;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 16px;
    }
    .description {
      color: #666;
      font-size: 14px;
      margin-bottom: 24px;
    }
    .login-btn {
      width: 100%;
      padding: 14px 20px;
      background: white;
      color: #00a0e9;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      transition: background-color 0.2s, border-color 0.2s;
      text-decoration: none;
    }
    .login-btn:hover {
      background-color: #f5f5f5;
      border-color: #00a0e9;
    }
    .google-icon {
      width: 20px;
      height: 20px;
    }
  </style>
</head>
<body>
  <div class="login-card">
    <div class="logo">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#333" stroke-width="3"/>
        <text x="50" y="58" text-anchor="middle" font-size="32" font-weight="bold" fill="#333">髙</text>
        <line x1="50" y1="5" x2="50" y2="15" stroke="#333" stroke-width="3"/>
        <line x1="50" y1="85" x2="50" y2="95" stroke="#333" stroke-width="3"/>
      </svg>
    </div>
    <h1>簡単日報くん</h1>
    <p class="description">ログインしてください</p>
    <a href="${TARGET_URL}" class="login-btn">
      <svg class="google-icon" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Googleでログイン
    </a>
  </div>
</body>
</html>
`;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // ルートパスの場合
  if (pathname === '/' || pathname === '') {
    const queryString = parsedUrl.search || '';
    if (queryString) {
      const redirectUrl = TARGET_URL + queryString;
      console.log('Root with query params, redirecting to:', redirectUrl);
      res.writeHead(302, { 'Location': redirectUrl });
      res.end();
    } else {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      res.end(loginPageHTML);
    }
  } 
  // OAuth コールバック: SlackからのOAuthコールバックをGASにリダイレクト
  else if (pathname === OAUTH_CALLBACK_PATH) {
    // クエリパラメータをそのままGASに転送
    const queryString = parsedUrl.search || '';
    const redirectUrl = TARGET_URL + queryString;
    console.log('OAuth callback received, redirecting to:', redirectUrl);
    res.writeHead(302, {
      'Location': redirectUrl
    });
    res.end();
  }
  else if (pathname === '/favicon.ico') {
    const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#00a0e9"/><text x="50" y="62" text-anchor="middle" font-size="40" font-weight="bold" fill="white" font-family="sans-serif">髙</text></svg>`;
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400'
    });
    res.end(svgFavicon);
  }
  else {
    res.writeHead(302, {
      'Location': TARGET_URL
    });
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Redirect server running on port ${PORT}`);
});
