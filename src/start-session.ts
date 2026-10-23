import { LaunchProps, showHUD } from "@raycast/api";
import { parseClockTime, parseDuration } from "./duration";
import { defaultMinutes, runWithHUD, startFor, startUntil } from "./session";

export default async function Command(props: LaunchProps<{ arguments: Arguments.StartSession }>) {
  const { duration = "", display } = props.arguments;
  const text = duration.trim();

  if (!text) return runWithHUD(() => startFor(defaultMinutes(), display));

  const minutes = parseDuration(text);
  if (minutes !== null) return runWithHUD(() => startFor(minutes, display));

  // Accept clock times here too, so "5pm" does the right thing.
  const until = parseClockTime(text);
  if (until) return runWithHUD(() => startUntil(until, display));

  await showHUD(`❓ Couldn't read "${text}". Try 45, 90m, 1h30m, 5pm, or ∞`);
}
