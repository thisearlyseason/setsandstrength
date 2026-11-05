#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$root"
mkdir -p work
fixture="${NATIVE_QA_ACCOUNT_FILE:-$root/work/native-qa.json}"
export NATIVE_QA_ACCOUNT_FILE="$fixture"
project=frontend/ios/App/App.xcodeproj/project.pbxproj
scheme=frontend/ios/App/App.xcodeproj/xcshareddata/xcschemes/AppUITests.xcscheme
# Never adopt or delete a fixture owned by an interrupted/manual QA run.
if [ -f "$fixture" ]; then
  echo 'A local QA fixture already exists. Finish or clean up that run first.' >&2
  exit 1
fi
project_backup=$(mktemp "$root/work/native-ui-project.XXXXXX")
scheme_backup=$(mktemp "$root/work/native-ui-scheme.XXXXXX")
cp "$project" "$project_backup"
had_scheme=0
if [ -f "$scheme" ]; then cp "$scheme" "$scheme_backup"; had_scheme=1; fi
cleanup() {
  cp "$project_backup" "$project"
  if [ "$had_scheme" = 1 ]; then cp "$scheme_backup" "$scheme"; elif [ -f "$scheme" ]; then unlink "$scheme"; fi
  node frontend/scripts/native-ui-account.mjs cleanup || true
  (cd frontend && npx cap sync ios)
  unlink "$project_backup"
  unlink "$scheme_backup"
}
trap cleanup EXIT
node frontend/scripts/native-ui-account.mjs setup
VITE_WORKOUT=1 npm --prefix frontend run build:mobile
(cd frontend && SETS_STRENGTH_SIMULATOR=1 npx cap sync ios)
WORKOUT_UI_TESTS=1 NATIVE_QA_FIXTURE="$fixture" ruby frontend/ios/ci/add-ui-tests.rb
xcodebuild -workspace frontend/ios/App/App.xcworkspace -scheme AppUITests \
  -destination "platform=iOS Simulator,id=${IOS_QA_SIMULATOR_ID:-95A7F92E-3FF1-40F6-A2B9-892FB00584E9}" \
  ARCHS=arm64 EXCLUDED_ARCHS= CODE_SIGNING_ALLOWED=NO \
  -only-testing:AppUITests/NativeWorkoutUITests test
