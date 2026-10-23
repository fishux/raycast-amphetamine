import { LaunchProps, showHUD } from "@raycast/api";
import { parseClockTime } from "./duration";
import { runWithHUD, startUntil } from "./session";

export default async function Command(props: LaunchProps<{ arguments: Arguments.KeepAwakeUntil }>) {
  const text = props.arguments.time.trim();
  const until = parseClockTime(text, new Date(), true);
  if (!until) {
    await showHUD(`❓ Couldn't read "${text}" as a time. Try 5pm, 17:30, or noon`);
    return;
  }
  await runWithHUD(() => startUntil(until));
}
