# Homebrew Tap Setup

ThreatSpan ships a Formula at `Formula/threatspan.rb`. To distribute it via
`brew install djason1337/tap/threatspan` you need a separate **tap repository**
named `homebrew-tap` under your GitHub account.

## One-time tap repo setup

1. Create a new public repo on GitHub: `djason1337/homebrew-tap`
2. Copy `Formula/threatspan.rb` into the root of that repo (Homebrew also
   accepts it under `Formula/` — keep the same path).
3. Push.

That's it. Users can now run:

```bash
brew tap djason1337/tap
brew install threatspan
```

…or one-shot:

```bash
brew install djason1337/tap/threatspan
```

## Updating the Formula on each release

After publishing a new version to npm:

```bash
VERSION=1.0.12
URL="https://registry.npmjs.org/threatspan/-/threatspan-${VERSION}.tgz"
SHA=$(curl -fsSL "$URL" | shasum -a 256 | awk '{print $1}')

# In the homebrew-tap repo, update Formula/threatspan.rb:
#   url    "...threatspan-${VERSION}.tgz"
#   sha256 "${SHA}"
```

Commit and push to `homebrew-tap`. Users `brew upgrade threatspan` to pick it up.

The `release.yml` workflow in this repo computes the npm tarball SHA-256 and
prints the exact two lines you need to paste into the tap.

## Why a separate tap repo?

Homebrew expects taps to live in repos named `homebrew-<name>`. Putting the
Formula inside this repo's `Formula/` directory is documentation and a source
of truth — it is *not* installable directly with `brew install` against this
repo.
