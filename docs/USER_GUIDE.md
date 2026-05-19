# ThreatSpan User Guide

This guide is for analysts who want to move from alert to documented investigation without switching tools.

## Start ThreatSpan

```bash
npx threatspan
```

Or, if installed globally:

```bash
threatspan
```

By default, ThreatSpan opens at:

```text
http://localhost:3000
```

Use a different port when needed:

```bash
threatspan --port 8080
```

The macOS `install-launchd` auto-start command is macOS-only.

## Add API Keys

Open **Settings** from the top-right gear icon.

Add the keys you have. You do not need every key to start using ThreatSpan. Free modules such as GeoIP, DNS, WHOIS/RDAP, Sucuri SiteCheck, CISA KEV, and NVD work without a key.

Keys are encrypted locally and stored under `~/.threatspan/`.

## Run a Single IOC Investigation

1. Paste an IOC into the investigation bar.
2. Confirm ThreatSpan detected the right IOC type.
3. Choose a playbook.
4. Press **Enter** or click **Analyze**.
5. Watch module cards complete in the center pane.
6. Use the right pane for risk indicators, response actions, case notes, the generated analyst brief, and audit context.

Supported IOC types:

| Type | Examples |
| --- | --- |
| IPv4 | `8.8.8.8` |
| IPv6 | `2606:4700:4700::1111` |
| Domain | `example.com` |
| URL | `https://example.com/login` |
| MD5 | `d41d8cd98f00b204e9800998ecf8427e` |
| SHA1 | `da39a3ee5e6b4b0d3255bfef95601890afd80709` |
| SHA256 | `e3b0c44298fc1c149afbf4c8996fb924...` |

## Choose a Playbook

Playbooks decide which modules run and pre-fill the analyst checklist.

| Playbook | Use when | Notes |
| --- | --- | --- |
| Full Profile | You need the broadest possible context. | Highest API usage. |
| Quick Triage | You need a fast yes/no signal. | Focuses on reputation sources. |
| Phishing Triage | The IOC is a URL or domain from email, proxy, or user report. | Prioritizes urlscan, DNS, WHOIS, and website checks. |
| Ransomware IOC | You are reviewing a hash, C2, or ransomware-related alert. | Emphasizes malware databases and IR checklisting. |
| C2 Infrastructure | You are investigating internet-facing IPs or domains. | Emphasizes Shodan, GreyNoise, DNS, WHOIS, and related intel. |

## Read the Investigation

The center pane shows one card per enrichment module. Each card has:

- The provider name.
- The status of the lookup.
- A short analyst-readable summary.
- A module score when that source contributes to risk.
- Expandable structured details when available.

The right pane shows:

- Overall risk score.
- Verdict.
- Risk indicators.
- Response actions.
- Case notes and the generated analyst brief.
- Audit metadata.

## Use Bulk IOC Extraction

Open the bulk modal with **Cmd+B** or the queue button.

Paste alert text, logs, email bodies, CSV content, or STIX-like JSON. ThreatSpan extracts supported indicators, refangs common defanged forms such as `hxxps://` and `[.]`, and lets you choose which IOCs to investigate.

Each selected IOC becomes its own saved investigation.

## Export a Case

Use the export menu in the top-right header.

Available exports:

| Format | Use for |
| --- | --- |
| Plain text | Tickets, chat, quick handoff |
| Markdown | GitHub, wikis, case notes |
| JSON | Full structured case data |
| STIX 2.1 | TIP, TAXII, OpenCTI, MISP workflows |
| MISP event | MISP JSON import |
| ATT&CK Navigator layer | Visualizing observed techniques |
| NIST CSF 2.0 report | Framework-aligned reporting |
| CSV history | Audit and review |

## Keyboard Shortcuts

| Action | Shortcut |
| --- | --- |
| Focus IOC input | `/` or `Cmd+K` |
| Run investigation | `Enter` |
| New investigation | `Cmd+N` |
| Bulk IOC extraction | `Cmd+B` |
| Paste and analyze clipboard | `Cmd+Shift+V` |
| Cancel scan / close modal | `Esc` |
| Defang / refang IOC display | Click the `[.]` toggle |

## URL Integration

ThreatSpan can start an investigation from URL parameters.

```text
http://localhost:3000/?ioc=8.8.8.8&playbook=quick
```

Use this with macOS Shortcuts, Raycast, Alfred, browser bookmarks, SIEM custom links, or internal tooling that can open a URL.

Supported playbook values:

```text
full
quick
phishing
ransomware
c2
```

## Analyst Workflow

Use this flow when triaging an alert:

1. Start with **Quick Triage** to determine whether the IOC is worth deeper work.
2. Switch to a scenario playbook if the IOC looks relevant.
3. Expand cards with non-clean signals first.
4. Check whether risk indicators agree or conflict.
5. Add investigation notes before exporting.
6. Export Markdown for tickets or JSON/STIX/MISP for downstream tools.

## Troubleshooting

### API lookups fail from file mode

Open ThreatSpan through the local server, not directly from `threatspan.html`.

```bash
threatspan
```

Then use:

```text
http://localhost:3000
```

### A provider says no key

Open **Settings**, add the key, save, and rerun the investigation.

### A provider returns rate limits

Use a narrower playbook, wait for the provider quota window to reset, or disable modules you do not need for that case.

### A private or reserved IP returns little enrichment

ThreatSpan detects private, loopback, link-local, multicast, reserved, and test ranges. External reputation sources usually do not apply to those indicators.
