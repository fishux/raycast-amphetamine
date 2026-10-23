// High-level session operations shared by commands, the menu bar, the list view and AI tools.
// Each returns a short sentence suitable for a HUD or an AI tool result.
import { getPreferenceValues, launchCommand, LaunchType, open, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  AMPHETAMINE_STORE_URL,
  AmphetamineNotInstalledError,
  endSession,
  getStatus,
  setClosedDisplayEnabled,
  setDisplaySleepAllowed,
  setTriggersEnabled,
  startSession,
  Status,
} from "./amphetamine";
import { formatClock, formatMinutes, formatSeconds, INDEFINITE, minutesUntil, parseDuration } from "./duration";
import { clearAppWatch } from "./watcher";

export type DisplayChoice = "on" | "sleep";

export function preferences(): ExtensionPreferences {
  return getPreferenceValues<ExtensionPreferences>();
}

/** The display choice to use: an explicit one, else the extension preference. */
export function resolveDisplay(choice?: string): DisplayChoice {
  if (choice === "on" || choice === "sleep") return choice;
  return preferences().defaultDisplay === "sleep" ? "sleep" : "on";
}

function displayLabel(display: DisplayChoice): string {
  return display === "sleep" ? "display may sleep" : "display on";
}

/** The default duration preference in minutes, or undefined to defer to Amphetamine's own default. */
export function defaultMinutes(): number | undefined {
  const text = preferences().defaultDuration?.trim();
  if (!text) return undefined;
  return parseDuration(text) ?? undefined;
}

export async function startFor(minutes: number | undefined, display?: string): Promise<string> {
  const choice = resolveDisplay(display);
  await clearAppWatch();
  await startSession(minutes, choice === "sleep");
  await refreshMenuBar();
  if (minutes === undefined) return `☕ Session started · ${displayLabel(choice)}`;
  if (minutes === INDEFINITE) return `☕ Awake indefinitely · ${displayLabel(choice)}`;
  const ends = new Date(Date.now() + minutes * 60000);
  return `☕ Awake for ${formatMinutes(minutes)} (until ${formatClock(ends)}) · ${displayLabel(choice)}`;
}

export async function startUntil(target: Date, display?: string): Promise<string> {
  const choice = resolveDisplay(display);
  await clearAppWatch();
  await startSession(minutesUntil(target), choice === "sleep");
  await refreshMenuBar();
  return `☕ Awake until ${formatClock(target)} · ${displayLabel(choice)}`;
}

export async function stop(): Promise<string> {
  const status = await getStatus();
  await clearAppWatch();
  if (!status.active) return "No session to end";
  await endSession();
  await refreshMenuBar();
  return status.kind === "trigger"
    ? "💤 Session ended (its Trigger may start it again)"
    : "💤 Session ended · your Mac can sleep";
}

export async function toggle(): Promise<string> {
  const status = await getStatus();
  return status.active ? stop() : startFor(defaultMinutes());
}

/**
 * Adds time to a timed session by restarting it with the combined duration, keeping its
 * display and lid-closed settings. With no session running, starts one for `minutes`.
 */
export async function extend(minutes: number): Promise<string> {
  const status = await getStatus();
  if (!status.active) return startFor(minutes);
  switch (status.kind) {
    case "indefinite":
      return "Session already has no time limit";
    case "trigger":
      return "Can't extend a Trigger session. Start a timed one instead";
    case "app-or-date":
      return "Can't extend an app- or time-based session started in Amphetamine";
  }

  const total = Math.ceil(status.secondsRemaining / 60) + minutes;
  await startSession(total, status.displaySleepAllowed);
  // A new session takes the closed-display preference, so restore what the old one had.
  const after = await getStatus();
  if (after.closedDisplayEnabled !== status.closedDisplayEnabled) {
    await setClosedDisplayEnabled(status.closedDisplayEnabled);
  }
  await refreshMenuBar();
  return `➕ Added ${formatMinutes(minutes)} · ${formatMinutes(total)} left`;
}

export async function toggleDisplaySleep(): Promise<string> {
  const status = await getStatus();
  const allow = !status.displaySleepAllowed;
  await setDisplaySleepAllowed(allow);
  await refreshMenuBar();
  const scope = status.active ? "this session" : "future sessions";
  return allow ? `🌙 Display may sleep for ${scope}` : `🖥️ Display stays on for ${scope}`;
}

export async function toggleClosedDisplay(): Promise<string> {
  const status = await getStatus();
  const enable = !status.closedDisplayEnabled;
  await setClosedDisplayEnabled(enable);
  await refreshMenuBar();
  const scope = status.active ? "this session" : "future sessions";
  return enable ? `💻 Stays awake with the lid closed for ${scope}` : `💻 Sleeps when the lid closes for ${scope}`;
}

export async function toggleTriggers(): Promise<string> {
  const status = await getStatus();
  await setTriggersEnabled(!status.triggersEnabled);
  await refreshMenuBar();
  return status.triggersEnabled ? "⏸️ Triggers turned off" : "▶️ Triggers turned on";
}

/** One-line summary like "Awake · 42m left · display on". */
export function describe(status: Status): string {
  if (!status.running) return "Amphetamine isn't running";
  if (!status.active) return "No active session · your Mac can sleep";
  const display = status.displaySleepAllowed ? "display may sleep" : "display on";
  return `Awake · ${remainingLabel(status)} · ${display}`;
}

export function remainingLabel(status: Status): string {
  switch (status.kind) {
    case "timed":
      return `${formatSeconds(status.secondsRemaining)} left`;
    case "indefinite":
      return "no time limit";
    case "trigger":
      return "started by a Trigger";
    case "app-or-date":
      return "until an app quits or a set time";
    default:
      return "idle";
  }
}

/** Re-renders the menu bar command if the user has it enabled. */
export async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch {
    // The menu bar command is disabled; nothing to refresh.
  }
}

/** Shows `message` as a HUD, or a helpful toast when something fails. For no-view commands. */
export async function runWithHUD(action: () => Promise<string>): Promise<void> {
  try {
    await showHUD(await action());
  } catch (error) {
    await showError(error);
  }
}

export async function showError(error: unknown): Promise<void> {
  if (error instanceof AmphetamineNotInstalledError) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Amphetamine isn't installed",
      message: "It's free on the Mac App Store",
      primaryAction: { title: "Open Mac App Store", onAction: () => open(AMPHETAMINE_STORE_URL) },
    });
    return;
  }
  await showFailureToast(error, { title: "Amphetamine didn't respond" });
}
