#!/usr/bin/env node
'use strict';

/**
 * ThreatSpan — Local Proxy Server
 * Zero npm dependencies. Requires only Node.js (v14+).
 *
 * Usage:
 *   node server.js                 → starts server, opens browser
 *   node server.js --no-open       → starts server, no auto-open
 *   node server.js --port 8080     → custom port
 *   node server.js --help          → show help
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const { URL } = require('url');
const { exec } = require('child_process');

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  ThreatSpan — SOC investigation workspace

  Usage:
    threatspan [options]

  Options:
    --port <n>     Port to listen on (default: 3000, env PORT)
    --no-open      Don't automatically open the browser
    --version, -v  Show version
    --help, -h     Show this help
`);
  process.exit(0);
}
if (args.includes('--version') || args.includes('-v')) {
  try { console.log(require('./package.json').version); } catch { console.log('1.0.0'); }
  process.exit(0);
}

const portFlag = args.indexOf('--port');
const PORT = portFlag !== -1 && args[portFlag + 1] ? parseInt(args[portFlag + 1], 10) : (process.env.PORT || 3000);
const NO_OPEN = args.includes('--no-open') || process.env.THREATSPAN_NO_OPEN === '1';
const HTML    = path.join(__dirname, 'threatspan.html');

// Allowlist — only proxy requests to these upstream hosts
const ALLOWED = new Set([
  'www.virustotal.com',
  'api.abuseipdb.com',
  'www.ipqualityscore.com',
  'ipqualityscore.com',
  'ipwho.is',
  'cloudflare-dns.com',
  'rdap.arin.net',
  'rdap.org',
  'rdap.lacnic.net',
  'rdap.afrinic.net',
  'rdap.apnic.net',
  'rdap.ripe.net',
  'api.shodan.io',
  'api.greynoise.io',
  'sitecheck.sucuri.net',
  'urlhaus-api.abuse.ch',
  'threatfox-api.abuse.ch',
  'mb-api.abuse.ch',
  'otx.alienvault.com',
  'urlscan.io',
  'www.cisa.gov',
  'services.nvd.nist.gov',
]);

// Headers we forward to the upstream API
const FORWARD_HEADERS = new Set(['x-apikey', 'key', 'accept', 'content-type', 'authorization', 'x-otx-api-key', 'auth-key', 'api-key']);

// ── Proxy ────────────────────────────────────────────────────────────────────
function handleProxy(target, req, res) {
  let parsed;
  try { parsed = new URL(target); } catch {
    res.writeHead(400); res.end('Invalid URL'); return;
  }

  if (!ALLOWED.has(parsed.hostname)) {
    res.writeHead(403); res.end(`Host not allowed: ${parsed.hostname}`); return;
  }

  const options = {
    hostname: parsed.hostname,
    port:     443,
    path:     parsed.pathname + parsed.search,
    method:   req.method,
    headers:  { 'user-agent': 'ThreatSpan/1.0' },
  };

  for (const [k, v] of Object.entries(req.headers)) {
    if (FORWARD_HEADERS.has(k.toLowerCase())) options.headers[k] = v;
  }

  const upstream = https.request(options, (upRes) => {
    const ct = upRes.headers['content-type'] || 'application/json';
    res.writeHead(upRes.statusCode, { 'Content-Type': ct });
    upRes.pipe(res, { end: true });
  });

  upstream.on('error', (e) => {
    console.error('[proxy error]', e.message);
    if (!res.headersSent) { res.writeHead(502); res.end(`{"error":"${e.message}"}`); }
  });

  req.pipe(upstream, { end: true });
}

// ── HTTP Server ───────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // Universal CORS headers (localhost only)
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'x-apikey, key, accept, content-type, authorization, x-otx-api-key, auth-key, api-key');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // /api/proxy?url=<encoded-target>
  if (url.pathname === '/api/proxy') {
    const target = url.searchParams.get('url');
    if (!target) { res.writeHead(400); res.end('Missing ?url='); return; }
    handleProxy(target, req, res);
    return;
  }

  // Serve threatspan.html for any other path
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    try {
      const html = fs.readFileSync(HTML);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (e) {
      res.writeHead(500); res.end('Could not read threatspan.html');
    }
    return;
  }

  res.writeHead(404); res.end('Not found');
});

// ── Browser auto-open ────────────────────────────────────────────────────────
function openInBrowser(url) {
  const cmd = process.platform === 'darwin' ? `open "${url}"`
            : process.platform === 'win32'  ? `start "" "${url}"`
            : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.log(`  (Could not auto-open browser. Visit ${url} manually.)`);
  });
}

server.listen(PORT, '127.0.0.1', () => {
  const url  = `http://localhost:${PORT}`;
  const line = '─'.repeat(42);
  console.log(`\n  ┌${line}┐`);
  console.log(`  │  THREATSPAN${' '.repeat(30)}│`);
  console.log(`  └${line}┘`);
  console.log(`\n  ▶  ${url}`);
  console.log(`  ${NO_OPEN ? '(--no-open) browser not launched' : 'Opening in your default browser…'}`);
  console.log(`  Press Ctrl+C to stop\n`);
  if (!NO_OPEN) setTimeout(() => openInBrowser(url), 350);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\n  ✗ Port ${PORT} is already in use.`);
    console.error(`     Try: threatspan --port 3001    (or any free port)\n`);
  } else {
    console.error(e);
  }
  process.exit(1);
});

// Clean shutdown on Ctrl+C
process.on('SIGINT',  () => { console.log('\n  Stopping ThreatSpan…'); server.close(() => process.exit(0)); });
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
