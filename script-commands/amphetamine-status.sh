#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Amphetamine: Status
# @raycast.mode inline
# @raycast.refreshTime 1m

# Optional parameters:
# @raycast.icon ☕
# @raycast.packageName Amphetamine
# @raycast.description Show the Amphetamine session countdown inline in Raycast's root search.

if ! osascript -e 'application id "com.if.Amphetamine" is running' | grep -q true; then
  echo "Amphetamine not running"
  exit 0
fi

remaining=$(osascript -e 'tell application "Amphetamine" to session time remaining')
case "$remaining" in
  -3) echo "💤 No session" ;;
  -2) echo "☕ Until an app quits or a set time" ;;
  -1) echo "☕ Trigger session" ;;
  0) echo "☕ Awake indefinitely" ;;
  *) echo "☕ $(( (remaining + 59) / 60 )) min left" ;;
esac
