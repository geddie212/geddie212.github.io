const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.svg':'image/svg+xml'};
http.createServer((req,res) => {
  let decoded;
  try { decoded = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400);res.end();return; }
  const target = path.resolve(root, '.' + (decoded.endsWith('/') ? decoded + 'index.html' : decoded));
  if (!target.startsWith(root + path.sep) || decoded.split('/').some(p => p.startsWith('.'))) {res.writeHead(403);res.end();return;}
  fs.readFile(target, (err,data) => {if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);});
}).listen(4173,'127.0.0.1',()=>console.log('Portfolio: http://127.0.0.1:4173'));
