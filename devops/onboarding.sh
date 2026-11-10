#!/usr/bin/env bash
# FR-00000 onboarding check, extended by FR-00001, FR-00002, FR-00003, and
# FR-00005.
#
# Checks that this machine has the packages and access needed to run
# Terraform, build and test the Workers, deploy Content Studio, and build the
# Godot game client for Dungeon Destiny.
#
# Guided mode (the default in a terminal, or --guided) walks through each
# failed check and asks Yes or No before running an install command, creating
# the credential file, or storing a value. Check-only mode (--check, or no
# terminal) only reads and never prompts. Credential values are never printed.
#
# Manual setup steps: doc/howto-cloudflare-setup.md
# Usage: devops/onboarding.sh [--guided | --check]
# Exit status: 0 when every check passes, 1 when any check still fails,
# 2 for an unknown argument.

# The check_* and fix_* functions are called by name from a loop, which
# ShellCheck cannot follow (SC2317 in 0.9 and 0.10, SC2329 in 0.11).
# shellcheck disable=SC2317,SC2329

set -u

readonly MIN_TERRAFORM="1.11.0"
readonly MIN_CURL="7.75.0"
readonly NODE_MAJOR="24"
# FR-00005: the game-client toolchain. devops/game-client/build-apk.sh uses the
# same versions and locations.
readonly GODOT_VERSION="4.6.3"
readonly GODOT_RELEASE="https://github.com/godotengine/godot/releases/download/$GODOT_VERSION-stable"
readonly GODOT_DIR="$HOME/.local/opt/godot/$GODOT_VERSION"
readonly GODOT_LINK="$HOME/.local/bin/godot"
readonly GODOT_TEMPLATES="$HOME/.local/share/godot/export_templates/$GODOT_VERSION.stable"
readonly JDK_MAJOR="17"
readonly ANDROID_SDK="${ANDROID_HOME:-$HOME/Android/Sdk}"
readonly ANDROID_PLATFORM="android-36"
readonly ANDROID_BUILD_TOOLS="36.0.0"
# Ubuntu's installer package for Google's Android command-line tools, which
# provide sdkmanager. It downloads them from Google and checks their checksum.
readonly ANDROID_CMDLINE_TOOLS_PACKAGE="google-android-cmdline-tools-13.0-installer"
# pnpm's standalone installer uses this folder. pnpm 12 puts the pnpm command
# in its bin folder; older installers put it in the folder itself.
readonly PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
add_pnpm_to_path() {
  [ -x "$PNPM_HOME/pnpm" ] && PATH="$PNPM_HOME:$PATH"
  [ -x "$PNPM_HOME/bin/pnpm" ] && PATH="$PNPM_HOME/bin:$PATH"
  export PATH
}
add_pnpm_to_path
readonly STATE_BUCKET="dd-terraform-state"
readonly CRED_DIR="$HOME/.config/dungeon-destiny"
readonly CRED_FILE="$CRED_DIR/cloudflare.env"
# R2 requires the x-amz-content-sha256 header on signed requests, and curl
# before 8.x does not add it. This is the SHA-256 of an empty request body.
readonly EMPTY_BODY_SHA256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
# STUDIO_SUPERADMIN_EMAIL (FR-00003) is the Content Studio SuperAdmin. It is kept
# here because the repository is public.
readonly REQUIRED_VARS=(CLOUDFLARE_EMAIL CLOUDFLARE_API_KEY CLOUDFLARE_ACCOUNT_ID AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY STUDIO_SUPERADMIN_EMAIL)

script_dir="${BASH_SOURCE[0]%/*}"
[ "$script_dir" = "${BASH_SOURCE[0]}" ] && script_dir="."
REPO_ROOT="$(cd "$script_dir/.." && pwd)"
readonly GUIDE="$REPO_ROOT/doc/howto-cloudflare-setup.md"

case "${1:-}" in
  --guided) guided=true ;;
  --check) guided=false ;;
  "") if [ -t 0 ]; then guided=true; else guided=false; fi ;;
  *)
    echo "Usage: devops/onboarding.sh [--guided | --check]" >&2
    exit 2
    ;;
esac

passed=0
failed=0
skipped=0
curl_ok=false
creds_loaded=false

# Each check sets MSG, and HINT when it fails, and returns 0 (pass),
# 1 (fail), or 2 (skip).
MSG=""
HINT=""

has() { command -v "$1" >/dev/null 2>&1; }

# True when version $1 is at least version $2.
version_at_least() {
  [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n 1)" = "$2" ]
}

# Ask a Yes/No question. Only Yes returns true; an empty answer is No.
ask() {
  local answer
  printf '%s [y/N] ' "$1"
  if ! IFS= read -r answer; then
    echo
    return 1
  fi
  # A terminal echoes the answer and its line break; piped input does not.
  [ -t 0 ] || echo
  case "$answer" in
    [Yy] | [Yy][Ee][Ss]) return 0 ;;
    *) return 1 ;;
  esac
}

# Read a value typed straight at its prompt. Keys are read without being
# shown; email addresses are shown as they are typed. Enter alone skips.
read_value() {
  local __var="$1" __value
  if [ "$__var" = "CLOUDFLARE_EMAIL" ] || [ "$__var" = "STUDIO_SUPERADMIN_EMAIL" ]; then
    printf '      Enter %s (press Enter to skip): ' "$__var"
    IFS= read -r __value || __value=""
    [ -t 0 ] || echo
  else
    printf '      Enter %s (input is hidden, press Enter to skip): ' "$__var"
    IFS= read -r -s __value || __value=""
    echo
  fi
  if [ -z "$__value" ]; then
    echo "      Skipped."
    return 1
  fi
  printf -v "$__var" '%s' "$__value"
  export "${__var?}"
}

# Write one value to the credential file, replacing any earlier line for it.
store_value() {
  local var="$1" tmp
  tmp="$(mktemp "$CRED_DIR/.cloudflare.env.XXXXXX")" || return 1
  grep -v "^export $var=" "$CRED_FILE" >"$tmp" 2>/dev/null
  printf 'export %s=%q\n' "$var" "${!var}" >>"$tmp"
  mv "$tmp" "$CRED_FILE"
  chmod 600 "$CRED_FILE"
}

# Run a check; in guided mode, offer its fix and check again after the fix.
# Usage: run CHECK FIX [ARGUMENT]. The argument is passed to both functions.
run() {
  local check="$1" fix="$2" result
  shift 2
  "$check" "$@"
  result=$?
  if [ "$result" -eq 1 ] && [ "$guided" = true ]; then
    echo "      $MSG"
    if "$fix" "$@"; then
      hash -r
      "$check" "$@"
      result=$?
    fi
  fi
  case "$result" in
    0) passed=$((passed + 1)); echo "PASS  $MSG" ;;
    1) failed=$((failed + 1)); echo "FAIL  $MSG"; echo "      Fix: $HINT" ;;
    *) skipped=$((skipped + 1)); echo "SKIP  $MSG" ;;
  esac
}

install_package() {
  local package="$1"
  ask "      Install $package with 'sudo apt-get install -y $package'?" || return 1
  sudo apt-get install -y "$package"
}

# --- Packages ---------------------------------------------------------------

check_jq() {
  if has jq; then MSG="jq is installed"; return 0; fi
  MSG="jq is not installed"
  HINT="sudo apt-get install -y jq (see $GUIDE, step 2)"
  return 1
}
fix_jq() { install_package jq; }

check_terraform() {
  if ! has terraform; then
    MSG="Terraform is not installed"
    HINT="install Terraform $MIN_TERRAFORM or later (see $GUIDE, step 1)"
    return 1
  fi
  if ! has jq; then
    MSG="Terraform version not checked: jq is needed to read it"
    return 2
  fi
  local version
  version="$(terraform version -json 2>/dev/null | jq -r '.terraform_version' 2>/dev/null)"
  if [ -z "$version" ] || [ "$version" = "null" ]; then
    MSG="Terraform version could not be read"
    HINT="reinstall Terraform (see $GUIDE, step 1)"
    return 1
  fi
  if version_at_least "$version" "$MIN_TERRAFORM"; then
    MSG="Terraform $version is installed (need $MIN_TERRAFORM or later)"
    return 0
  fi
  MSG="Terraform $version is too old (need $MIN_TERRAFORM or later)"
  HINT="upgrade Terraform (see $GUIDE, step 1)"
  return 1
}

fix_terraform() {
  echo "      This runs the commands from $GUIDE, step 1:"
  echo "      it adds HashiCorp's apt repository and installs Terraform."
  ask "      Install Terraform now?" || return 1
  local codename
  codename="$(grep -oP '(?<=UBUNTU_CODENAME=).*' /etc/os-release 2>/dev/null || lsb_release -cs)"
  wget -O - https://apt.releases.hashicorp.com/gpg |
    sudo gpg --batch --yes --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg &&
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $codename main" |
    sudo tee /etc/apt/sources.list.d/hashicorp.list >/dev/null &&
    sudo apt-get update &&
    sudo apt-get install -y terraform
}

check_curl() {
  if ! has curl; then
    MSG="curl is not installed"
    HINT="sudo apt-get install -y curl"
    return 1
  fi
  local version
  version="$(curl --version 2>/dev/null | head -n 1 | cut -d ' ' -f 2)"
  if [ -n "$version" ] && version_at_least "$version" "$MIN_CURL"; then
    MSG="curl $version is installed (need $MIN_CURL or later)"
    curl_ok=true
    return 0
  fi
  MSG="curl ${version:-unknown} is too old (need $MIN_CURL or later)"
  HINT="sudo apt-get install -y curl"
  return 1
}
fix_curl() { install_package curl; }

check_shellcheck() {
  if has shellcheck; then MSG="ShellCheck is installed"; return 0; fi
  MSG="ShellCheck is not installed"
  HINT="sudo apt-get install -y shellcheck (see $GUIDE, step 2)"
  return 1
}
fix_shellcheck() { install_package shellcheck; }

check_git() {
  if has git; then MSG="git is installed"; return 0; fi
  MSG="git is not installed"
  HINT="sudo apt-get install -y git"
  return 1
}
fix_git() { install_package git; }

# --- GitHub CLI (FR-00002) ---------------------------------------------------

check_gh() {
  if has gh; then MSG="GitHub CLI (gh) is installed"; return 0; fi
  MSG="GitHub CLI (gh) is not installed"
  HINT="install it from GitHub's apt repository (see $GUIDE)"
  return 1
}

fix_gh() {
  echo "      This adds GitHub's apt repository and installs the GitHub CLI, gh."
  ask "      Install the GitHub CLI now?" || return 1
  local keyring
  keyring="$(mktemp)" || return 1
  sudo mkdir -p -m 755 /etc/apt/keyrings &&
    wget -nv -O"$keyring" https://cli.github.com/packages/githubcli-archive-keyring.gpg &&
    sudo install -m 644 "$keyring" /etc/apt/keyrings/githubcli-archive-keyring.gpg &&
    sudo mkdir -p -m 755 /etc/apt/sources.list.d &&
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" |
    sudo tee /etc/apt/sources.list.d/github-cli.list >/dev/null &&
    sudo apt-get update &&
    sudo apt-get install -y gh
  local result=$?
  rm -f "$keyring"
  return "$result"
}

# Checks the sign-in through gh's exit status only; gh's own output, which
# describes the account and token, is never shown.
check_gh_auth() {
  if ! has gh; then
    MSG="GitHub CLI sign-in not checked: gh is not installed"
    return 2
  fi
  if gh auth status >/dev/null 2>&1; then
    MSG="GitHub CLI (gh) is signed in"
    return 0
  fi
  MSG="GitHub CLI (gh) is not signed in"
  HINT="run 'gh auth login' in a terminal and follow its steps"
  return 1
}

fix_gh_auth() {
  echo "      Signing in is interactive, so this script cannot do it for you. In another"
  echo "      terminal, run 'gh auth login': choose GitHub.com, SSH, and Login with a"
  echo "      web browser, and enter the one-time code it shows on github.com."
  ask "      Have you run 'gh auth login'?" || return 1
  return 0
}

# --- Node.js, pnpm, and project dependencies (FR-00001) --------------------

# The pnpm version pinned in the workspace's package.json, or nothing when
# there is no workspace yet.
pinned_pnpm() {
  [ -f "$REPO_ROOT/package.json" ] && has jq || return 0
  jq -r '.packageManager // empty' "$REPO_ROOT/package.json" 2>/dev/null | sed 's/^pnpm@//'
}

check_node() {
  if ! has node; then
    MSG="Node.js is not installed"
    HINT="install Node.js $NODE_MAJOR (see $GUIDE)"
    return 1
  fi
  local version
  version="$(node --version 2>/dev/null)"
  if [ "${version%%.*}" = "v$NODE_MAJOR" ]; then
    MSG="Node.js $NODE_MAJOR is installed ($version)"
    return 0
  fi
  MSG="Node.js ${version:-unknown} is installed, but version $NODE_MAJOR is required"
  HINT="install Node.js $NODE_MAJOR (see $GUIDE)"
  return 1
}

fix_node() {
  echo "      This adds NodeSource's apt repository for Node.js $NODE_MAJOR and installs it."
  ask "      Install Node.js $NODE_MAJOR now?" || return 1
  local setup
  setup="$(mktemp "${TMPDIR:-/tmp}/nodesource_setup.XXXXXX")" || return 1
  curl -fsSL "https://deb.nodesource.com/setup_$NODE_MAJOR.x" -o "$setup" &&
    sudo -E bash "$setup" &&
    sudo apt-get install -y nodejs
  local result=$?
  rm -f "$setup"
  return "$result"
}

check_pnpm() {
  local pin version
  pin="$(pinned_pnpm)"
  if ! has pnpm; then
    MSG="pnpm is not installed"
    HINT="install pnpm ${pin:-} with its standalone installer (see $GUIDE)"
    return 1
  fi
  version="$(pnpm --version 2>/dev/null)"
  if [ -z "$pin" ] || [ "$version" = "$pin" ]; then
    MSG="pnpm $version is installed${pin:+ (pinned $pin)}"
    return 0
  fi
  MSG="pnpm $version is installed, but the workspace pins $pin"
  HINT="install pnpm $pin with its standalone installer (see $GUIDE)"
  return 1
}

fix_pnpm() {
  local pin
  pin="$(pinned_pnpm)"
  echo "      This runs pnpm's standalone installer in your home folder. It needs no sudo."
  ask "      Install pnpm ${pin:-(latest)} now?" || return 1
  if [ -n "$pin" ]; then
    curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION="$pin" sh -
  else
    curl -fsSL https://get.pnpm.io/install.sh | sh -
  fi
  add_pnpm_to_path
  echo "      Terminals that are already open cannot find pnpm yet. Open a new"
  echo "      terminal, or run 'source ~/.bashrc', before using pnpm."
}

check_dependencies() {
  if [ ! -f "$REPO_ROOT/package.json" ]; then
    MSG="project dependencies not checked: there is no pnpm workspace yet"
    return 2
  fi
  if [ -f "$REPO_ROOT/node_modules/.modules.yaml" ]; then
    MSG="project dependencies are installed"
    return 0
  fi
  MSG="project dependencies are not installed"
  HINT="run 'pnpm install --frozen-lockfile' in $REPO_ROOT"
  return 1
}

fix_dependencies() {
  has pnpm || return 1
  ask "      Install the project dependencies with 'pnpm install --frozen-lockfile'?" || return 1
  (cd "$REPO_ROOT" && pnpm install --frozen-lockfile)
}

# --- Playwright's Chromium (FR-00003) ----------------------------------------

check_chromium() {
  if [ ! -x "$REPO_ROOT/node_modules/.bin/playwright" ]; then
    MSG="Playwright's Chromium not checked: Playwright is not installed in the workspace"
    return 2
  fi
  local browsers="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
  if compgen -G "$browsers/chromium-*" >/dev/null; then
    MSG="Playwright's Chromium is installed"
    return 0
  fi
  MSG="Playwright's Chromium is not installed"
  HINT="run 'pnpm exec playwright install --with-deps chromium' in $REPO_ROOT"
  return 1
}

fix_chromium() {
  has pnpm || return 1
  echo "      This downloads Chromium for the end-to-end tests into your home folder,"
  echo "      and installs the system libraries it needs with sudo."
  ask "      Install it with 'pnpm exec playwright install --with-deps chromium'?" || return 1
  (cd "$REPO_ROOT" && pnpm exec playwright install --with-deps chromium)
}

# --- Game-client toolchain (FR-00005) ------------------------------------------

godot_bin() {
  if [ -n "${GODOT:-}" ]; then echo "$GODOT"; elif [ -x "$GODOT_LINK" ]; then echo "$GODOT_LINK"; else command -v godot; fi
}

check_godot() {
  local bin version
  bin="$(godot_bin)"
  if [ -z "$bin" ] || [ ! -x "$bin" ]; then
    MSG="Godot $GODOT_VERSION is not installed"
    HINT="run devops/onboarding.sh and answer Yes to install Godot $GODOT_VERSION"
    return 1
  fi
  version="$("$bin" --headless --version 2>/dev/null | tail -n 1)"
  case "$version" in
    "$GODOT_VERSION".*) MSG="Godot $GODOT_VERSION is installed ($bin)"; return 0 ;;
  esac
  MSG="Godot ${version:-unknown} is installed, but version $GODOT_VERSION is required"
  HINT="run devops/onboarding.sh and answer Yes to install Godot $GODOT_VERSION"
  return 1
}

# Downloads one file of the Godot release and checks it against the release's
# SHA-512 list. Usage: godot_download NAME DIR
godot_download() {
  local name="$1" dir="$2" expected
  curl -fL --progress-bar -o "$dir/$name" "$GODOT_RELEASE/$name" &&
    curl -fsSL -o "$dir/SHA512-SUMS.txt" "$GODOT_RELEASE/SHA512-SUMS.txt" || return 1
  expected="$(awk -v n="$name" '$2 == n {print $1}' "$dir/SHA512-SUMS.txt")"
  if [ -z "$expected" ] || [ "$(sha512sum "$dir/$name" | awk '{print $1}')" != "$expected" ]; then
    echo "      The SHA-512 checksum of $name does not match; nothing was installed."
    return 1
  fi
}

fix_godot() {
  local zip="Godot_v$GODOT_VERSION-stable_linux.x86_64.zip" tmp
  echo "      This downloads Godot $GODOT_VERSION (about 72 MB) from Godot's GitHub releases,"
  echo "      checks its SHA-512 checksum, installs it in $GODOT_DIR,"
  echo "      and links it as $GODOT_LINK. It needs no sudo."
  ask "      Install Godot $GODOT_VERSION now?" || return 1
  tmp="$(mktemp -d)" || return 1
  if godot_download "$zip" "$tmp" && unzip -q -o "$tmp/$zip" -d "$tmp"; then
    mkdir -p "$GODOT_DIR" "$(dirname "$GODOT_LINK")" &&
      mv "$tmp/Godot_v$GODOT_VERSION-stable_linux.x86_64" "$GODOT_DIR/godot" &&
      chmod +x "$GODOT_DIR/godot" &&
      ln -sf "$GODOT_DIR/godot" "$GODOT_LINK"
  fi
  local result=$?
  rm -rf "$tmp"
  case ":$PATH:" in
    *":$(dirname "$GODOT_LINK"):"*) ;;
    *) echo "      $(dirname "$GODOT_LINK") is not on your PATH yet; open a new terminal." ;;
  esac
  return "$result"
}

check_godot_templates() {
  if [ -f "$GODOT_TEMPLATES/android_debug.apk" ]; then
    MSG="Godot's Android export templates for $GODOT_VERSION are installed"
    return 0
  fi
  MSG="Godot's Android export templates for $GODOT_VERSION are not installed"
  HINT="run devops/onboarding.sh and answer Yes to install the export templates"
  return 1
}

fix_godot_templates() {
  local tpz="Godot_v$GODOT_VERSION-stable_export_templates.tpz" tmp
  echo "      This downloads Godot's export templates (about 1.26 GB) from Godot's GitHub"
  echo "      releases, checks the SHA-512 checksum, and keeps only the Android templates"
  echo "      in $GODOT_TEMPLATES. It needs no sudo."
  ask "      Download the export templates now?" || return 1
  tmp="$(mktemp -d)" || return 1
  godot_download "$tpz" "$tmp" &&
    mkdir -p "$GODOT_TEMPLATES" &&
    unzip -q -o -j "$tmp/$tpz" 'templates/android_*' 'templates/version.txt' -d "$GODOT_TEMPLATES"
  local result=$?
  rm -rf "$tmp"
  return "$result"
}

check_jdk() {
  local javac version
  if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/javac" ]; then javac="$JAVA_HOME/bin/javac"; else javac="$(command -v javac)"; fi
  if [ -z "$javac" ]; then
    MSG="JDK $JDK_MAJOR is not installed"
    HINT="sudo apt-get install -y openjdk-$JDK_MAJOR-jdk-headless"
    return 1
  fi
  version="$("$javac" -version 2>&1 | awk '{print $2}')"
  if [ "${version%%.*}" = "$JDK_MAJOR" ]; then
    MSG="JDK $JDK_MAJOR is installed ($version)"
    return 0
  fi
  MSG="JDK ${version:-unknown} is installed, but JDK $JDK_MAJOR is required"
  HINT="sudo apt-get install -y openjdk-$JDK_MAJOR-jdk-headless, and set JAVA_HOME to it"
  return 1
}

fix_jdk() { install_package "openjdk-$JDK_MAJOR-jdk-headless"; }

check_android_sdk() {
  local part missing=""
  for part in "platform-tools/adb" "build-tools/$ANDROID_BUILD_TOOLS/apksigner" "platforms/$ANDROID_PLATFORM"; do
    [ -e "$ANDROID_SDK/$part" ] || missing="$missing $part"
  done
  if [ -z "$missing" ]; then
    MSG="the Android SDK is installed in $ANDROID_SDK ($ANDROID_PLATFORM, build tools $ANDROID_BUILD_TOOLS)"
    return 0
  fi
  MSG="the Android SDK in $ANDROID_SDK is missing:$missing (need $ANDROID_PLATFORM, build tools $ANDROID_BUILD_TOOLS)"
  HINT="sudo apt-get install -y $ANDROID_CMDLINE_TOOLS_PACKAGE, then sdkmanager --sdk_root=$ANDROID_SDK platform-tools 'platforms;$ANDROID_PLATFORM' 'build-tools;$ANDROID_BUILD_TOOLS'"
  return 1
}

# The sdkmanager command: on PATH, or in Google's command-line tools that
# Ubuntu's installer package puts under /usr/lib/android-sdk.
sdkmanager_bin() {
  if has sdkmanager; then
    command -v sdkmanager
    return
  fi
  local candidate found=""
  for candidate in /usr/lib/android-sdk/cmdline-tools/*/bin/sdkmanager; do
    [ -x "$candidate" ] && found="$(printf '%s\n%s\n' "$found" "$candidate" | sort -V | tail -n 1)"
  done
  [ -n "$found" ] && echo "$found"
}

fix_android_sdk() {
  local sdkmanager
  sdkmanager="$(sdkmanager_bin)"
  if [ -z "$sdkmanager" ]; then
    echo "      The Android SDK is installed with sdkmanager, from Google's Android command-line"
    echo "      tools. Ubuntu's $ANDROID_CMDLINE_TOOLS_PACKAGE package downloads them."
    install_package "$ANDROID_CMDLINE_TOOLS_PACKAGE" || return 1
    hash -r
    sdkmanager="$(sdkmanager_bin)"
    if [ -z "$sdkmanager" ]; then
      echo "      sdkmanager was not found after the install."
      return 1
    fi
  fi
  echo "      This downloads platform-tools, $ANDROID_PLATFORM, and build tools $ANDROID_BUILD_TOOLS from"
  echo "      Google into $ANDROID_SDK. Google's Android SDK licence is shown first;"
  echo "      read it and answer its questions yourself."
  ask "      Install the Android SDK now?" || return 1
  mkdir -p "$ANDROID_SDK" &&
    "$sdkmanager" --sdk_root="$ANDROID_SDK" --licenses &&
    "$sdkmanager" --sdk_root="$ANDROID_SDK" "platform-tools" "platforms;$ANDROID_PLATFORM" "build-tools;$ANDROID_BUILD_TOOLS"
}

# --- Credential file and values ----------------------------------------------

check_credential_file() {
  creds_loaded=false
  if [ ! -f "$CRED_FILE" ]; then
    MSG="credential file $CRED_FILE does not exist"
    HINT="create it (see $GUIDE, step 8)"
    return 1
  fi
  local mode
  mode="$(stat -c '%a' "$CRED_FILE")"
  if [ "${mode: -2}" != "00" ]; then
    MSG="credential file is readable by others (mode $mode)"
    HINT="chmod 600 $CRED_FILE"
    return 1
  fi
  # shellcheck source=/dev/null
  if ! source "$CRED_FILE"; then
    MSG="credential file could not be read"
    HINT="check its contents (see $GUIDE, step 8)"
    return 1
  fi
  creds_loaded=true
  MSG="credential file exists and only its owner can read it"
  return 0
}

fix_credential_file() {
  if [ ! -f "$CRED_FILE" ]; then
    ask "      Create $CRED_FILE now (folder mode 700, file mode 600)?" || return 1
    mkdir -p "$CRED_DIR" && chmod 700 "$CRED_DIR" &&
      (umask 077 && : >"$CRED_FILE") && chmod 600 "$CRED_FILE"
  else
    ask "      Make the credential file readable only by you (chmod 600)?" || return 1
    chmod 700 "$CRED_DIR" && chmod 600 "$CRED_FILE"
  fi
}

where_to_find() {
  case "$1" in
    CLOUDFLARE_EMAIL)
      echo "      Where to find it: the email address you use to sign in to Cloudflare." ;;
    CLOUDFLARE_API_KEY)
      echo "      Where to find it: Cloudflare dashboard > User Profile > API Tokens >"
      echo "      API Keys > View next to Global API Key ($GUIDE, step 6)." ;;
    CLOUDFLARE_ACCOUNT_ID)
      echo "      Where to find it: Cloudflare dashboard > Account home > Search (CTRL + K) >"
      echo "      enter 'Copy account ID' and select the result ($GUIDE, step 7)." ;;
    AWS_ACCESS_KEY_ID)
      echo "      The R2 keys exist only after these Cloudflare dashboard steps ($GUIDE, steps 3 to 5):"
      echo "        1. Storage & databases > R2 > Overview: add R2 to the account if it is not added yet."
      echo "        2. R2 object storage > Create bucket: name $STATE_BUCKET, Location None, Create bucket."
      echo "        3. R2 object storage > Account Details > Manage next to API Tokens >"
      echo "           Create Account API token: permission Object Read & Write, limited to the"
      echo "           $STATE_BUCKET bucket only, then Create Account API token."
      echo "      The next page shows the Access Key ID and the Secret Access Key, only once."
      echo "      Keep it open until both are entered. If you have not done these steps yet,"
      echo "      press Enter to skip, do them, and run this script again."
      echo "      Where to find it: the Access Key ID on that page. This is an R2 key, not an AWS key." ;;
    AWS_SECRET_ACCESS_KEY)
      echo "      Where to find it: the Secret Access Key shown once when you created the R2 API"
      echo "      token ($GUIDE, step 5). If you no longer have it, delete the token and create"
      echo "      a new one." ;;
    STUDIO_SUPERADMIN_EMAIL)
      echo "      What it is: the email address of the Content Studio SuperAdmin, who can always"
      echo "      sign in. It is kept only in this file, never in the repository ($GUIDE, step 11)." ;;
  esac
}

# Explain where to find a value, then read it and store it.
enter_value() {
  local var="$1"
  where_to_find "$var"
  read_value "$var" || return 1
  store_value "$var"
}

# True when the value is a plain ASCII email address, with no spaces or hidden
# characters. A hidden byte in an email address breaks pnpm and Terraform.
is_plain_email() {
  local LC_ALL=C
  [[ "$1" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]
}

check_value() {
  local var="$1"
  if [ "$creds_loaded" != true ]; then
    MSG="$var not checked: the credential file is missing or unsafe"
    return 2
  fi
  if [ "$var" = "STUDIO_SUPERADMIN_EMAIL" ] && [ -n "${!var:-}" ] && ! is_plain_email "${!var}"; then
    MSG="$var is not a plain email address (it may contain a space or a hidden character)"
    HINT="retype the line in $CRED_FILE without copy and paste (see $GUIDE, step 8)"
    return 1
  fi
  if [ -n "${!var:-}" ]; then
    MSG="$var is set"
    return 0
  fi
  MSG="$var is not set in the credential file"
  HINT="add it (see $GUIDE, step 8)"
  return 1
}
fix_value() { enter_value "$1"; }

# --- Cloudflare and R2 access ------------------------------------------------

# Run curl with its configuration on standard input, so no credential appears
# in the command line. Prints the HTTP status code.
curl_status() {
  curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
    --max-time 20 --config - 2>/dev/null
}

check_cloudflare() {
  if [ "$curl_ok" != true ]; then
    MSG="Cloudflare access not checked: curl $MIN_CURL or later is needed"
    return 2
  fi
  if [ "$creds_loaded" != true ] || [ -z "${CLOUDFLARE_EMAIL:-}" ] || [ -z "${CLOUDFLARE_API_KEY:-}" ]; then
    MSG="Cloudflare access not checked: CLOUDFLARE_EMAIL and CLOUDFLARE_API_KEY are needed"
    return 2
  fi
  local status
  status="$(curl_status <<EOF
url = "https://api.cloudflare.com/client/v4/user"
header = "X-Auth-Email: $CLOUDFLARE_EMAIL"
header = "X-Auth-Key: $CLOUDFLARE_API_KEY"
EOF
)"
  if [ "$status" = "200" ]; then
    MSG="Cloudflare accepts the Global API Key and account email"
    return 0
  fi
  MSG="Cloudflare rejected the Global API Key or account email (HTTP $status)"
  HINT="check both values (see $GUIDE, step 6)"
  return 1
}

fix_cloudflare() {
  echo "      Check that your Cloudflare email address is verified and that the Global"
  echo "      API Key is the current one ($GUIDE, step 6)."
  ask "      Is that step done?" || return 1
  if ask "      Re-enter CLOUDFLARE_EMAIL and CLOUDFLARE_API_KEY?"; then
    enter_value CLOUDFLARE_EMAIL
    enter_value CLOUDFLARE_API_KEY
  fi
  return 0
}

check_r2() {
  if [ "$curl_ok" != true ]; then
    MSG="R2 access not checked: curl $MIN_CURL or later is needed"
    return 2
  fi
  if [ "$creds_loaded" != true ] || [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ] ||
    [ -z "${AWS_ACCESS_KEY_ID:-}" ] || [ -z "${AWS_SECRET_ACCESS_KEY:-}" ]; then
    MSG="R2 access not checked: CLOUDFLARE_ACCOUNT_ID, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY are needed"
    return 2
  fi
  local status
  status="$(curl_status <<EOF
url = "https://$CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com/$STATE_BUCKET?list-type=2&max-keys=1"
user = "$AWS_ACCESS_KEY_ID:$AWS_SECRET_ACCESS_KEY"
aws-sigv4 = "aws:amz:auto:s3"
header = "x-amz-content-sha256: $EMPTY_BODY_SHA256"
EOF
)"
  if [ "$status" = "200" ]; then
    MSG="R2 access key pair can list the $STATE_BUCKET bucket"
    return 0
  fi
  MSG="R2 rejected the access key pair or the bucket was not found (HTTP $status)"
  HINT="check the bucket, the account ID, and the R2 token (see $GUIDE, steps 4, 5, and 7)"
  return 1
}

fix_r2() {
  echo "      Check in the Cloudflare dashboard that the $STATE_BUCKET bucket exists and that"
  echo "      the R2 API token has Object Read & Write on it ($GUIDE, steps 4 and 5)."
  ask "      Is that step done?" || return 1
  if ask "      Re-enter CLOUDFLARE_ACCOUNT_ID, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY?"; then
    enter_value CLOUDFLARE_ACCOUNT_ID
    enter_value AWS_ACCESS_KEY_ID
    enter_value AWS_SECRET_ACCESS_KEY
  fi
  return 0
}

# --- Cloudflare Zero Trust (FR-00003) ---------------------------------------

# Zero Trust is turned on when the account has an Access organization.
check_zero_trust() {
  if [ "$curl_ok" != true ]; then
    MSG="Cloudflare Zero Trust not checked: curl $MIN_CURL or later is needed"
    return 2
  fi
  if [ "$creds_loaded" != true ] || [ -z "${CLOUDFLARE_EMAIL:-}" ] ||
    [ -z "${CLOUDFLARE_API_KEY:-}" ] || [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
    MSG="Cloudflare Zero Trust not checked: CLOUDFLARE_EMAIL, CLOUDFLARE_API_KEY, and CLOUDFLARE_ACCOUNT_ID are needed"
    return 2
  fi
  local status
  status="$(curl_status <<EOF
url = "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/access/organizations"
header = "X-Auth-Email: $CLOUDFLARE_EMAIL"
header = "X-Auth-Key: $CLOUDFLARE_API_KEY"
EOF
)"
  if [ "$status" = "200" ]; then
    MSG="Cloudflare Zero Trust is turned on"
    return 0
  fi
  MSG="Cloudflare Zero Trust is not turned on (HTTP $status)"
  HINT="turn it on and choose a team name (see $GUIDE, step 11)"
  return 1
}

fix_zero_trust() {
  echo "      Turning on Zero Trust is a manual step in the Cloudflare dashboard: choose"
  echo "      the Free plan and a team name ($GUIDE, step 11)."
  ask "      Is that step done?" || return 1
  return 0
}

# --- Main ---------------------------------------------------------------------

if [ "$guided" = true ]; then
  echo "Dungeon Destiny onboarding check (FR-00000), guided mode"
  echo "Each fix is offered as a question. Press Enter to answer No."
else
  echo "Dungeon Destiny onboarding check (FR-00000), check-only mode"
fi
echo

run check_jq fix_jq
run check_terraform fix_terraform
run check_curl fix_curl
run check_shellcheck fix_shellcheck
run check_git fix_git
run check_gh fix_gh
run check_gh_auth fix_gh_auth
run check_node fix_node
run check_pnpm fix_pnpm
run check_dependencies fix_dependencies
run check_chromium fix_chromium
run check_godot fix_godot
run check_godot_templates fix_godot_templates
run check_jdk fix_jdk
run check_android_sdk fix_android_sdk
run check_credential_file fix_credential_file
for var in "${REQUIRED_VARS[@]}"; do
  run check_value fix_value "$var"
done
run check_cloudflare fix_cloudflare
run check_r2 fix_r2
run check_zero_trust fix_zero_trust

echo
echo "$passed passed, $failed failed, $skipped skipped"
if [ "$failed" -gt 0 ]; then
  exit 1
fi
exit 0
