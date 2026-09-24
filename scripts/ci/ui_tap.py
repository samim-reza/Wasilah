#!/usr/bin/env python3
"""
Taps the first on-screen element whose text or description contains the
given words, using uiautomator's view dump. Exits 1 when nothing matches, so
a shell loop can scroll and try again.

    python3 scripts/ci/ui_tap.py "Add to home screen"
"""
import re
import subprocess
import sys
import xml.etree.ElementTree as ET


def dump() -> ET.Element:
    subprocess.run(["adb", "shell", "uiautomator", "dump", "/sdcard/ui.xml"], check=True, capture_output=True)
    raw = subprocess.run(["adb", "shell", "cat", "/sdcard/ui.xml"], check=True, capture_output=True).stdout
    return ET.fromstring(raw)


def screen_height() -> int:
    out = subprocess.run(["adb", "shell", "wm", "size"], check=True, capture_output=True).stdout.decode()
    m = re.search(r"(\d+)x(\d+)", out)
    return int(m.group(2)) if m else 2400


def main() -> int:
    needle = sys.argv[1].lower()
    root = dump()
    for node in root.iter("node"):
        label = f"{node.get('text', '')} {node.get('content-desc', '')}".lower()
        if needle in label:
            m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", node.get("bounds", ""))
            if not m:
                continue
            x1, y1, x2, y2 = map(int, m.groups())
            cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
            # A row still half under the navigation bar is not tappable yet;
            # report it as not found so the caller scrolls and tries again.
            if cy > screen_height() - 260:
                print(f"'{sys.argv[1]}' is at the bottom edge ({cy}); scroll first", file=sys.stderr)
                return 1
            subprocess.run(["adb", "shell", "input", "tap", str(cx), str(cy)], check=True)
            print(f"tapped '{node.get('text') or node.get('content-desc')}' at {cx},{cy}")
            return 0
    print(f"no element containing '{sys.argv[1]}'", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
