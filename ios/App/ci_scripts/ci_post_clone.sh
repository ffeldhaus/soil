#!/bin/sh
set -e

export HOMEBREW_NO_AUTO_UPDATE=1
export HOMEBREW_NO_INSTALL_CLEANUP=1

if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js via Homebrew..."
  brew install node
fi

REPO_ROOT="${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/../../.." && pwd)}"
cd "$REPO_ROOT"

echo "Building SOIL web assets and syncing Capacitor iOS..."
npm ci --prefer-offline --no-audit
npm run build
node scripts/build-sw.js
npx cap copy ios
