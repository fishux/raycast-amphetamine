import { parseClockTime } from "../duration";
import { startFor, startUntil } from "../session";

type Input = {
  /** How long to keep the Mac awake, in minutes. Use 0 for no time limit. Omit when `until` is given. */
  minutes?: number;
  /** A clock time to stay awake until, such as "17:30" or "5pm". Takes precedence over `minutes`. */
  until?: string;
  /** True only if the user asked to let the display sleep while the Mac stays awake. */
  allowDisplaySleep?: boolean;
};

/** Starts an Amphetamine session that keeps the Mac awake, replacing any current session. */
export default async function tool(input: Input) {
  const display = input.allowDisplaySleep === undefined ? undefined : input.allowDisplaySleep ? "sleep" : "on";
  if (input.until) {
    const target = parseClockTime(input.until, new Date(), true);
    if (!target) throw new Error(`"${input.until}" isn't a clock time. Use a form like 17:30 or 5pm.`);
    return startUntil(target, display);
  }
  const minutes = input.minutes === undefined ? undefined : Math.max(0, Math.round(input.minutes));
  return startFor(minutes, display);
}
