#!/usr/bin/env bash
# Runs inside the emulator job: installs the APK, places the widget through
# the app's own "Add to home screen" button, and collects what the system
# says about it. Everything lands in widget-check-out/ for the job artifact.
set -uo pipefail

APK="$1"
OUT="widget-check-out"
PKG="com.wasilah.app"
mkdir -p "$OUT"

shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
dumpui() { adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb shell cat /sdcard/ui.xml > "$OUT/$1.xml" 2>/dev/null; }

adb wait-for-device
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard || true

echo "== install"
adb install -r "$APK"
adb logcat -c

echo "== first launch"
adb shell monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 25
shot 01-first-launch

echo "== open settings by deep link"
adb shell am start -W -a android.intent.action.VIEW -d "wasilah://settings" "$PKG" >/dev/null 2>&1
sleep 8
shot 02-settings

echo "== find the add-to-home-screen row"
found=0
for i in $(seq 1 10); do
  if python3 scripts/ci/ui_tap.py "Add to home screen" --scroll-guard; then found=1; break; fi
  adb shell input swipe 540 1900 540 600 400
  sleep 2
done
dumpui settings-ui
if [ "$found" = 0 ]; then echo "row not found"; fi
sleep 5
shot 03-after-tap
dumpui pin-dialog-ui

echo "== confirm the pin dialog"
# The emulator's launcher can stall while it prepares the pin dialog and
# Android offers to close it; waiting it out is what a person would do.
for i in $(seq 1 8); do
  if python3 scripts/ci/ui_tap.py "Wait" 2>/dev/null; then sleep 10; continue; fi
  if python3 scripts/ci/ui_tap.py "Add automatically" \
    || python3 scripts/ci/ui_tap.py "Add to home" \
    || python3 scripts/ci/ui_tap.py "Add"; then break; fi
  sleep 5
done
sleep 15
shot 04-after-confirm

echo "== home screen"
adb shell input keyevent KEYCODE_HOME
sleep 5
shot 05-home
dumpui home-ui
sleep 30
shot 06-home-later

echo "== collect"
adb logcat -d > "$OUT/logcat-full.txt" 2>/dev/null
grep -iE "rnwidget|RNWidget|widget|headless|AndroidRuntime|System.err|FATAL|wasilah|ReactNativeJS" "$OUT/logcat-full.txt" > "$OUT/logcat-widget.txt" 2>/dev/null
adb shell dumpsys appwidget > "$OUT/dumpsys-appwidget.txt" 2>/dev/null
adb shell dumpsys package "$PKG" | grep -iA3 "provider\|receiver" > "$OUT/dumpsys-package-components.txt" 2>/dev/null
echo "== done"
ls -la "$OUT"
