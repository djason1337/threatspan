#!/usr/bin/env bash
# ThreatSpan — macOS double-click launcher
#
# Just double-click this file in Finder.
# A Terminal window will open, the server will start, and your browser
# will open to http://localhost:3000 automatically.
#
# To stop: press Ctrl+C in the Terminal window, or just close it.

set -e

# Move to the directory where this .command file lives
cd "$(dirname "$0")"

clear
echo ""
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║                                                      ║"
echo "  ║                    THREATSPAN                        ║"
echo "  ║                                                      ║"
echo "  ║   Threat investigation workspace for SOC analysts    ║"
echo "  ║                                                      ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo ""

# Check Node is installed
if ! command -v node >/dev/null 2>&1; then
  echo "  ✗ Node.js is required but not installed on this Mac."
  echo ""
  echo "    Install it one of these ways:"
  echo "      • Download from https://nodejs.org"
  echo "      • Or with Homebrew:  brew install node"
  echo ""
  echo "  Press any key to close…"
  read -n 1 -s
  exit 1
fi

# Check Node version
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
if [ "$NODE_MAJOR" -lt 14 ]; then
  echo "  ✗ Node.js 14 or newer is required."
  echo "    Currently installed: $(node --version)"
  echo ""
  echo "  Press any key to close…"
  read -n 1 -s
  exit 1
fi

echo "  Node $(node --version)  →  starting server…"
echo ""

# Run the server (auto-opens browser by default)
node server.js "$@"
