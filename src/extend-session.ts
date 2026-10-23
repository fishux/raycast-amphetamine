import { LaunchProps, showHUD } from "@raycast/api";
import { INDEFINITE, parseDuration } from "./duration";
import { extend, runWithHUD } from "./session";

const DEFAULT_EXTENSION_MINUTES = 30;

export default async function Command(props: LaunchProps<{ arguments: Arguments.ExtendSession }>) {
  const text = props.arguments.duration?.trim() ?? "";
  const minutes = text ? parseDuration(text) : DEFAULT_EXTENSION_MINUTES;
  if (minutes === null || minutes === INDEFINITE) {
    await showHUD(`❓ Couldn't read "${text}". Try 15, 30m, or 1h`);
    return;
  }
  await runWithHUD(() => extend(minutes));
}
