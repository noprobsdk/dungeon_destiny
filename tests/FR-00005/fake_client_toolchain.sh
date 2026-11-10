# shellcheck shell=bash
# FR-00005: a fake game-client toolchain for the onboarding tests, so that the
# checks FR-00005 added to devops/onboarding.sh pass in every test harness.
# Source it, then call fake_client_toolchain after HOME and FAKEBIN are set.
# It installs nothing real: Godot and javac are stand-ins that print a version.

fake_client_toolchain() {
  unset GODOT JAVA_HOME ANDROID_HOME
  mkdir -p "$HOME/.local/bin" "$FAKEBIN"
  printf '#!/usr/bin/env bash\necho "4.6.3.stable.official.7d41c59c4"\n' >"$HOME/.local/bin/godot"
  chmod +x "$HOME/.local/bin/godot"
  mkdir -p "$HOME/.local/share/godot/export_templates/4.6.3.stable"
  touch "$HOME/.local/share/godot/export_templates/4.6.3.stable/android_debug.apk"
  printf '#!/usr/bin/env bash\necho "javac 17.0.12" >&2\n' >"$FAKEBIN/javac"
  chmod +x "$FAKEBIN/javac"
  mkdir -p "$HOME/Android/Sdk/platform-tools" "$HOME/Android/Sdk/build-tools/36.0.0" "$HOME/Android/Sdk/platforms/android-36"
  touch "$HOME/Android/Sdk/platform-tools/adb" "$HOME/Android/Sdk/build-tools/36.0.0/apksigner"
}
