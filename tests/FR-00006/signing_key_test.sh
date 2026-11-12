#!/usr/bin/env bash
# FR-00006 tests for devops/player-identity/new-signing-key.sh, which makes the
# Ed25519 key that signs access tokens and stores it as a gateway secret.
#
# Each test is named after the FR-00006 check it proves. A stand-in wrangler
# records its arguments and what it is given on standard input, and `script`
# provides a terminal, so these tests need no credentials and no network and
# change nothing in Cloudflare. The key made in a test is checked and then
# deleted with the test's temporary folder.
#
# Usage: tests/FR-00006/signing_key_test.sh
# Exit status: 0 when every test passes, 1 when any test fails, 2 when no test
# fails but at least one is blocked.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/devops/player-identity/new-signing-key.sh"

passed=0
failed=0

pass() { passed=$((passed + 1)); echo "PASS    $1"; }
fail() { failed=$((failed + 1)); echo "FAIL    $1"; [ -n "${2:-}" ] && echo "        $2"; }

# A copy of the script in a temporary repository layout, so --local writes
# there and never into the real apps/gateway.
setup() {
  WORK="$(mktemp -d)"
  mkdir -p "$WORK/devops/player-identity" "$WORK/apps/gateway" "$WORK/fakebin"
  cp "$SCRIPT" "$WORK/devops/player-identity/"
  COPY="$WORK/devops/player-identity/new-signing-key.sh"
  export WRANGLER_LOG="$WORK/wrangler.log"
  export WRANGLER_STDIN="$WORK/wrangler.stdin"
  : >"$WRANGLER_LOG"
  cat >"$WORK/fakebin/wrangler" <<'STUB'
#!/usr/bin/env bash
{ echo "cwd=$PWD"; printf 'arg=%s\n' "$@"; } >>"$WRANGLER_LOG"
cat >"$WRANGLER_STDIN"
echo "Success! Uploaded secret ACCESS_TOKEN_SIGNING_KEY"
STUB
  chmod +x "$WORK/fakebin/wrangler"
}

teardown() {
  rm -rf "${WORK:?}"
}

# Runs the copy in a terminal made by `script`, typing $1 at the question.
run_in_terminal() {
  OUTPUT="$(printf '%s\n' "$1" | PATH="$WORK/fakebin:$PATH" script -qec "bash '$COPY'" /dev/null 2>&1)"
  STATUS=$?
}

# Checks that a file holds exactly one Ed25519 private JWK that signs and
# verifies, using Node.js.
valid_private_jwk() {
  node -e '
    const crypto = require("node:crypto");
    const text = require("node:fs").readFileSync(process.argv[1], "utf8");
    const jwk = JSON.parse(text);
    if (Object.keys(jwk).sort().join() !== "crv,d,kty,x") process.exit(1);
    if (jwk.kty !== "OKP" || jwk.crv !== "Ed25519") process.exit(1);
    const privateKey = crypto.createPrivateKey({ key: jwk, format: "jwk" });
    const publicKey = crypto.createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x: jwk.x }, format: "jwk" });
    const signature = crypto.sign(null, Buffer.from("fr-00006"), privateKey);
    process.exit(crypto.verify(null, Buffer.from("fr-00006"), publicKey, signature) ? 0 : 1);
  ' "$1"
}

jwk_field() {
  node -e 'process.stdout.write(JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"))[process.argv[2]])' "$1" "$2"
}

test_refuses_without_terminal() {
  local name="FR-00006: without a terminal the script refuses and changes nothing"
  setup
  OUTPUT="$(PATH="$WORK/fakebin:$PATH" setsid bash "$COPY" </dev/null 2>&1)"
  STATUS=$?
  if [ "$STATUS" -eq 0 ]; then
    fail "$name" "It exited 0."
  elif [ -s "$WRANGLER_LOG" ]; then
    fail "$name" "It called wrangler."
  else
    pass "$name"
  fi
  teardown
}

test_refuses_without_yes() {
  local name="FR-00006: an answer other than yes changes nothing"
  setup
  run_in_terminal "no"
  if [ "$STATUS" -eq 0 ]; then
    fail "$name" "It exited 0."
  elif [ -s "$WRANGLER_LOG" ]; then
    fail "$name" "It called wrangler."
  else
    pass "$name"
  fi
  teardown
}

test_stores_key() {
  local name="FR-00006: after yes, a new Ed25519 private JWK is piped to wrangler secret put ACCESS_TOKEN_SIGNING_KEY --env dev"
  setup
  run_in_terminal "yes"
  local args
  args="$(grep '^arg=' "$WRANGLER_LOG" | tr '\n' ' ')"
  if [ "$STATUS" -ne 0 ]; then
    fail "$name" "It exited $STATUS: $OUTPUT"
  elif [ "$args" != "arg=secret arg=put arg=ACCESS_TOKEN_SIGNING_KEY arg=--env arg=dev " ]; then
    fail "$name" "wrangler was called with: $args"
  elif ! grep -q "^cwd=.*/apps/gateway$" "$WRANGLER_LOG"; then
    fail "$name" "wrangler did not run in apps/gateway."
  elif ! valid_private_jwk "$WRANGLER_STDIN"; then
    fail "$name" "wrangler was not given a valid Ed25519 private JWK."
  else
    pass "$name"
  fi
  teardown
}

test_key_never_shown() {
  local name="FR-00006: the script never shows any part of the key"
  setup
  run_in_terminal "yes"
  local d x
  d="$(jwk_field "$WRANGLER_STDIN" d)"
  x="$(jwk_field "$WRANGLER_STDIN" x)"
  if [ -z "$d" ] || [ -z "$x" ]; then
    fail "$name" "No key was made."
  elif printf '%s' "$OUTPUT" | grep -qF -- "$d" || printf '%s' "$OUTPUT" | grep -qF -- "$x" ||
    printf '%s' "$OUTPUT" | grep -qF -- "${d:0:12}"; then
    fail "$name" "The output contains part of the key."
  elif find "$WORK" -type f ! -name wrangler.stdin -exec grep -lF -- "$d" {} + | grep -q .; then
    fail "$name" "The key was written to a file other than Wrangler's input."
  else
    pass "$name"
  fi
  teardown
}

test_new_key_each_time() {
  local name="FR-00006: each run makes a different key"
  setup
  run_in_terminal "yes"
  local first second
  first="$(jwk_field "$WRANGLER_STDIN" d)"
  run_in_terminal "yes"
  second="$(jwk_field "$WRANGLER_STDIN" d)"
  if [ -z "$first" ] || [ "$first" = "$second" ]; then
    fail "$name" "Two runs gave the same key, or none."
  else
    pass "$name"
  fi
  teardown
}

test_only_signing_key() {
  local name="FR-00006: the script sets no other secret, such as the Google client secret"
  local code
  code="$(grep -v '^[[:space:]]*#' "$SCRIPT")"
  if printf '%s\n' "$code" | grep -q 'secret put.*GOOGLE'; then
    fail "$name" "It sets GOOGLE_OAUTH_CLIENT_SECRET."
  elif [ "$(printf '%s\n' "$code" | grep -c 'secret put')" -ne 1 ]; then
    fail "$name" "It runs wrangler secret put more than once."
  else
    pass "$name"
  fi
}

test_local_dev_vars() {
  local name="FR-00006: --local writes apps/gateway/.dev.vars with a private key, readable only by its owner, and never overwrites it"
  setup
  local file="$WORK/apps/gateway/.dev.vars"
  OUTPUT="$(PATH="$WORK/fakebin:$PATH" bash "$COPY" --local 2>&1)"
  STATUS=$?
  local jwk_file="$WORK/jwk.json"
  sed -n 's/^ACCESS_TOKEN_SIGNING_KEY=//p' "$file" 2>/dev/null >"$jwk_file"
  if [ "$STATUS" -ne 0 ] || [ ! -f "$file" ]; then
    fail "$name" "It did not write .dev.vars: $OUTPUT"
  elif ! valid_private_jwk "$jwk_file"; then
    fail "$name" ".dev.vars does not hold a valid Ed25519 private JWK."
  elif ! grep -q '^GOOGLE_OAUTH_CLIENT_SECRET=local-placeholder-not-a-secret$' "$file"; then
    fail "$name" ".dev.vars has no placeholder Google client secret."
  elif [ "$(stat -c %a "$file")" != "600" ]; then
    fail "$name" ".dev.vars can be read by others ($(stat -c %a "$file"))."
  elif [ -s "$WRANGLER_LOG" ]; then
    fail "$name" "--local called wrangler."
  elif printf '%s' "$OUTPUT" | grep -qF -- "$(jwk_field "$jwk_file" d)"; then
    fail "$name" "--local showed the key."
  else
    local before
    before="$(cat "$file")"
    if PATH="$WORK/fakebin:$PATH" bash "$COPY" --local >/dev/null 2>&1 || [ "$(cat "$file")" != "$before" ]; then
      fail "$name" "A second --local overwrote .dev.vars or exited 0."
    else
      pass "$name"
    fi
  fi
  teardown
}

echo "FR-00006 tests for the signing-key script"
echo

if ! command -v node >/dev/null 2>&1 || ! command -v script >/dev/null 2>&1 || ! command -v setsid >/dev/null 2>&1; then
  echo "BLOCKED Node.js, script, or setsid is not installed."
  exit 2
fi
if [ ! -x "$SCRIPT" ]; then
  echo "FAIL    FR-00006: devops/player-identity/new-signing-key.sh exists and is executable"
  exit 1
fi

test_refuses_without_terminal
test_refuses_without_yes
test_stores_key
test_key_never_shown
test_new_key_each_time
test_only_signing_key
test_local_dev_vars

echo
echo "Passed: $passed  Failed: $failed"
if [ "$failed" -gt 0 ]; then exit 1; fi
exit 0
