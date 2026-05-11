#!/usr/bin/env bash
# Build single-file binaries for all supported platforms.
#
# Output: dist/binaries/threatspan-{platform}-{arch}[.exe]
#         dist/binaries/SHA256SUMS.txt
#
# Requires: npx (ships with Node.js). @yao-pkg/pkg is fetched on demand.

set -euo pipefail

cd "$(dirname "$0")/.."

OUT_DIR="dist/binaries"
mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR"/threatspan-* "$OUT_DIR"/SHA256SUMS.txt

echo "→ Building binaries with @yao-pkg/pkg…"
npx --yes @yao-pkg/pkg@latest .

# Normalize pkg's default naming (threatspan-macos-x64 etc.) — already matches.
echo ""
echo "→ Generating SHA256SUMS.txt"
cd "$OUT_DIR"
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum threatspan-* > SHA256SUMS.txt
else
  shasum -a 256 threatspan-* > SHA256SUMS.txt
fi

echo ""
echo "Built:"
ls -lh threatspan-* SHA256SUMS.txt
