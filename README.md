# ThreatSpan

A fast, keyboard-first investigation workspace for SOC analysts. Paste an IP, domain, URL, or hash — get instant enrichment from **14 threat intelligence sources**, all in one clean three-pane view.

**Built for analysts who triage at speed:** bulk IOC extraction from email/log paste, investigation playbooks, screenshot capture via urlscan.io, MITRE ATT&CK + CISA KEV cross-reference, and STIX 2.1 / MISP / ATT&CK Navigator export for upstream pipelines.

![screenshot placeholder](https://via.placeholder.com/1200x630/F6F8FA/1E293B?text=ThreatSpan)

---

## Install / Run

Pick whichever fits your setup. All require **[Node.js](https://nodejs.org) v14+** (no `npm install` needed for any of them — ThreatSpan has zero dependencies).

### 1. `npx` — no install (easiest)

```bash
npx threatspan
```

That's it. Browser opens automatically.

### 2. `npm install -g`

```bash
npm install -g threatspan
threatspan
```

Now `threatspan` is on your PATH from anywhere.

### 3. Clone & run (Linux / macOS)

```bash
git clone https://github.com/YOUR_USERNAME/threatspan.git
cd threatspan
./threatspan
```

### 4. Double-click on macOS (no terminal)

After cloning the repo, just **double-click `ThreatSpan.command`** in Finder. A Terminal window opens, the server starts, your browser opens. Close the Terminal window to stop.

> *First time only:* macOS may say "cannot be opened because it is from an unidentified developer". Right-click → **Open** → **Open** to bypass Gatekeeper once.

### 5. Auto-start at login (macOS)

Want ThreatSpan always running in the background? Use the included `launchd` agent:

```bash
# Edit examples/com.threatspan.plist — replace /PATH/TO/threatspan
#   with the absolute path to your repo (use `pwd` inside the repo).
cp examples/com.threatspan.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.threatspan.plist
```

ThreatSpan will now start on every login at `http://localhost:3000`. To uninstall:

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

Examples:
```bash
threatspan --port 8080            # different port
threatspan --no-open              # don't open browser (good for headless / launchd)
PORT=9000 threatspan              # via env var
```

---

## Why a local server?

Browsers block direct API calls from local HTML files (`file://` origin) due to CORS policy. The included `server.js` is a **zero-dependency Node.js proxy** that:

- Serves `threatspan.html` at `http://localhost:3000`
- Routes API calls through `/api/proxy` so your keys actually work
- Only proxies requests to an explicit allowlist of security API hosts — nothing else
- Runs entirely on your machine; no cloud, no telemetry, no analytics

---

## API Keys

Open **Settings** (gear icon, top-right) and paste your keys. They're saved in your browser's `localStorage` — never sent anywhere except to the API providers themselves.

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

**Lost?** Click the `?` icon in the top-right header for the in-app guided tour. Hover any UI element for an inline tooltip.

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
Pre-curated module sets + analyst checklist notes:
- **Full Profile** — every applicable module
- **Quick Triage** — fast reputation-only sweep
- **Phishing Triage** — URL/domain focus + urlscan screenshot + WHOIS age check
- **Ransomware IOC** — VT + MalwareBazaar + ThreatFox + OTX + IR checklist
- **C2 Infrastructure** — Shodan + GreyNoise + WHOIS + DNS recon

### Bulk IOC Extraction
Paste a SIEM alert, email body, or log line into the bulk modal — ThreatSpan auto-detects every IPv4, domain, URL, MD5, SHA1, SHA256 (including defanged forms like `8[.]8[.]8[.]8`, `hxxps://`). Pick which to investigate; each becomes its own history entry.

### urlscan.io Screenshots
For URL/domain investigations, ThreatSpan either pulls the most recent public urlscan result or submits a new scan, displaying the **full screenshot inline** in the module card.

### MITRE ATT&CK + CISA KEV Enrichment
- **CISA KEV cross-reference** — every CVE found by Shodan is checked against the [CISA Known Exploited Vulnerabilities catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog). Actively-exploited CVEs get a red `KEV` badge; ransomware-associated ones get an even darker `KEV · Ransomware` badge.
- **NVD CVSS scores** — CVEs are auto-enriched with CVSS v3.1 scores, severity, attack vector, and a one-line summary. Each CVE links to its NVD page.
- **MITRE ATT&CK techniques** — when AlienVault OTX returns pulses tagged with technique IDs (`T1071`, `T1486`, etc.), ThreatSpan surfaces them as clickable chips linking to attack.mitre.org.
- **ATT&CK Navigator layer export** — generates a JSON layer file that drops directly into the [MITRE ATT&CK Navigator](https://mitre-attack.github.io/attack-navigator/).

### NIST CSF 2.0 Mapping
Every module and every response action is mapped to the [NIST Cybersecurity Framework 2.0](https://www.nist.gov/cyberframework):

- **Function badges** on each module card show which of the 6 CSF functions it contributes to (`GV`/`ID`/`PR`/`DE`/`RS`/`RC`)
- **Subcategory tags** on each response action button (e.g. `RS.MI-01` for "Block on Firewall" → *Incidents are contained*)
- **Live coverage indicator** in the right pane — six color-coded cells light up as each CSF function gets covered by your investigation. Helps you spot when you've identified and detected, but haven't *responded* yet
- **NIST CSF 2.0 report export** — markdown report organized under the 6 CSF functions, perfect for compliance reviews and management updates

### Export Formats
Click the export icon for:
- **Plain text** — analyst-readable report
- **Markdown** — formatted for tickets, wikis, GitHub
- **JSON** — full structured investigation data
- **STIX 2.1 bundle** — indicator + note objects, importable into TAXII/MISP/OpenCTI
- **MISP event** — direct import into MISP via JSON event import
- **MITRE ATT&CK Navigator layer** — drag into the Navigator for visual TTP heat-maps
- **NIST CSF 2.0 report** — markdown organized by CSF function, for compliance & management reporting
- **CSV (history)** — all 50 cached investigations for audit/reporting

### Clipboard & URL Integration
- Paste button + `⌘⇧V` reads clipboard and analyzes (single IOC) or extracts (multi-IOC text)
- URL parameters: `http://localhost:3000/?ioc=8.8.8.8&playbook=quick` — wire into macOS Shortcuts, Raycast, Alfred, browser bookmarklets, or any tool that opens URLs.

---

## Privacy & Security

- All data stays on your machine. API calls go directly from your machine to the API providers (proxied locally, with an explicit host allowlist).
- API keys are stored in `localStorage` only — never on disk, never transmitted to anything other than the provider they belong to.
- The proxy server **only listens on `127.0.0.1`** (localhost) — it is not reachable from your network or the internet.
- No telemetry. No external analytics. No cloud backend. No phone-home.

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
