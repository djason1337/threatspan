# ThreatSpan

I built ThreatSpan because I was tired of juggling tabs during home labs. VirusTotal, AbuseIPDB, Shodan, GreyNoise, URLScan, all of them. Copying the same indicator into each one, stitching results together in my head. It works, but it's slow, and it's how things get missed.

So I built the workflow I wanted. Paste an IP, domain, URL, or hash and get enrichment **from 14 sources at once.** One screen, one indicator, everything pulled up before you start clicking.

It runs locally. No cloud backend, no account, nothing leaves your machine except the calls to the API providers you configure. The point is faster triage with better context, without giving up control of where your indicators get sent.

---

## Install / Run

All options require **[Node.js](https://nodejs.org) v14+**. No `npm install` needed — ThreatSpan has zero dependencies.

### 1. `npx` — no install (easiest)

```bash
npx threatspan
```

Browser opens automatically.

### 2. `npm install -g`

```bash
npm install -g threatspan
threatspan
```

`threatspan` is now on your PATH from anywhere.

### 3. Clone & run (Linux / macOS)

```bash
git clone https://github.com/djason1337/threatspan.git
cd threatspan
./threatspan
```

### 4. Double-click on macOS (no terminal)

After cloning, **double-click `ThreatSpan.command`** in Finder. Terminal opens, the server starts, browser opens. Close the Terminal window to stop.

> *First time only:* macOS may say "cannot be opened because it is from an unidentified developer." Right-click → **Open** → **Open** to bypass Gatekeeper once.

### 5. Auto-start at login (macOS)

```bash
# Edit examples/com.threatspan.plist — replace /PATH/TO/threatspan
#   with the absolute path to your repo (use `pwd` inside the repo).
cp examples/com.threatspan.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.threatspan.plist
```

ThreatSpan will start on every login at `http://localhost:3000`. To uninstall:

```bash
launchctl unload ~/Library/LaunchAgents/com.threatspan.plist
rm ~/Library/LaunchAgents/com.threatspan.plist
```

---

## Command-line options

```
threatspan [options]

  --port <n>     Port to listen on (default: 3000)
  --no-open      Don't auto-open the browser
  --version      Show version
  --help         Show help
```

```bash
threatspan --port 8080            # different port
threatspan --no-open              # headless / launchd
PORT=9000 threatspan              # via env var
```

---

## Why a local server?

Browsers block direct API calls from local HTML files (`file://` origin) due to CORS. The included `server.js` is a zero-dependency Node.js proxy that:

- Serves `threatspan.html` at `http://localhost:3000`
- Routes API calls through `/api/proxy` so your keys actually work
- Only proxies requests to an explicit allowlist of security API hosts — nothing else
- Runs entirely on your machine; no cloud, no telemetry, no analytics

---

## API Keys

Open **Settings** (gear icon, top-right) and paste your keys. They're encrypted at rest with AES-256-GCM and stored in `keys.json` (project directory). The decryption key is generated on first run and saved to `~/.threatspan_key` (chmod 600, outside the repo) — so `keys.json` on its own is useless if it leaks. Keys are sent only to the provider they belong to.

| Module | Provider | Free Tier |
|--------|----------|-----------|
| VirusTotal | [virustotal.com/gui/my-apikey](https://www.virustotal.com/gui/my-apikey) | 4 req/min, 500/day |
| AbuseIPDB | [abuseipdb.com/account/api](https://www.abuseipdb.com/account/api) | 1,000 req/day |
| IPQualityScore | [ipqualityscore.com/user/settings](https://www.ipqualityscore.com/user/settings) | 200 req/day |
| Shodan | [account.shodan.io](https://account.shodan.io) | 1 req/sec, 100/month |
| GreyNoise | [viz.greynoise.io/account/api-key](https://viz.greynoise.io/account/api-key) | Optional — 10/day without |
| AlienVault OTX | [otx.alienvault.com/settings](https://otx.alienvault.com/settings) | Free |
| abuse.ch | [auth.abuse.ch](https://auth.abuse.ch) | Free (URLhaus + ThreatFox + MalwareBazaar) |
| urlscan.io | [urlscan.io/user/profile](https://urlscan.io/user/profile) | 100 public scans/day |

**No key needed:** GeoIP via [ipwho.is](https://ipwho.is), DNS via Cloudflare DoH, WHOIS via RDAP, Sucuri SiteCheck, [CISA KEV](https://www.cisa.gov/known-exploited-vulnerabilities-catalog), [NIST NVD](https://nvd.nist.gov/).

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Focus IOC input | `/` or `⌘K` |
| Run investigation | `Enter` |
| New investigation | `⌘N` |
| Bulk IOC extraction | `⌘B` |
| Paste & analyze clipboard | `⌘⇧V` |
| Cancel scan / close modal | `Esc` |
| Defang / refang IOC | click the `[.]` toggle |

**Supported IOC types:** IPv4, IPv6, Domain, URL, MD5, SHA1, SHA256

**Lost?** Click the `?` icon in the top-right header for the guided tour. Hover any element for an inline tooltip.

---

## Features

### Core
- **Live risk gauge** — weighted score (0–100) across all reputation modules
- **Verdict** — Clean / Likely Clean / Suspicious / Malicious with color coding
- **14 enrichment modules** — VirusTotal, AbuseIPDB, IPQS, Shodan, GreyNoise, URLhaus, ThreatFox, MalwareBazaar, OTX, Sucuri, urlscan.io, GeoIP, DNS, WHOIS
- **Stacked module cards** — expand any card for full structured data
- **Investigation history** — last 50 cached locally, click to restore
- **Defang toggle** — display IOCs in `198.51.100[.]42` format for safe sharing

### Investigation Playbooks
Rather than running every module every time, playbooks let you focus on what matters for the specific threat you're looking at. Each one comes with a pre-built analyst checklist.

- **Full Profile** — every applicable module
- **Quick Triage** — reputation-only sweep, fast
- **Phishing Triage** — URL/domain focus + urlscan screenshot + WHOIS age check
- **Ransomware IOC** — VT + MalwareBazaar + ThreatFox + OTX + IR checklist
- **C2 Infrastructure** — Shodan + GreyNoise + WHOIS + DNS recon

### Bulk IOC Extraction
Paste a SIEM alert, email body, or raw log into the bulk modal. ThreatSpan pulls out every IPv4, domain, URL, MD5, SHA1, and SHA256 it finds — including defanged forms like `8[.]8[.]8[.]8` and `hxxps://`. Pick which ones to investigate; each becomes its own history entry.

### urlscan.io Screenshots
For URL and domain investigations, ThreatSpan pulls the most recent public urlscan result or submits a new scan and displays the screenshot inline inside the module card.

### MITRE ATT&CK + CISA KEV Enrichment
- **CISA KEV cross-reference** — every CVE Shodan finds gets checked against the [CISA Known Exploited Vulnerabilities catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog). Actively exploited CVEs get a red `KEV` badge; ransomware-associated ones get `KEV · Ransomware`.
- **NVD CVSS scores** — CVEs are enriched with CVSS v3.1 scores, severity, attack vector, and a summary. Each links to its NVD page.
- **MITRE ATT&CK techniques** — when OTX returns pulses tagged with technique IDs (`T1071`, `T1486`, etc.), ThreatSpan surfaces them as clickable chips linking to attack.mitre.org.
- **ATT&CK Navigator layer export** — generates a JSON layer file you can drop directly into the [MITRE ATT&CK Navigator](https://mitre-attack.github.io/attack-navigator/).

### NIST CSF 2.0 Mapping
Response actions are tagged with NIST CSF 2.0 subcategories so investigations can tie back to your framework coverage. The **NIST CSF 2.0 report export** generates a markdown report organized under the 6 CSF functions — useful for compliance reviews and management reporting.

### Export Formats
- **Plain text** — analyst-readable report
- **Markdown** — formatted for tickets, wikis, GitHub
- **JSON** — full structured investigation data
- **STIX 2.1 bundle** — indicator + note objects, importable into TAXII/MISP/OpenCTI
- **MISP event** — direct import into MISP via JSON event import
- **MITRE ATT&CK Navigator layer** — drag into the Navigator for visual TTP heat-maps
- **NIST CSF 2.0 report** — markdown organized by CSF function
- **CSV (history)** — all 50 cached investigations for audit/reporting

### Clipboard & URL Integration
- `⌘⇧V` reads clipboard and analyzes (single IOC) or extracts (multi-IOC text)
- URL parameters: `http://localhost:3000/?ioc=8.8.8.8&playbook=quick` — wire into macOS Shortcuts, Raycast, Alfred, or any tool that opens URLs

---

## Privacy & Security

- All data stays on your machine. API calls go from your machine directly to the providers, proxied locally through an explicit host allowlist.
- API keys are encrypted at rest with AES-256-GCM in `keys.json`. The decryption key lives in `~/.threatspan_key` (chmod 600, outside the repo) — even if `keys.json` is exfiltrated, the keys inside stay sealed. Both files are git-ignored.
- The proxy only listens on `127.0.0.1` — it's not reachable from your network or the internet.
- No telemetry. No analytics. No phone-home.

---

## Contributing

PRs welcome. The whole app is two files (`threatspan.html` + `server.js`), no build step, no framework. Open it, edit, refresh.

To add a new module:
1. Add an entry to `MODULE_DEFS` in `threatspan.html`
2. Write a `query<Name>(ioc, type, signal)` function
3. Add a case to `buildModuleBody` for the card display
4. Wire it into the `runners` object in `startInvestigation`
5. Add the upstream host to `ALLOWED` in `server.js`

---

## License

MIT — see [LICENSE](./LICENSE).
