---
name: SOC Toolkit - Fluid Workspace
colors:
  surface: '#FFFFFF'
  surface-dim: '#dcd9db'
  surface-bright: '#fcf8fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f5'
  surface-container: '#f0edef'
  surface-container-high: '#eae7e9'
  surface-container-highest: '#e4e2e4'
  on-surface: '#1b1b1d'
  on-surface-variant: '#45464d'
  inverse-surface: '#303032'
  inverse-on-surface: '#f3f0f2'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#516072'
  on-secondary: '#ffffff'
  secondary-container: '#d2e1f7'
  on-secondary-container: '#556477'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d4e4fa'
  secondary-fixed-dim: '#b9c8de'
  on-secondary-fixed: '#0d1c2d'
  on-secondary-fixed-variant: '#39485a'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#F6F8FA'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e4'
  text-primary: '#1E293B'
  border: '#E2E8F0'
  critical: '#DC2626'
  warning: '#D97706'
  safe: '#059669'
  skeleton-base: '#F1F5F9'
  skeleton-shimmer: '#E2E8F0'
typography:
  h1:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
  h2:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.3'
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  data-mono:
    fontFamily: monospace
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
  button:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  pane-left-default: 280px
  pane-left-expanded: 400px
  pane-right: 320px
  gutter: 1rem
  stack-gap: 0.75rem
  command-bar-height: 64px
---

# SOC Toolkit - Fluid Workspace

## Product Overview

**The Pitch:** A premium, low-friction investigation environment for Level 2 SOC Analysts that transforms raw threat data into clear, actionable intelligence. It replaces cluttered terminal windows and dozens of browser tabs with a unified, three-pane fluid workspace.

**For:** Level 2 SOC Analysts who need to rapidly triage, analyze, and escalate indicators of compromise (IOCs) without cognitive fatigue.

**Device:** desktop

**Design Direction:** High-polish, light-mode fluid workspace. Soft, dimensional surfaces on a subtle gray canvas, utilizing semantic colors strictly for risk assessment.

**Inspired by:** Linear (fluid interactions, premium typography), Raycast (speed, keyboard-first inputs)

---

## Screens

- **New Investigation:** Blank slate ready for IOC input, focusing entirely on the command bar.
- **Active Scan:** Streaming module results with real-time skeleton loading and progress indicators.
- **Analysis Complete:** Full results for `198.51.100.42`, showcasing stacked module cards and final risk gauge.
- **Investigation History:** Expanded left pane revealing chronological audit logs of past investigations.

---

## Key Flows

**Triage Malicious IP:** Rapidly analyze a new indicator.

1. User is on **New Investigation** -> sees centered IOC input command bar.
2. User enters `198.51.100.42` and hits `Enter` -> initiates **Active Scan**.
3. Modules stream results in the center pane; Right pane gauge climbs to `72/100`.
4. User clicks **Isolate Host** in the Right pane -> flags IP and logs to SIEM.

---

<details>
<summary>Design System</summary>

## Color Palette

- **Primary:** `#0F172A` - Primary buttons, key actions, high-contrast UI elements
- **Background:** `#F6F8FA` - Main application canvas, soft and cool
- **Surface:** `#FFFFFF` - Module cards, right/left pane backgrounds
- **Text:** `#1E293B` - Primary headings and body text
- **Muted:** `#94A3B8` - Secondary text, subtle borders, timestamps
- **Critical (Malicious):** `#DC2626` - High risk indicators, score > 70
- **Warning (Suspicious):** `#D97706` - Medium risk indicators, score 30-70
- **Safe (Benign):** `#059669` - Low risk indicators, score < 30

## Typography

Chosen for maximum legibility in data-dense environments while feeling premium and distinct from standard system fonts.

- **Headings:** Geist, 600, 20-28px
- **Body:** Geist, 400, 14px
- **Data / IP Addresses:** JetBrains Mono, 500, 13px
- **Small text:** Geist, 500, 12px
- **Buttons:** Geist, 500, 13px

**Style notes:** 12px border radius on all main panels. 8px radius on internal cards. Soft multi-layered shadows (`0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)`) to lift cards off the background. 1px `#E2E8F0` borders for crisp separation.

## Design Tokens

```css
:root {
  --color-primary: #0F172A;
  --color-background: #F6F8FA;
  --color-surface: #FFFFFF;
  --color-text: #1E293B;
  --color-muted: #94A3B8;
  --color-critical: #DC2626;
  --color-warning: #D97706;
  --color-safe: #059669;
  
  --font-primary: 'Geist', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  --radius-lg: 12px;
  --radius-md: 8px;
  --radius-sm: 6px;
  
  --shadow-soft: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05);
}
```

</details>

---

<details>
<summary>Screen Specifications</summary>

### New Investigation

**Purpose:** The starting point. Zero distractions, immediate focus on data entry.

**Layout:** 3-pane layout visible, but Center and Right panes are empty. Left pane shows recent history.

**Key Elements:**
- **IOC Command Bar:** Center pane, 64px height, full width, placeholder `Enter IP, Domain, Hash, or URL...`.
- **Left Pane (History):** 280px width, list of previously scanned IOCs grouped by `Today`, `Yesterday`.
- **Right Pane (Assessment):** 320px width, dimmed state. 

**States:**
- **Empty:** Center pane shows a subtle illustration of a magnifying glass and "Awaiting Indicator".
- **Focus:** Command bar gets a 2px `#0F172A` ring on focus.

**Components:**
- **History Item:** 48px height, flex row, `JetBrains Mono` for IP, risk dot indicator, 12px muted timestamp.

**Interactions:**
- **Press `/`:** Auto-focuses the IOC Command Bar.

### Active Scan

**Purpose:** Show immediate feedback as external modules query the IOC.

**Layout:** 3-pane layout. Center pane fills with skeleton cards. Right pane activates.

**Key Elements:**
- **Module Skeleton Cards:** 7 stacked cards in the center pane (VT, AbuseIPDB, IPQS, GeoIP, DNS, Ports, WHOIS). 120px height, pulsating `#F1F5F9` to `#E2E8F0`.
- **Progress Indicator:** Right pane shows `Scanning 7 modules...`, circular progress ring.

**States:**
- **Loading:** Smooth shimmer animation on skeletons (`1.5s ease-in-out infinite`).

**Components:**
- **Module Card:** 120px height, `#FFFFFF` background, 1px `#E2E8F0` border, `8px` radius.

### Analysis Complete

**Purpose:** Final triage view for `198.51.100.42`.

**Layout:** 3-pane layout, fully populated.

**Key Elements:**
- **Center Workspace:** 
  - **VirusTotal Card:** Shows 14/89 malicious hits. Red accents.
  - **AbuseIPDB Card:** 100% confidence of abuse, recent SSH brute force reports.
  - **GeoIP / ASN:** `AS-CHOOPA`, `US (New Jersey)`.
  - **Ports:** `22 (Open)`, `80 (Filtered)`.
- **Right Pane (Live Threat Assessment):**
  - **Risk Gauge:** Large semi-circle gauge, needle at 72, color `#DC2626` (Malicious).
  - **Quick Actions:** Stacked buttons (`Block IP on Firewall`, `Add to Watchlist`, `Create Jira Ticket`).

**Components:**
- **Risk Gauge:** 200px width, SVG arc, bold 48px `Geist` number centered.
- **Action Button:** 40px height, 100% width, `#0F172A` background, `#FFFFFF` text, `6px` radius.

**Interactions:**
- **Hover Module Card:** Elevates shadow to `0 10px 15px -3px rgba(0,0,0,0.1)`.
- **Click Action Button:** Changes to `#059669` and says `Action Executed`.

### Investigation History

**Purpose:** Deep dive into past context.

**Layout:** Left pane expanded to 400px.

**Key Elements:**
- **Search Bar:** Top of left pane, 36px height, to filter past scans.
- **Filter Tags:** Row of tags (`Malicious`, `Suspicious`, `Safe`) below search.
- **Log Entries:** Dense list of past IOCs.

**Components:**
- **Filter Tag:** 24px height, `#F1F5F9` background, `#475569` text, `12px` padding.

</details>

---

<details>
<summary>Build Guide</summary>

**Stack:** HTML + Tailwind CSS v3

**Build Order:**
1. **Analysis Complete** - Start here. It contains all complex components (cards, gauges, typography hierarchy) and defines the exact pane widths and spacing.
2. **Active Scan** - Implement the skeleton loading states matching the loaded card dimensions.
3. **New Investigation** - Strip away the data to build the pristine empty states and focus interactions.
4. **Investigation History** - Implement the expanded left pane, list virtualization, and filter tag behaviors.

</details>