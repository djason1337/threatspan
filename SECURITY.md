# ThreatSpan Security Model

ThreatSpan is designed as a local-first analyst tool. It does not run a hosted backend, collect telemetry, or require an account.

## Local Server

ThreatSpan serves the app from `server.js` and binds only to loopback:

```text
127.0.0.1
```

The local proxy exists because browsers block many direct API calls from a `file://` page. API requests go through `/api/proxy`, where the server applies provider allowlisting and local request controls before forwarding traffic.

## API Key Storage

API keys are stored in the user state directory:

```text
~/.threatspan/
```

ThreatSpan uses:

- `~/.threatspan/keys.json` for encrypted key material.
- `~/.threatspan/secret` for the local AES-256-GCM encryption secret.
- `chmod 700` on the state directory where supported.
- `chmod 600` on key and secret files where supported.

`keys.json` alone is not useful without the local secret file.

## Proxy Controls

The proxy includes:

- Explicit upstream host allowlisting.
- Loopback-only listener.
- Host header validation for loopback access.
- Same-origin enforcement.
- A per-boot 256-bit session token for `/api/*` requests.
- Per-host rate limiting.
- Request timeouts.
- DNS resolution checks before upstream connections.
- SSRF protection that rejects private, loopback, link-local, multicast, and otherwise unsafe resolved addresses.

These controls are intended to reduce exposure from malicious web pages, DNS rebinding, runaway scans, and accidental proxy misuse.

## Data Flow

When you investigate an IOC:

1. The browser sends the lookup request to the local ThreatSpan server.
2. The server validates the request and target provider.
3. The server forwards the request to the configured provider.
4. The response is returned to the browser and rendered locally.

ThreatSpan does not send results to a ThreatSpan-operated service.

## What Still Leaves Your Machine

Provider lookups necessarily send the queried IOC to the selected third-party provider. For example, a VirusTotal lookup sends the IOC to VirusTotal. Choose playbooks and configured providers based on your organization's handling rules.

## Reporting Security Issues

Please report security issues privately through the repository owner before opening a public issue. Include:

- The affected version.
- The operating system.
- A minimal reproduction.
- Logs or screenshots that do not expose real secrets.

Do not include real API keys, customer data, or sensitive indicators in a public report.
