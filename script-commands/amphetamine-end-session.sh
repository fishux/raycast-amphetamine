#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Amphetamine: End Session
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 💤
# @raycast.packageName Amphetamine
# @raycast.description End the current Amphetamine session.

osascript -e 'tell application "Amphetamine" to end session' >/dev/null &&
  echo "💤 Session ended"
