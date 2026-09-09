#!/bin/sh
# Builds dist/gdark-<version>.zip and submits it to the Chrome Web Store and
# Firefox Add-ons in one go, via publish-browser-extension.
#
#   ./publish.sh                 build current manifest version and submit
#   ./publish.sh 2.3.1           bump manifest.json to 2.3.1 first
#   ./publish.sh --dry-run       check credentials only, upload nothing
#   ./publish.sh 2.3.1 --dry-run
#
# Credentials: ~/secrets/_Code/browser-stores.env (shared by all extensions)
# plus .env (symlink to ~/secrets/_Code/gdark/.env) for this extension's ids;
# see .env.example. Store listing text is NOT touched — the Chrome
# API can't edit it — so copy changes in store/ still get pasted by hand.
set -e
cd "$(dirname "$0")"

# Shared store credentials (service account, publisher id, AMO key pair) are
# the same for every texs.org extension; the project .env adds the ids.
SHARED="$HOME/secrets/_Code/browser-stores.env"
[ -f "$SHARED" ] && { set -a; . "$SHARED"; set +a; }
if [ -f .env ]; then
  set -a; . ./.env; set +a
else
  echo "no .env — see .env.example" >&2; exit 1
fi

# First arg that looks like a version bumps the manifest; everything else is
# passed through to publish-extension.
case "$1" in
  [0-9]*.[0-9]*)
    python3 - "$1" <<'PY'
import json, sys
p = 'manifest.json'
m = json.load(open(p))
m['version'] = sys.argv[1]
json.dump(m, open(p, 'w'), indent=2)
open(p, 'a').write('\n')
print(f"manifest.json → {sys.argv[1]}")
PY
    shift ;;
esac

./build.sh
v=$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")
zip="dist/gdark-$v.zip"

# The tool wants the service account's email and PEM key as separate values;
# pull them out of the JSON key file Google hands you.
if [ -n "$CHROME_SERVICE_ACCOUNT_JSON" ] && [ -f "$CHROME_SERVICE_ACCOUNT_JSON" ]; then
  CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['client_email'])" "$CHROME_SERVICE_ACCOUNT_JSON")
  CHROME_SERVICE_ACCOUNT_PRIVATE_KEY=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['private_key'])" "$CHROME_SERVICE_ACCOUNT_JSON")
  export CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL CHROME_SERVICE_ACCOUNT_PRIVATE_KEY
fi

export CHROME_API_VERSION=v2
export CHROME_ZIP="$zip" FIREFOX_ZIP="$zip"
echo "submitting $zip"
exec npx -y publish-browser-extension@6 "$@"
