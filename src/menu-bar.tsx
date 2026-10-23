import {
  Color,
  environment,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchType,
  LocalStorage,
  MenuBarExtra,
  open,
  openCommandPreferences,
  showHUD,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { execFile } from "child_process";
import { promisify } from "util";
import { endSession, getStatus, launchAmphetamine, setDriveAliveEnabled, Status } from "./amphetamine";
import { formatClock, formatMinutes, formatSeconds, INDEFINITE, parsePresets } from "./duration";
import {
  describe,
  extend,
  preferences,
  remainingLabel,
  showError,
  startFor,
  stop,
  toggleClosedDisplay,
  toggleDisplaySleep,
  toggleTriggers,
} from "./session";
import { AppWatch, clearAppWatch, getAppWatch } from "./watcher";

const GUARD_FIRED_KEY = "batteryGuardFired";

export default function Command() {
  const prefs = getPreferenceValues<Preferences.MenuBar>();
  const { data, isLoading, revalidate } = useCachedPromise(load, [prefs.lowBatteryThreshold], {
    keepPreviousData: true,
  });
  const status = data?.status;

  async function perform(action: () => Promise<string>) {
    try {
      await showHUD(await action());
    } catch (error) {
      await showError(error);
    }
    revalidate();
  }

  if (prefs.hideWhenIdle && !isLoading && !status?.active) return null;

  const presets = parsePresets(preferences().presets);

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={status?.active ? { source: Icon.Pill } : { source: Icon.Moon, tintColor: Color.SecondaryText }}
      title={prefs.showCountdown && status ? countdown(status) : undefined}
      tooltip={status ? describe(status) : "Amphetamine"}
    >
      {status && <StatusSection status={status} watch={data?.watch} onStopWatching={() => perform(stopWatching)} />}

      {status?.running === false && (
        <MenuBarExtra.Item
          title="Launch Amphetamine"
          icon={Icon.Power}
          onAction={() => perform(async () => (await launchAmphetamine(), "Amphetamine launched"))}
        />
      )}

      {status?.active && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="End Session"
            icon={Icon.Stop}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => perform(stop)}
          />
          {status.kind === "timed" && (
            <>
              <MenuBarExtra.Item title="Add 15 Minutes" icon={Icon.Plus} onAction={() => perform(() => extend(15))} />
              <MenuBarExtra.Item title="Add 1 Hour" icon={Icon.PlusCircle} onAction={() => perform(() => extend(60))} />
            </>
          )}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Submenu title={status?.active ? "Replace Session" : "Start Session"} icon={Icon.Play}>
          {presets.map((minutes) => (
            <MenuBarExtra.Item
              key={minutes}
              title={formatMinutes(minutes)}
              subtitle={`until ${formatClock(new Date(Date.now() + minutes * 60000))}`}
              onAction={() => perform(() => startFor(minutes))}
            />
          ))}
          <MenuBarExtra.Item title="Indefinitely" onAction={() => perform(() => startFor(INDEFINITE))} />
          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title="Custom Duration or Time…"
              onAction={() => launchCommand({ name: "manage-sessions", type: LaunchType.UserInitiated })}
            />
            <MenuBarExtra.Item
              title="While an App Runs…"
              onAction={() => launchCommand({ name: "keep-awake-while-app", type: LaunchType.UserInitiated })}
            />
          </MenuBarExtra.Section>
        </MenuBarExtra.Submenu>
      </MenuBarExtra.Section>

      {status?.running && (
        <MenuBarExtra.Section title="Options">
          <Toggle
            title="Allow Display Sleep"
            on={status.displaySleepAllowed}
            onAction={() => perform(toggleDisplaySleep)}
          />
          <Toggle
            title="Stay Awake with Lid Closed"
            on={status.closedDisplayEnabled}
            onAction={() => perform(toggleClosedDisplay)}
          />
          <Toggle title="Triggers" on={status.triggersEnabled} onAction={() => perform(toggleTriggers)} />
          <Toggle
            title="Drive Alive"
            on={status.driveAliveEnabled}
            onAction={() =>
              perform(async () => {
                await setDriveAliveEnabled(!status.driveAliveEnabled);
                return status.driveAliveEnabled ? "Drive Alive turned off" : "Drive Alive turned on";
              })
            }
          />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Amphetamine"
          icon={Icon.AppWindow}
          onAction={() => open("/Applications/Amphetamine.app")}
        />
        <MenuBarExtra.Item title="Configure Menu Bar…" icon={Icon.Gear} onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function StatusSection(props: { status: Status; watch?: AppWatch; onStopWatching: () => void }) {
  const { status, watch } = props;
  const ends =
    status.kind === "timed" ? ` · ends ${formatClock(new Date(Date.now() + status.secondsRemaining * 1000))}` : "";
  return (
    <MenuBarExtra.Section>
      <MenuBarExtra.Item
        title={status.active ? `Awake · ${remainingLabel(status)}${ends}` : describe(status)}
        icon={status.active ? { source: Icon.Pill, tintColor: Color.Green } : Icon.Moon}
      />
      {watch && status.active && (
        <MenuBarExtra.Item
          title={`While ${watch.name} runs`}
          subtitle="Stop Watching"
          icon={Icon.Eye}
          onAction={props.onStopWatching}
        />
      )}
    </MenuBarExtra.Section>
  );
}

function Toggle(props: { title: string; on: boolean; onAction: () => void }) {
  return (
    <MenuBarExtra.Item
      title={props.title}
      icon={props.on ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
      onAction={props.onAction}
    />
  );
}

function countdown(status: Status): string | undefined {
  if (!status.active) return undefined;
  if (status.kind === "timed") return formatSeconds(status.secondsRemaining);
  if (status.kind === "indefinite") return "∞";
  return undefined;
}

async function stopWatching(): Promise<string> {
  await clearAppWatch();
  return "Stopped watching. The session keeps running";
}

async function load(lowBatteryThreshold: string | undefined) {
  let status = await getStatus();
  if (await applyBatteryGuard(status, lowBatteryThreshold)) status = await getStatus();
  const watch = status.active ? await getAppWatch() : undefined;
  return { status, watch };
}

/**
 * Ends the session once per discharge when on battery at or below the threshold, so a session the
 * user restarts afterwards isn't killed again until the Mac has been back on power.
 * Returns true when it ended a session.
 */
async function applyBatteryGuard(status: Status, threshold: string | undefined): Promise<boolean> {
  const limit = Number(threshold?.trim().replace(/%$/, ""));
  if (!threshold?.trim() || !Number.isFinite(limit) || limit <= 0) return false;

  const battery = await readBattery();
  if (!battery) return false;
  if (!battery.onBattery) {
    await LocalStorage.removeItem(GUARD_FIRED_KEY);
    return false;
  }
  if (!status.active || battery.percent > limit || (await LocalStorage.getItem(GUARD_FIRED_KEY))) return false;

  await LocalStorage.setItem(GUARD_FIRED_KEY, true);
  await clearAppWatch();
  await endSession();
  if (environment.launchType === LaunchType.Background) {
    await showHUD(`🔋 Battery at ${battery.percent}%. Amphetamine session ended`).catch(() => undefined);
  }
  return true;
}

async function readBattery(): Promise<{ onBattery: boolean; percent: number } | undefined> {
  try {
    const { stdout } = await promisify(execFile)("/usr/bin/pmset", ["-g", "batt"]);
    const percent = /(\d+)%/.exec(stdout);
    if (!percent) return undefined; // Desktop Mac without a battery.
    return { onBattery: stdout.includes("'Battery Power'"), percent: Number(percent[1]) };
  } catch {
    return undefined;
  }
}
