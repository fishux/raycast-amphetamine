// Thin wrapper over Amphetamine's AppleScript dictionary (Amphetamine 5.x, "Amphetamine Suite").
import { getApplications } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execFile } from "child_process";
import { promisify } from "util";
import { INDEFINITE } from "./duration";

export const AMPHETAMINE_BUNDLE_ID = "com.if.Amphetamine";
export const AMPHETAMINE_STORE_URL = "https://apps.apple.com/app/amphetamine/id937984704";

const TELL = `tell application id "${AMPHETAMINE_BUNDLE_ID}"`;

export type SessionKind = "none" | "timed" | "indefinite" | "trigger" | "app-or-date";

export interface Status {
  /** Amphetamine itself is running. When false, every other field is a default. */
  running: boolean;
  active: boolean;
  kind: SessionKind;
  /** Seconds left in a timed session, otherwise 0. */
  secondsRemaining: number;
  displaySleepAllowed: boolean;
  /** True when the Mac stays awake with the lid closed (closed-display mode). */
  closedDisplayEnabled: boolean;
  triggersEnabled: boolean;
  driveAliveEnabled: boolean;
}

export const NOT_RUNNING: Status = {
  running: false,
  active: false,
  kind: "none",
  secondsRemaining: 0,
  displaySleepAllowed: false,
  closedDisplayEnabled: false,
  triggersEnabled: false,
  driveAliveEnabled: false,
};

export class AmphetamineNotInstalledError extends Error {
  constructor() {
    super("Amphetamine isn't installed. Get it free from the Mac App Store.");
    this.name = "AmphetamineNotInstalledError";
  }
}

async function isInstalled(): Promise<boolean> {
  const apps = await getApplications();
  return apps.some((app) => app.bundleId === AMPHETAMINE_BUNDLE_ID);
}

async function run(script: string): Promise<string> {
  try {
    return await runAppleScript(script);
  } catch (error) {
    if (!(await isInstalled())) throw new AmphetamineNotInstalledError();
    throw error;
  }
}

/** Maps `session time remaining` codes from the dictionary to a session kind. */
function kindFor(active: boolean, remaining: number): SessionKind {
  if (!active || remaining === -3) return "none";
  if (remaining === 0) return "indefinite";
  if (remaining === -1) return "trigger";
  if (remaining === -2) return "app-or-date";
  return "timed";
}

/**
 * Reads the whole session state in one AppleScript round trip.
 * Doesn't launch Amphetamine: if it's not running, returns NOT_RUNNING.
 */
export async function getStatus(): Promise<Status> {
  const output = await run(`
    if application id "${AMPHETAMINE_BUNDLE_ID}" is not running then return "not-running"
    ${TELL}
      set fields to {session is active, session time remaining, display sleep allowed, closed display mode enabled, Triggers are enabled, Drive Alive is enabled}
    end tell
    set AppleScript's text item delimiters to tab
    return fields as text
  `);
  if (output.trim() === "not-running") return NOT_RUNNING;

  const [active, remaining, displaySleep, closedDisplay, triggers, driveAlive] = output.trim().split("\t");
  const isActive = active === "true";
  const seconds = Number(remaining);
  const kind = kindFor(isActive, seconds);
  return {
    running: true,
    active: isActive,
    kind,
    secondsRemaining: kind === "timed" ? seconds : 0,
    displaySleepAllowed: displaySleep === "true",
    closedDisplayEnabled: closedDisplay === "true",
    triggersEnabled: triggers === "true",
    driveAliveEnabled: driveAlive === "true",
  };
}

/**
 * Starts a new session, replacing any current one (Amphetamine's own behavior).
 * `minutes` undefined uses Amphetamine's default duration; INDEFINITE (0) means no time limit.
 * `displaySleepAllowed` undefined uses Amphetamine's default display setting.
 */
export async function startSession(minutes?: number, displaySleepAllowed?: boolean): Promise<void> {
  if (minutes === undefined) {
    const display =
      displaySleepAllowed === undefined ? "" : displaySleepAllowed ? "allow display sleep" : "prevent display sleep";
    await run(`${TELL}
      start new session
      ${display}
    end tell`);
    return;
  }
  const allow = displaySleepAllowed ?? (await run(`${TELL} to display sleep allowed`)).trim() === "true";
  const duration =
    minutes === INDEFINITE ? "duration:0, interval:0" : `duration:${Math.round(minutes)}, interval:minutes`;
  await run(`${TELL} to start new session with options {${duration}, displaySleepAllowed:${allow}}`);
}

/**
 * Amphetamine's Preferences → Sessions → "Allow Display Sleep" checkbox. The AppleScript getter only
 * reports it while no session is running, so read the preference directly and fall back to AppleScript.
 */
export async function readDefaultDisplaySleepAllowed(): Promise<boolean> {
  try {
    const { stdout } = await promisify(execFile)("/usr/bin/defaults", [
      "read",
      AMPHETAMINE_BUNDLE_ID,
      "Allow Display Sleep",
    ]);
    return stdout.trim() === "1";
  } catch {
    const output = await run(`${TELL} to return {session is active, display sleep allowed}`);
    return output.trim() === "false, true";
  }
}

export async function endSession(): Promise<void> {
  await run(`${TELL} to end session`);
}

export async function setDisplaySleepAllowed(allowed: boolean): Promise<void> {
  await run(`${TELL} to ${allowed ? "allow" : "prevent"} display sleep`);
}

/** Enabling may show Amphetamine's one-time closed-display warning dialog. */
export async function setClosedDisplayEnabled(enabled: boolean): Promise<void> {
  await run(`${TELL} to ${enabled ? "enable" : "disable"} closed display mode`);
}

export async function setTriggersEnabled(enabled: boolean): Promise<void> {
  await run(`${TELL} to ${enabled ? "enable" : "disable"} Triggers`);
}

export async function setDriveAliveEnabled(enabled: boolean): Promise<void> {
  await run(`${TELL} to ${enabled ? "enable" : "disable"} Drive Alive`);
}

/** Launches Amphetamine without changing any session. */
export async function launchAmphetamine(): Promise<void> {
  await run(`${TELL} to launch`);
}
