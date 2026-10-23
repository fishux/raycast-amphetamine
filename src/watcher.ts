// "Keep awake while an app runs": a small detached shell loop that ends the session once the app quits.
// It runs outside Raycast so it keeps working after the command closes. A state file in the extension's
// support folder holds a token; deleting or replacing the file makes the loop exit without touching the session.
import { environment } from "@raycast/api";
import { execFile, spawn } from "child_process";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { AMPHETAMINE_BUNDLE_ID } from "./amphetamine";

export interface AppWatch {
  token: string;
  name: string;
  path: string;
  startedAt: number;
}

const WATCHER_SCRIPT = `
STATE="$1"; TOKEN="$2"; EXEC_PREFIX="$3"
still_ours() { /usr/bin/grep -qF "$TOKEN" "$STATE" 2>/dev/null; }
session_active() {
  /usr/bin/osascript \\
    -e 'if application id "${AMPHETAMINE_BUNDLE_ID}" is not running then return false' \\
    -e 'tell application id "${AMPHETAMINE_BUNDLE_ID}" to return session is active' 2>/dev/null | /usr/bin/grep -q true
}
/bin/sleep 20
while still_ours; do
  if ! session_active; then /bin/rm -f "$STATE"; exit 0; fi
  if ! /bin/ps -axo comm= | /usr/bin/grep -qF "$EXEC_PREFIX"; then
    still_ours && /usr/bin/osascript -e 'tell application id "${AMPHETAMINE_BUNDLE_ID}" to end session'
    /bin/rm -f "$STATE"
    exit 0
  fi
  /bin/sleep 15
done
`;

function stateFile(): string {
  return path.join(environment.supportPath, "app-watch.json");
}

function executablePrefix(appPath: string): string {
  return `${appPath.replace(/\/$/, "")}/Contents/MacOS/`;
}

export async function getAppWatch(): Promise<AppWatch | undefined> {
  try {
    return JSON.parse(await fs.readFile(stateFile(), "utf8")) as AppWatch;
  } catch {
    return undefined;
  }
}

/** Stops watching. The session itself is left alone. */
export async function clearAppWatch(): Promise<void> {
  await fs.rm(stateFile(), { force: true });
}

/** Records the watch and starts the background loop. The caller starts the session itself. */
export async function startAppWatch(app: { name: string; path: string }): Promise<void> {
  const watch: AppWatch = { token: randomUUID(), name: app.name, path: app.path, startedAt: Date.now() };
  await fs.mkdir(environment.supportPath, { recursive: true });
  await fs.writeFile(stateFile(), JSON.stringify(watch));
  const child = spawn(
    "/bin/sh",
    ["-c", WATCHER_SCRIPT, "amphetamine-app-watch", stateFile(), watch.token, executablePrefix(app.path)],
    { detached: true, stdio: "ignore" },
  );
  child.unref();
}

/** Paths of every running executable, for matching against `<App>.app/Contents/MacOS/`. */
export async function runningExecutables(): Promise<string[]> {
  const { stdout } = await promisify(execFile)("/bin/ps", ["-axo", "comm="], { maxBuffer: 4 * 1024 * 1024 });
  return stdout.split("\n");
}

export function isAppRunning(appPath: string, executables: string[]): boolean {
  const prefix = executablePrefix(appPath);
  return executables.some((line) => line.startsWith(prefix));
}
