#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../frontend"
# Keep a single checkout/bundle. Restore the full device dependency graph even on failure.
VITE_WORKOUT=1 npm run build:mobile
trap 'npx cap sync ios' EXIT
SETS_STRENGTH_SIMULATOR=1 npx cap sync ios
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphonesimulator \
  -configuration Debug ARCHS=arm64 EXCLUDED_ARCHS= ONLY_ACTIVE_ARCH=YES \
  CODE_SIGNING_ALLOWED=NO build
