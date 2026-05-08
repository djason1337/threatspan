Use this for Google Stitch:

```markdown
Redesign a desktop SOC Analyst Toolkit for Level 2 SOC analysts.

The app is a professional threat investigation workspace used to analyze IOCs: IPs, domains, URLs, and hashes. It pulls data from GeoIP, DNS, WHOIS, SSL/TLS, HTTP headers, port scan, AbuseIPDB, VirusTotal, IPQualityScore, Sucuri, and produces a threat assessment with risk score, verdict, indicators, and response actions.

This is not a marketing site. Design the actual working app UI.

Design direction:
Soft, light, modern, efficient, premium. Think Apple-level polish, Uber-level workflow clarity, and enterprise SOC-grade information density. It should look better than major security vendor consoles without feeling decorative or flashy.

Primary users:
Level 2 SOC analysts working alerts, triage queues, escalations, SIEM lookups, phishing reports, and incident handoffs. They need speed, clarity, confidence, and low cognitive load. They are not browsing casually. They are making decisions under pressure.

Core UX principles:
- Investigation-first, not dashboard-first.
- Show what matters now.
- Make risk obvious without overwhelming the analyst.
- Preserve context across multiple investigations.
- Minimize clicks for repeated SOC workflows.
- Support keyboard-first analysts.
- Make every result copyable, exportable, and audit-friendly.
- Avoid visual noise, vendor-console clutter, and generic SaaS cards.

Visual style:
- Light near-white background, soft gray panels, subtle borders.
- Rounded surfaces and controls. No sharp Windows-style boxes.
- Calm but crisp contrast.
- Use semantic color only: green clean, amber suspicious, red malicious, blue informational.
- No gradients, glassmorphism, neon cyberpunk, dark hacker theme, emojis, or decorative blobs.
- Typography should feel modern and dense: Inter, SF Pro, or equivalent.
- Use compact spacing, but leave enough air that analysts can scan quickly.
- Buttons should be rounded pills or soft icon buttons.
- Module icons should be clean, modern, and security-relevant.

Main layout:
A three-pane desktop app.

Top bar:
- Product name: SOC Toolkit
- New Investigation button
- Search/history access
- API key/settings access
- Export button
- Optional current run status

Left pane: Investigation history
- Compact vertical list of investigations.
- Each item shows IOC, type, verdict/risk color, timestamp, and status.
- Clicking restores the full cached investigation instantly.
- Include active/running/canceled/error states.
- Should feel like a focused case list, not a generic sidebar.

Center pane: Main investigation workspace
At the top:
- Large rounded IOC input field.
- Inline detected type badge: IPv4, Domain, URL, MD5, SHA1, SHA256.
- Analyze button.
- Cancel button while running.
- Defang/refang controls.
- Module selector chips: Quick, Full, Reputation, Network, Web.

Below:
- Replace tabs with stacked module result cards.
- Each module card has:
  - Modern icon badge
  - Module name
  - Status pill: Pending, Running, Done, Error, No Key, Canceled
  - Duration
  - One-line summary
  - Copy button
  - Expand/collapse control
- Expanded state shows structured key/value results, not raw text walls.
- Use inline bars for scores.
- Use compact boolean pills for true/false.
- Use clean empty/error/no-key states.
- Important findings should be visually elevated but not loud.
- Module order:
  Assessment, Summary, VirusTotal, AbuseIPDB, IPQS, Sucuri, GeoIP, DNS, WHOIS, SSL/TLS, Headers, Ports.

Right pane: Live threat assessment
Always visible.
- Large risk gauge from 0–100.
- Verdict badge: Clean, Likely Clean, Suspicious, Malicious.
- Key risk indicators.
- Recommended response actions as checkable tasks.
- Analyst notes field.
- Export report button.
- Show audit context: analyst initials, timestamps, completed actions.

Important workflows:
1. Analyst pastes an IOC and presses Enter.
2. App immediately detects IOC type.
3. Relevant modules start running.
4. Cards stream results as they complete.
5. Risk score updates live.
6. Analyst checks recommended actions.
7. Analyst copies important fields or exports report.
8. Analyst starts a new investigation without losing the old one.
9. Analyst can switch between investigations instantly.

Interaction design:
- Smooth, subtle transitions: 120–180ms ease-out.
- Button hover/press states should feel premium.
- Cards should expand/collapse smoothly.
- Settings drawer should slide in softly.
- Risk gauge should animate between scores.
- Running modules should show quiet progress/spinner states.
- No flicker, harsh jumps, clipped text, or layout shifts.
- Resize/minimize/restore should feel stable.

Settings/API keys:
- Inline drawer or side panel, not a modal.
- API key fields for VirusTotal, AbuseIPDB, IPQualityScore.
- Each has masked input, Test button, and status chip: Untested, Valid, Invalid, Quota/Rate Limited.
- Mention secure key storage visually but unobtrusively.

Enterprise details to represent:
- Audit-friendly export.
- Structured timestamps.
- Analyst notes.
- Checked response actions.
- Cached investigation history.
- Partial results when some modules fail.
- Clear provider errors/rate limits.
- No-key state with direct path to settings.

Screen to generate:
Create the main app screen at desktop size, around 1440×900.

Show an active investigation for:
IOC: 198.51.100.42
Type: IPv4
Status: Running/partially complete
Risk score: 72
Verdict: Malicious

Populate realistic-looking module summaries:
- VirusTotal: 8/94 malicious, 3 suspicious
- AbuseIPDB: 87% confidence, 1,204 reports
- IPQS: Fraud score 91, proxy true, recent abuse true
- GeoIP: Hosting provider, United States
- DNS: PTR found
- Ports: 22, 80, 443 open
- WHOIS: ARIN allocation
- Sucuri: Not applicable for IP
- Headers/SSL: Not applicable for IP

Design the app as if it is production software used daily in a professional SOC. It should feel faster, cleaner, and more refined than typical enterprise security dashboards.
```