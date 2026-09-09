// ===== 铠甲虾代理（Zeabur Web Service 版） =====
const http = require('http');
const https = require('https');
const url = require('url');

const VALID_TOKEN = 'kajiaxia2026';

const server = http.createServer(async (req, res) => {
  // ----- CORS 预检 -----
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Auth-Token',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  // ----- Token 鉴权 -----
  const userToken = req.headers['x-auth-token'];
  if (userToken !== VALID_TOKEN) {
    res.writeHead(401, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ error: 'Unauthorized: Invalid or missing token' }));
    return;
  }

  // ----- 只允许 /user/ 路径 -----
  if (!path.startsWith('/user/')) {
    res.writeHead(404, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ error: 'Not Found' }));
    return;
  }

  // ----- 提取用户的 API Key -----
  const authHeader = req.headers['authorization'];
  const userApiKey = authHeader?.replace('Bearer ', '');
  if (!userApiKey) {
    res.writeHead(401, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ error: 'Missing API Key' }));
    return;
  }

  // ----- 转发到 5sim -----
  const targetUrl = `https://5sim.net/v1${path}`;
  
  // 收集请求体
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    const options = {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${userApiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    };

    const proxyReq = https.request(targetUrl, options, (proxyRes) => {
      let data = '';
      proxyRes.on('data', chunk => { data += chunk; });
      proxyRes.on('end', () => {
        const isJson = data.startsWith('{') || data.startsWith('[');
        res.writeHead(proxyRes.statusCode, {
          'Content-Type': isJson ? 'application/json' : 'text/plain',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(data);
      });
    });

    proxyReq.on('error', (e) => {
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ error: 'Proxy error: ' + e.message }));
    });

    if (req.method !== 'GET' && req.method !== 'HEAD' && body) {
      proxyReq.write(body);
    }
    proxyReq.end();
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`✅ 代理服务已启动，端口: ${PORT}`);
});