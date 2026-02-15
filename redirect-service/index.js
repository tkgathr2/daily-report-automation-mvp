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
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%2300a0e9'/%3E%3Crect x='7' y='5' width='14' height='22' rx='2' fill='white'/%3E%3Cline x1='10' y1='10' x2='18' y2='10' stroke='%23ccc' stroke-width='1.2'/%3E%3Cline x1='10' y1='13.5' x2='18' y2='13.5' stroke='%23ccc' stroke-width='1.2'/%3E%3Cline x1='10' y1='17' x2='16' y2='17' stroke='%23ccc' stroke-width='1.2'/%3E%3Cg transform='translate(16,10) rotate(45)'%3E%3Crect x='-1.5' y='-10' width='3' height='14' rx='0.5' fill='%23FFB74D'/%3E%3Cpolygon points='-1.5,4 1.5,4 0,7' fill='%23FFB74D'/%3E%3Crect x='-1.5' y='-10' width='3' height='3' rx='0.5' fill='%23E57373'/%3E%3C/g%3E%3C/svg%3E">
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
      <svg viewBox="0 0 30 30">
        <g fill="#333">
          <path d="M26.3,15a11.31,11.31,0,0,0-5.14-9.47v.77a10.65,10.65,0,0,1-4.82,19.27V24.15H13.66v1.42A10.65,10.65,0,0,1,8.84,6.3V5.53a11.3,11.3,0,0,0,4.78,20.69l0,0v4h2.68V26.15l0,0A11.32,11.32,0,0,0,26.3,15Z"/>
          <path d="M21.16,1.33V4.15a12.44,12.44,0,0,1-3.78,23l2.1,2.1a15,15,0,0,0,1.68-28Z"/>
          <path d="M2.55,15A12.42,12.42,0,0,1,8.84,4.15V1.33a15,15,0,0,0,1.68,28l2.1-2.1A12.45,12.45,0,0,1,2.55,15Z"/>
          <path d="M12.92,10.51a.61.61,0,0,0-.61.61v3a.6.6,0,0,0,.61.6h4.16a.6.6,0,0,0,.61-.6v-3a.61.61,0,0,0-.61-.61Zm3.31,3.13H13.77v-2.06h2.46Z"/>
          <path d="M10.53,14.88H11a.6.6,0,0,0,.6-.6V9.84h6.72v4.44a.6.6,0,0,0,.6.6h.51a.6.6,0,0,0,.61-.6V9.37a.6.6,0,0,0-.61-.6H18.25V2.51h1.22c.34,0,.61-.4.61-.74V1.26c0-.33-.27-.47-.61-.47H15.86V-.25a.6.6,0,0,0-.6-.6h-.52a.6.6,0,0,0-.6.6v1H10.53a.6.6,0,0,0-.61.6v.52a.6.6,0,0,0,.61.6h1.22V8.77H10.53a.6.6,0,0,0-.61.6v4.91A.6.6,0,0,0,10.53,14.88Zm6-6.11H13.47V7.4h3.06Zm0-2.44H13.47V4.96h3.06Zm0-3.82V3.88H13.47V2.51Z"/>
        </g>
      </svg>
    </div>
    <h1>簡単日報くん</h1>
    <p class="description">ログインしてください</p>
    <a href="${TARGET_URL}?from=nippou" class="login-btn">
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
      const separator = queryString ? '&' : '?';
      const redirectUrl = TARGET_URL + '?from=nippou' + separator.replace('?', '&') + queryString.replace('?', '');
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
    // クエリパラメータをそのままGASに転送（from=nippouは不要、OAuthコールバックはcode付き）
    const queryString = parsedUrl.search || '';
    const redirectUrl = TARGET_URL + queryString;
    console.log('OAuth callback received, redirecting to:', redirectUrl);
    res.writeHead(302, {
      'Location': redirectUrl
    });
    res.end();
  }
  else if (pathname === '/favicon.ico') {
    const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#00a0e9"/><rect x="7" y="5" width="14" height="22" rx="2" fill="white"/><line x1="10" y1="10" x2="18" y2="10" stroke="#ccc" stroke-width="1.2"/><line x1="10" y1="13.5" x2="18" y2="13.5" stroke="#ccc" stroke-width="1.2"/><line x1="10" y1="17" x2="16" y2="17" stroke="#ccc" stroke-width="1.2"/><g transform="translate(16,10) rotate(45)"><rect x="-1.5" y="-10" width="3" height="14" rx="0.5" fill="#FFB74D"/><polygon points="-1.5,4 1.5,4 0,7" fill="#FFB74D"/><rect x="-1.5" y="-10" width="3" height="3" rx="0.5" fill="#E57373"/></g></svg>`;
    res.writeHead(200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400'
    });
    res.end(svgFavicon);
  }
  else {
    res.writeHead(302, {
      'Location': TARGET_URL + '?from=nippou'
    });
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Redirect server running on port ${PORT}`);
});
