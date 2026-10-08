#!/usr/bin/env bash
# FR-00001 test: the FR-00000 Terraform test applies only when plan reports no
# changes.
#
# Runs tests/FR-00000/terraform_test.sh with a stand-in terraform whose plan
# always reports changes, a stand-in curl, and a temporary HOME with fake
# credentials. Nothing reaches Cloudflare. Passes when the FR-00000 test never
# runs an unattended "terraform apply -auto-approve".
#
# Usage: tests/FR-00001/terraform_guard_test.sh
# Exit status: 0 when the test passes, 1 when it fails.

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET="$REPO_ROOT/tests/FR-00000/terraform_test.sh"
NAME="FR-00001: the FR-00000 Terraform test applies only when plan reports no changes"

WORK="$(mktemp -d)"
if [ -z "$WORK" ] || [ ! -d "$WORK" ]; then
  echo "Could not create a temporary directory." >&2
  exit 1
fi
trap 'rm -rf "$WORK"' EXIT

FAKEBIN="$WORK/fakebin"
TF_LOG_FILE="$WORK/terraform-args.log"
mkdir -p "$FAKEBIN" "$WORK/home/.config/dungeon-destiny"
export TF_LOG_FILE

# Stand-in terraform: plan always reports changes (exit 2); everything else
# succeeds. Every call is logged.
cat >"$FAKEBIN/terraform" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >>"$TF_LOG_FILE"
case " $* " in
  *" plan "*) echo "Plan: 1 to add, 0 to change, 0 to destroy."; exit 2 ;;
  *" init "*) echo 'Successfully configured the backend "s3"!' ;;
  *" apply "*) cat >/dev/null; echo "Apply complete! Resources: 1 added, 0 changed, 0 destroyed." ;;
esac
exit 0
STUB
# Stand-in curl: the state object exists; no lock file ever appears.
cat >"$FAKEBIN/curl" <<'STUB'
#!/usr/bin/env bash
cat >/dev/null
echo "<ListBucketResult><Key>dev/terraform.tfstate</Key></ListBucketResult>"
STUB
# Stand-in sleep, so the FR-00000 lock test does not wait.
printf '#!/usr/bin/env bash\nexit 0\n' >"$FAKEBIN/sleep"
chmod +x "$FAKEBIN"/*

cat >"$WORK/home/.config/dungeon-destiny/cloudflare.env" <<'CREDS'
export CLOUDFLARE_EMAIL="owner@example.invalid"
export CLOUDFLARE_API_KEY="fake-global-api-key"
export CLOUDFLARE_ACCOUNT_ID="fakeaccountid"
export AWS_ACCESS_KEY_ID="fake-access-key-id"
export AWS_SECRET_ACCESS_KEY="fake-secret"
CREDS
chmod 600 "$WORK/home/.config/dungeon-destiny/cloudflare.env"

HOME="$WORK/home" PATH="$FAKEBIN:$PATH" bash "$TARGET" >"$WORK/output.log" 2>&1

if grep -q -- '-auto-approve' "$TF_LOG_FILE" 2>/dev/null; then
  echo "FAIL    $NAME"
  echo "        terraform apply -auto-approve ran although plan reported changes."
  exit 1
fi
if ! grep -q 'plan' "$TF_LOG_FILE" 2>/dev/null; then
  echo "FAIL    $NAME"
  echo "        The FR-00000 test never ran terraform plan."
  exit 1
fi
echo "PASS    $NAME"
exit 0
