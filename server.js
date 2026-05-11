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
 *
 * Security model (see SECURITY.md):
 *   - Bound to 127.0.0.1 only
 *   - Strict same-origin: no `*` CORS, Origin/Host validated
 *   - Per-boot session token required on /api/* (CSRF defense)
 *   - SSRF defense: DNS resolved + private/loopback addresses rejected
 *   - Token-bucket rate limit per upstream host
 *   - Per-request timeouts on upstream
 */

const http   = require('http');
const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const os     = require('os');
const dns    = require('dns').promises;
const { URL } = require('url');
const { exec } = require('child_process');

// ── Logger ───────────────────────────────────────────────────────────────────
// THREATSPAN_LOG sets the level: debug, info (default), warn, error, silent.
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };
const LOG_LEVEL  = LOG_LEVELS[(process.env.THREATSPAN_LOG || 'info').toLowerCase()] ?? LOG_LEVELS.info;
function _emit(name, stream, label, msg, meta) {
  if (LOG_LEVELS[name] < LOG_LEVEL) return;
  const ts = new Date().toISOString();
  let line = `${ts} ${label} ${msg}`;
  if (meta && typeof meta === 'object' && Object.keys(meta).length) line += ' ' + JSON.stringify(meta);
  stream.write(line + '\n');
}
const log = {
  debug: (msg, meta) => _emit('debug', process.stderr, 'DEBUG', msg, meta),
  info:  (msg, meta) => _emit('info',  process.stdout, 'INFO ', msg, meta),
  warn:  (msg, meta) => _emit('warn',  process.stderr, 'WARN ', msg, meta),
  error: (msg, meta) => _emit('error', process.stderr, 'ERROR', msg, meta),
};

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const VERSION = (() => { try { return require('./package.json').version; } catch { return '1.0.0'; } })();

// Subcommands (early dispatch — installLaunchd/uninstallLaunchd are hoisted).
if (args[0] === 'install-launchd')   { installLaunchd(parsePortArg(args, 3000)); }
if (args[0] === 'uninstall-launchd') { uninstallLaunchd(); }

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  ThreatSpan — SOC investigation workspace

  Usage:
    threatspan [options]
    threatspan install-launchd [--port <n>]   macOS: install LaunchAgent (auto-start at login)
    threatspan uninstall-launchd              macOS: stop and remove LaunchAgent

  Options:
    --port <n>     Port to listen on (default: 3000, env PORT)
    --no-open      Don't automatically open the browser
    --version, -v  Show version
    --help, -h     Show this help

  Environment:
    PORT                          Same as --port
    THREATSPAN_NO_OPEN=1          Don't auto-open browser
    THREATSPAN_NO_UPDATE_CHECK=1  Disable weekly update check
    THREATSPAN_LOG=<level>        debug | info (default) | warn | error | silent
`);
  process.exit(0);
}
if (args.includes('--version') || args.includes('-v')) {
  console.log(VERSION);
  process.exit(0);
}

function parsePortArg(argv, fallback) {
  const i = argv.indexOf('--port');
  if (i !== -1 && argv[i + 1]) return parseInt(argv[i + 1], 10);
  if (process.env.PORT) return parseInt(process.env.PORT, 10);
  return fallback;
}

const PORT    = parsePortArg(args, 3000);
const NO_OPEN = args.includes('--no-open') || process.env.THREATSPAN_NO_OPEN === '1';

// ── State directory ──────────────────────────────────────────────────────────
// Everything user-owned lives under ~/.threatspan/ (chmod 700) so installs from
// `npm i -g` don't drop secrets into a global node_modules path.
const STATE_DIR   = path.join(os.homedir(), '.threatspan');
const KEYS_FILE   = path.join(STATE_DIR, 'keys.json');
const SECRET_FILE = path.join(STATE_DIR, 'secret');
const CASES_DIR   = path.join(STATE_DIR, 'cases');

// Legacy locations (pre-1.1) — migrated on first boot, then ignored.
const LEGACY_KEYS_FILE   = path.join(__dirname, 'keys.json');
const LEGACY_SECRET_FILE = path.join(os.homedir(), '.threatspan_key');

const HTML = path.join(__dirname, 'threatspan.html');

function ensureStateDir() {
  try { fs.mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 }); } catch {}
  try { fs.chmodSync(STATE_DIR, 0o700); } catch {}
}

// ── Encryption (AES-256-GCM) ─────────────────────────────────────────────────
function loadOrCreateSecret() {
  ensureStateDir();

  // Migrate legacy secret if present and new one isn't
  if (!fs.existsSync(SECRET_FILE) && fs.existsSync(LEGACY_SECRET_FILE)) {
    try {
      const raw = fs.readFileSync(LEGACY_SECRET_FILE, 'utf8');
      fs.writeFileSync(SECRET_FILE, raw, { mode: 0o600 });
      fs.chmodSync(SECRET_FILE, 0o600);
      console.log(`  ✦  Migrated encryption key → ${SECRET_FILE}`);
    } catch (e) {
      console.error(`  ✗ Could not migrate legacy secret: ${e.message}`);
    }
  }

  try {
    return Buffer.from(fs.readFileSync(SECRET_FILE, 'utf8').trim(), 'hex');
  } catch {
    const key = crypto.randomBytes(32);
    fs.writeFileSync(SECRET_FILE, key.toString('hex') + '\n', { mode: 0o600 });
    try { fs.chmodSync(SECRET_FILE, 0o600); } catch {}
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
  // Migrate legacy keys.json once
  if (!fs.existsSync(KEYS_FILE) && fs.existsSync(LEGACY_KEYS_FILE)) {
    try {
      fs.copyFileSync(LEGACY_KEYS_FILE, KEYS_FILE);
      try { fs.chmodSync(KEYS_FILE, 0o600); } catch {}
      console.log(`  ✦  Migrated keys → ${KEYS_FILE}`);
    } catch (e) {
      console.error(`  ✗ Could not migrate legacy keys: ${e.message}`);
    }
  }

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
  ensureStateDir();
  fs.writeFileSync(KEYS_FILE, encryptKeys(obj), 'utf8');
  try { fs.chmodSync(KEYS_FILE, 0o600); } catch {}
}

// ── Case persistence ─────────────────────────────────────────────────────────
// One file per investigation under ~/.threatspan/cases/<id>.json.
// Client-generated IDs use base36 (Date.now+random) — restrict to that charset
// to defuse any traversal attempt before we touch the filesystem.
const CASE_ID_RE = /^[a-z0-9]{1,40}$/;
const MAX_CASE_BYTES = 256 * 1024;
const MAX_LIST_RETURN = 500;

function ensureCasesDir() {
  ensureStateDir();
  try { fs.mkdirSync(CASES_DIR, { recursive: true, mode: 0o700 }); } catch {}
  try { fs.chmodSync(CASES_DIR, 0o700); } catch {}
}

function casePath(id) {
  if (!CASE_ID_RE.test(id)) return null;
  const p = path.join(CASES_DIR, id + '.json');
  // Defense in depth: ensure resolved path stays inside CASES_DIR.
  const resolved = path.resolve(p);
  if (!resolved.startsWith(path.resolve(CASES_DIR) + path.sep)) return null;
  return p;
}

function listCases() {
  ensureCasesDir();
  let names;
  try { names = fs.readdirSync(CASES_DIR); } catch { return []; }
  const out = [];
  for (const n of names) {
    if (!n.endsWith('.json')) continue;
    const id = n.slice(0, -5);
    if (!CASE_ID_RE.test(id)) continue;
    try {
      const raw = fs.readFileSync(path.join(CASES_DIR, n), 'utf8');
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object' && obj.id === id) out.push(obj);
    } catch { /* skip corrupt */ }
  }
  out.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return out.slice(0, MAX_LIST_RETURN);
}

function readCase(id) {
  const p = casePath(id);
  if (!p) return null;
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch { return null; }
}

function writeCase(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('case must be an object');
  }
  const id = obj.id;
  if (typeof id !== 'string' || !CASE_ID_RE.test(id)) {
    throw new Error('invalid case id');
  }
  const p = casePath(id);
  if (!p) throw new Error('invalid case id');
  ensureCasesDir();
  const serialized = JSON.stringify(obj);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_CASE_BYTES) {
    throw new Error('case too large');
  }
  fs.writeFileSync(p, serialized, { mode: 0o600 });
  try { fs.chmodSync(p, 0o600); } catch {}
  return true;
}

function deleteCase(id) {
  const p = casePath(id);
  if (!p) return false;
  try { fs.unlinkSync(p); return true; } catch { return false; }
}

// ── Session token (CSRF defense) ─────────────────────────────────────────────
// Random per-boot. Injected into served HTML, required on every /api/* call.
const SESSION_TOKEN = crypto.randomBytes(32).toString('hex');
const SESSION_TOKEN_BUF = Buffer.from(SESSION_TOKEN, 'utf8');

function tokenMatches(provided) {
  if (typeof provided !== 'string') return false;
  const buf = Buffer.from(provided, 'utf8');
  if (buf.length !== SESSION_TOKEN_BUF.length) return false;
  return crypto.timingSafeEqual(buf, SESSION_TOKEN_BUF);
}

// ── Origin / Host validation ─────────────────────────────────────────────────
const EXPECTED_ORIGINS = new Set([
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  `http://[::1]:${PORT}`,
]);
const EXPECTED_HOSTS = new Set([
  `localhost:${PORT}`,
  `127.0.0.1:${PORT}`,
  `[::1]:${PORT}`,
]);

function hostAllowed(req) {
  const h = (req.headers.host || '').toLowerCase();
  return EXPECTED_HOSTS.has(h);
}

function originAllowed(req) {
  // GET-style same-origin navigations may omit Origin entirely.
  // /api/* still requires the session token, so an absent Origin alone can't be abused.
  const o = req.headers.origin;
  if (!o) return true;
  return EXPECTED_ORIGINS.has(o.toLowerCase());
}

// ── Allowlist ────────────────────────────────────────────────────────────────
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

const FORWARD_HEADERS = new Set(['x-apikey', 'key', 'accept', 'content-type', 'authorization', 'x-otx-api-key', 'auth-key', 'api-key']);

// ── Rate limit (token bucket per upstream host) ──────────────────────────────
// Defends user quotas against runaway pages/scripts.
// VT free tier is the tightest: 4/min. Default for everything else: 30/min.
const RATE_LIMITS = {
  'www.virustotal.com':       { capacity: 4,  refillPerSec: 4 / 60 },
};
const DEFAULT_LIMIT = { capacity: 30, refillPerSec: 30 / 60 };

const buckets = new Map();
function takeToken(host) {
  const limit = RATE_LIMITS[host] || DEFAULT_LIMIT;
  const now = Date.now();
  const b = buckets.get(host) || { tokens: limit.capacity, last: now };
  const elapsed = (now - b.last) / 1000;
  b.tokens = Math.min(limit.capacity, b.tokens + elapsed * limit.refillPerSec);
  b.last = now;
  if (b.tokens < 1) {
    buckets.set(host, b);
    const retry = Math.ceil((1 - b.tokens) / limit.refillPerSec);
    return { ok: false, retryAfter: retry };
  }
  b.tokens -= 1;
  buckets.set(host, b);
  return { ok: true };
}

// ── SSRF defense ─────────────────────────────────────────────────────────────
// Even allowlisted hostnames could be DNS-rebound to internal IPs.
// Resolve, validate, then lock the upstream request to the validated address.
function isPrivateIp(ip) {
  if (!ip) return true;
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (/^f[cd]/.test(lower)) return true;             // fc00::/7 ULA
    if (/^fe[89ab]/.test(lower)) return true;          // fe80::/10 link-local
    if (lower.startsWith('::ffff:')) {                  // IPv4-mapped
      return isPrivateIp(lower.slice(7));
    }
    return false;
  }
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(n => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 0)   return true;
  if (a === 10)  return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;  // CGNAT
  if (a >= 224)  return true;                          // multicast / reserved / broadcast
  return false;
}

async function resolveSafe(hostname) {
  const addrs = await dns.lookup(hostname, { all: true });
  if (!addrs.length) throw new Error(`no DNS record for ${hostname}`);
  for (const a of addrs) {
    if (isPrivateIp(a.address)) {
      throw new Error(`refusing to connect to internal address ${a.address}`);
    }
  }
  return addrs[0]; // first is typically OS-preferred
}

// ── Proxy ────────────────────────────────────────────────────────────────────
const UPSTREAM_TIMEOUT_MS = 15000;

async function handleProxy(target, req, res) {
  let parsed;
  try { parsed = new URL(target); } catch {
    res.writeHead(400); res.end('Invalid URL'); return;
  }

  if (parsed.protocol !== 'https:') {
    res.writeHead(400); res.end('Only https upstreams allowed'); return;
  }
  if (!ALLOWED.has(parsed.hostname)) {
    res.writeHead(403); res.end(`Host not allowed: ${parsed.hostname}`); return;
  }

  const rl = takeToken(parsed.hostname);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    res.writeHead(429); res.end(`Rate limit for ${parsed.hostname}; retry in ${rl.retryAfter}s`);
    return;
  }

  let addr;
  try {
    addr = await resolveSafe(parsed.hostname);
  } catch (e) {
    res.writeHead(502); res.end(`{"error":"${e.message.replace(/"/g, "'")}"}`); return;
  }

  // Connect directly to the validated IP (locks the request against TOCTOU
  // DNS rebinding) but present the original hostname for SNI + Host header
  // so TLS verification and HTTP routing both succeed.
  const options = {
    host:       addr.address,
    port:       443,
    path:       parsed.pathname + parsed.search,
    method:     req.method,
    servername: parsed.hostname,
    headers: {
      'user-agent': 'ThreatSpan/1.0',
      host: parsed.hostname,
    },
  };

  for (const [k, v] of Object.entries(req.headers)) {
    if (FORWARD_HEADERS.has(k.toLowerCase())) options.headers[k] = v;
  }

  const upstream = https.request(options, (upRes) => {
    const ct = upRes.headers['content-type'] || 'application/json';
    res.writeHead(upRes.statusCode, { 'Content-Type': ct, 'Cache-Control': 'no-store' });
    upRes.pipe(res, { end: true });
  });

  upstream.setTimeout(UPSTREAM_TIMEOUT_MS, () => {
    upstream.destroy(new Error('upstream timeout'));
  });

  upstream.on('error', (e) => {
    console.error('[proxy error]', parsed.hostname, e.message);
    if (!res.headersSent) {
      const status = /timeout/i.test(e.message) ? 504 : 502;
      res.writeHead(status); res.end(`{"error":"${e.message.replace(/"/g, "'")}"}`);
    } else {
      try { res.end(); } catch {}
    }
  });

  req.pipe(upstream, { end: true });
}

// ── HTML serve with token injection ──────────────────────────────────────────
function serveHtml(res) {
  let html;
  try {
    html = fs.readFileSync(HTML, 'utf8');
  } catch (e) {
    res.writeHead(500); res.end('Could not read threatspan.html'); return;
  }

  // Inject the per-boot session token as a meta tag so the page can read it.
  // Place it immediately after <head> (the page already requires <head> on line 4).
  const meta = `\n  <meta name="threatspan-token" content="${SESSION_TOKEN}">`;
  html = html.replace('<head>', `<head>${meta}`);

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cross-Origin-Opener-Policy': 'same-origin',
  });
  res.end(html);
}

// ── HTTP Server ──────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // Universal hardening headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');

  // Reject DNS-rebind attempts at the front door
  if (!hostAllowed(req)) {
    res.writeHead(421); res.end('Misdirected request'); return;
  }

  const isApi = req.url.startsWith('/api/');

  // Strict CORS: same-origin only. /api/* requires same-origin Origin.
  if (isApi) {
    if (!originAllowed(req)) {
      res.writeHead(403); res.end('Origin not allowed'); return;
    }
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'content-type, x-threatspan-token, x-apikey, key, authorization, x-otx-api-key, auth-key, api-key');
    }
    res.setHeader('Cache-Control', 'no-store');
  }

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  let url;
  try { url = new URL(req.url, `http://localhost:${PORT}`); }
  catch { res.writeHead(400); res.end('Bad request'); return; }

  // Token gate for /api/*
  if (isApi) {
    const provided = req.headers['x-threatspan-token'];
    if (!tokenMatches(provided)) {
      res.writeHead(401); res.end('Missing or invalid session token'); return;
    }
  }

  // GET /api/keys
  if (url.pathname === '/api/keys' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(readKeys()));
    return;
  }

  // POST /api/keys
  if (url.pathname === '/api/keys' && req.method === 'POST') {
    let body = '';
    let tooBig = false;
    req.on('data', chunk => {
      if (tooBig) return;
      body += chunk;
      if (body.length > 64 * 1024) { tooBig = true; }
    });
    req.on('end', () => {
      if (tooBig) { res.writeHead(413); res.end('Payload too large'); return; }
      try {
        const obj = JSON.parse(body);
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) throw new Error('expected object');
        writeKeys(obj);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      } catch (e) {
        res.writeHead(400); res.end(`{"error":"${e.message.replace(/"/g, "'")}"}`);
      }
    });
    return;
  }

  // GET /api/cases  → list of full cases (newest first, capped)
  if (url.pathname === '/api/cases' && req.method === 'GET') {
    const cases = listCases();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(cases));
    return;
  }

  // POST /api/cases  → body is full case object (must contain id)
  if (url.pathname === '/api/cases' && req.method === 'POST') {
    let body = '';
    let tooBig = false;
    req.on('data', chunk => {
      if (tooBig) return;
      body += chunk;
      if (body.length > MAX_CASE_BYTES) { tooBig = true; }
    });
    req.on('end', () => {
      if (tooBig) { res.writeHead(413); res.end('Payload too large'); return; }
      try {
        const obj = JSON.parse(body);
        writeCase(obj);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      } catch (e) {
        res.writeHead(400); res.end(`{"error":"${e.message.replace(/"/g, "'")}"}`);
      }
    });
    return;
  }

  // GET /api/cases/<id>  → single full case
  if (url.pathname.startsWith('/api/cases/') && req.method === 'GET') {
    const id = url.pathname.slice('/api/cases/'.length);
    if (!CASE_ID_RE.test(id)) { res.writeHead(400); res.end('Invalid id'); return; }
    const c = readCase(id);
    if (!c) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(c));
    return;
  }

  // DELETE /api/cases/<id>
  if (url.pathname.startsWith('/api/cases/') && req.method === 'DELETE') {
    const id = url.pathname.slice('/api/cases/'.length);
    if (!CASE_ID_RE.test(id)) { res.writeHead(400); res.end('Invalid id'); return; }
    const ok = deleteCase(id);
    res.writeHead(ok ? 200 : 404, { 'Content-Type': 'application/json' });
    res.end(ok ? '{"ok":true}' : '{"error":"not found"}');
    return;
  }

  // DELETE /api/cases  → clear all
  if (url.pathname === '/api/cases' && req.method === 'DELETE') {
    try {
      const names = fs.readdirSync(CASES_DIR);
      for (const n of names) {
        if (!n.endsWith('.json')) continue;
        const id = n.slice(0, -5);
        if (!CASE_ID_RE.test(id)) continue;
        try { fs.unlinkSync(path.join(CASES_DIR, n)); } catch {}
      }
    } catch {}
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"ok":true}');
    return;
  }

  // Update Access-Control-Allow-Methods for DELETE on /api/cases above is also covered by the
  // global OPTIONS handler which returns 204 before we get here.

  // /api/proxy?url=<encoded-target>
  if (url.pathname === '/api/proxy') {
    const target = url.searchParams.get('url');
    if (!target) { res.writeHead(400); res.end('Missing ?url='); return; }
    try { await handleProxy(target, req, res); }
    catch (e) {
      if (!res.headersSent) { res.writeHead(500); res.end(`{"error":"${e.message.replace(/"/g, "'")}"}`); }
    }
    return;
  }

  // Static HTML
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    serveHtml(res);
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
