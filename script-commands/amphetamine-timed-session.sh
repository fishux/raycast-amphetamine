#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Amphetamine: Timed Session
# @raycast.mode silent

# Optional parameters:
# @raycast.icon ☕
# @raycast.packageName Amphetamine
# @raycast.argument1 { "type": "text", "placeholder": "Minutes" }
# @raycast.description Keep the Mac awake for N minutes with Amphetamine (0 = indefinitely).

minutes="$1"
if ! [[ "$minutes" =~ ^[0-9]+$ ]]; then
  echo "Enter whole minutes, e.g. 45"
  exit 1
fi

if [ "$minutes" -eq 0 ]; then
  options="{duration:0, interval:0, displaySleepAllowed:false}"
  label="indefinitely"
else
  options="{duration:$minutes, interval:minutes, displaySleepAllowed:false}"
  label="for $minutes min"
fi

osascript -e "tell application \"Amphetamine\" to start new session with options $options" >/dev/null &&
  echo "☕ Awake $label"
