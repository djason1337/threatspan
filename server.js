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

const http   = require('http');
const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const os     = require('os');
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
const HTML        = path.join(__dirname, 'threatspan.html');
const KEYS_FILE   = path.join(__dirname, 'keys.json');
const SECRET_FILE = path.join(os.homedir(), '.threatspan_key');

// ── Encryption (AES-256-GCM) ─────────────────────────────────────────────────
// Secret key lives in ~/.threatspan_key (outside project, chmod 600).
// keys.json on its own is useless without it.
function loadOrCreateSecret() {
  try {
    return Buffer.from(fs.readFileSync(SECRET_FILE, 'utf8').trim(), 'hex');
  } catch {
    const key = crypto.randomBytes(32);
    fs.writeFileSync(SECRET_FILE, key.toString('hex') + '\n', { mode: 0o600 });
    console.log(`  ✦  Encryption key created at ${SECRET_FILE}`);
    return key;
  }
}
const SECRET = loadOrCreateSecret();

function encryptKeys(obj) {
  const iv      = crypto.randomBytes(12);
  const cipher  = crypto.createCipheriv('aes-256-gcm', SECRET, iv);
  const enc     = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()]);
  return JSON.stringify({ v:1, iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), data: enc.toString('hex') });
}

function decryptKeys(raw) {
  const { iv, tag, data } = JSON.parse(raw);
  const decipher = crypto.createDecipheriv('aes-256-gcm', SECRET, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]).toString('utf8'));
}

function readKeys() {
  try {
    const raw    = fs.readFileSync(KEYS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.v) {
      // Migrate legacy plaintext keys.json → encrypted on next write
      writeKeys(parsed);
      return parsed;
    }
    return decryptKeys(raw);
  } catch { return {}; }
}

function writeKeys(obj) {
  fs.writeFileSync(KEYS_FILE, encryptKeys(obj), 'utf8');
}

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

  // GET /api/keys — load persisted keys from disk
  if (url.pathname === '/api/keys' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(readKeys()));
    return;
  }

  // POST /api/keys — save keys to disk
  if (url.pathname === '/api/keys' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const obj = JSON.parse(body);
        if (typeof obj !== 'object' || Array.isArray(obj)) throw new Error('expected object');
        writeKeys(obj);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      } catch (e) {
        res.writeHead(400); res.end(`{"error":"${e.message}"}`);
      }
    });
    return;
  }

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
