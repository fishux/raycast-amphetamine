import { getStatus } from "../amphetamine";
import { describe } from "../session";
import { getAppWatch } from "../watcher";

/** Reports the current Amphetamine session and settings. */
export default async function tool() {
  const [status, watch] = await Promise.all([getStatus(), getAppWatch()]);
  return {
    summary: describe(status),
    ...status,
    minutesRemaining: status.kind === "timed" ? Math.ceil(status.secondsRemaining / 60) : null,
    endsAt: status.kind === "timed" ? new Date(Date.now() + status.secondsRemaining * 1000).toISOString() : null,
    awakeWhileAppRuns: status.active && watch ? watch.name : null,
  };
}
