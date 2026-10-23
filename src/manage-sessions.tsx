import { Action, ActionPanel, Color, Icon, Keyboard, List, open, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { ReactNode, useState } from "react";
import {
  AMPHETAMINE_STORE_URL,
  AmphetamineNotInstalledError,
  getStatus,
  launchAmphetamine,
  setDriveAliveEnabled,
  Status,
} from "./amphetamine";
import {
  formatClock,
  formatMinutes,
  INDEFINITE,
  minutesUntil,
  parseClockTime,
  parseDuration,
  parsePresets,
} from "./duration";
import {
  describe,
  extend,
  preferences,
  refreshMenuBar,
  remainingLabel,
  resolveDisplay,
  showError,
  startFor,
  startUntil,
  stop,
  toggleClosedDisplay,
  toggleDisplaySleep,
  toggleTriggers,
} from "./session";
import { clearAppWatch, getAppWatch } from "./watcher";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data, isLoading, revalidate, error } = usePromise(async () => {
    const [status, watch] = await Promise.all([getStatus(), getAppWatch()]);
    return { status, watch };
  });
  const status = data?.status;
  const presets = parsePresets(preferences().presets);
  const defaultDisplay = resolveDisplay();
  const otherDisplay = defaultDisplay === "on" ? "sleep" : "on";

  /** Runs a session change, then either closes Raycast with a HUD or refreshes the list. */
  async function perform(action: () => Promise<string>, close = true) {
    try {
      const message = await action();
      if (close) await showHUD(message);
      else revalidate();
    } catch (err) {
      await showError(err);
    }
  }

  function startActions(start: (display: string) => Promise<string>) {
    return (
      <ActionPanel>
        <Action
          title={defaultDisplay === "on" ? "Start, Keep Display Awake" : "Start, Allow Display Sleep"}
          icon={Icon.Play}
          onAction={() => perform(() => start(defaultDisplay))}
        />
        <Action
          title={otherDisplay === "on" ? "Start, Keep Display Awake" : "Start, Allow Display Sleep"}
          icon={otherDisplay === "on" ? Icon.Desktop : Icon.Moon}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
          onAction={() => perform(() => start(otherDisplay))}
        />
        {status?.active && sessionActions()}
      </ActionPanel>
    );
  }

  function sessionActions() {
    return (
      <ActionPanel.Section title="Current Session">
        <Action
          title="End Session"
          icon={Icon.Stop}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={() => perform(stop)}
        />
        <Action
          title="Add 15 Minutes"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "=" }}
          onAction={() => perform(() => extend(15), false)}
        />
        <Action
          title="Add 1 Hour"
          icon={Icon.PlusCircle}
          shortcut={{ modifiers: ["cmd", "shift"], key: "=" }}
          onAction={() => perform(() => extend(60), false)}
        />
        <Action
          title={status?.displaySleepAllowed ? "Keep Display Awake" : "Allow Display Sleep"}
          icon={status?.displaySleepAllowed ? Icon.Desktop : Icon.Moon}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={() => perform(toggleDisplaySleep, false)}
        />
      </ActionPanel.Section>
    );
  }

  if (error instanceof AmphetamineNotInstalledError) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Pill}
          title="Amphetamine isn't installed"
          description="It's free on the Mac App Store. Press ↵ to open it."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Mac App Store" url={AMPHETAMINE_STORE_URL} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const typedMinutes = parseDuration(searchText);
  const typedTime = typedMinutes === null ? parseClockTime(searchText) : null;
  const hasQuery = searchText.trim().length > 0;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={!(typedMinutes !== null || typedTime)}
      searchBarPlaceholder="Pick a preset, or type a duration (1h30m) or time (5pm)"
    >
      {typedMinutes !== null && (
        <List.Section title="Start">
          <List.Item
            icon={{ source: Icon.Play, tintColor: Color.Green }}
            title={
              typedMinutes === INDEFINITE ? "Keep Awake Indefinitely" : `Keep Awake for ${formatMinutes(typedMinutes)}`
            }
            subtitle={
              typedMinutes === INDEFINITE
                ? undefined
                : `until ${formatClock(new Date(Date.now() + typedMinutes * 60000))}`
            }
            actions={startActions((display) => startFor(typedMinutes, display))}
          />
        </List.Section>
      )}
      {typedTime && (
        <List.Section title="Start">
          <List.Item
            icon={{ source: Icon.Clock, tintColor: Color.Green }}
            title={`Keep Awake Until ${formatClock(typedTime)}`}
            subtitle={formatMinutes(minutesUntil(typedTime))}
            actions={startActions((display) => startUntil(typedTime, display))}
          />
        </List.Section>
      )}

      {status && !hasQuery && (
        <List.Section title="Now">
          <StatusItem
            status={status}
            watchName={data?.watch?.name}
            actions={
              <ActionPanel>
                {status.running ? (
                  status.active ? (
                    sessionActions()
                  ) : (
                    <Action
                      title="Start Session"
                      icon={Icon.Play}
                      onAction={() => perform(() => startFor(undefined))}
                    />
                  )
                ) : (
                  <Action
                    title="Launch Amphetamine"
                    icon={Icon.Power}
                    onAction={() => perform(async () => (await launchAmphetamine(), "Amphetamine launched"), false)}
                  />
                )}
                {data?.watch && (
                  <Action
                    title={`Stop Watching ${data.watch.name}`}
                    icon={Icon.EyeDisabled}
                    onAction={() => perform(async () => (await clearAppWatch(), "Stopped watching"), false)}
                  />
                )}
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {!(typedMinutes !== null || typedTime) && (
        <List.Section title="Presets">
          {presets.map((minutes) => (
            <List.Item
              key={minutes}
              icon={Icon.Clock}
              title={formatMinutes(minutes)}
              subtitle={`until ${formatClock(new Date(Date.now() + minutes * 60000))}`}
              keywords={[String(minutes), `${minutes}m`]}
              actions={startActions((display) => startFor(minutes, display))}
            />
          ))}
          <List.Item
            icon={Icon.Repeat}
            title="Indefinitely"
            subtitle="until you end it"
            keywords={["forever", "infinite", "∞"]}
            actions={startActions((display) => startFor(INDEFINITE, display))}
          />
        </List.Section>
      )}

      {status?.running && !(typedMinutes !== null || typedTime) && (
        <List.Section title="Options">
          <ToggleItem
            title="Display Sleep"
            on={status.displaySleepAllowed}
            onLabel="Allowed"
            offLabel="Display stays on"
            icon={Icon.Moon}
            onToggle={() => perform(toggleDisplaySleep, false)}
          />
          <ToggleItem
            title="Awake with Lid Closed"
            on={status.closedDisplayEnabled}
            icon={Icon.Monitor}
            onToggle={() => perform(toggleClosedDisplay, false)}
          />
          <ToggleItem
            title="Triggers"
            on={status.triggersEnabled}
            icon={Icon.Bolt}
            onToggle={() => perform(toggleTriggers, false)}
          />
          <ToggleItem
            title="Drive Alive"
            on={status.driveAliveEnabled}
            icon={Icon.HardDrive}
            onToggle={() =>
              perform(async () => {
                await setDriveAliveEnabled(!status.driveAliveEnabled);
                await refreshMenuBar();
                return "Drive Alive updated";
              }, false)
            }
          />
          <List.Item
            icon={Icon.Gear}
            title="Open Amphetamine"
            subtitle="Set up Triggers, schedules, and notifications"
            actions={
              <ActionPanel>
                <Action.Open title="Open Amphetamine" target="/Applications/Amphetamine.app" />
                <Action title="Open in Mac App Store" icon={Icon.Globe} onAction={() => open(AMPHETAMINE_STORE_URL)} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

function StatusItem(props: { status: Status; watchName?: string; actions: ReactNode }) {
  const { status, watchName } = props;
  const accessories: List.Item.Accessory[] = [];
  if (status.active) {
    accessories.push({
      icon: status.displaySleepAllowed ? Icon.Moon : Icon.Desktop,
      tooltip: status.displaySleepAllowed ? "Display may sleep" : "Display stays on",
    });
    if (status.kind === "timed") {
      const ends = new Date(Date.now() + status.secondsRemaining * 1000);
      accessories.push({ tag: { value: `ends ${formatClock(ends)}`, color: Color.Green } });
    }
  }
  return (
    <List.Item
      icon={{
        source: status.active ? Icon.Pill : Icon.Moon,
        tintColor: status.active ? Color.Green : Color.SecondaryText,
      }}
      title={status.active ? "Awake" : status.running ? "Not Active" : "Amphetamine Not Running"}
      subtitle={watchName ? `while ${watchName} runs` : status.active ? remainingLabel(status) : describe(status)}
      accessories={accessories}
      actions={props.actions}
    />
  );
}

function ToggleItem(props: {
  title: string;
  on: boolean;
  icon: Icon;
  onLabel?: string;
  offLabel?: string;
  onToggle: () => void;
}) {
  return (
    <List.Item
      icon={props.icon}
      title={props.title}
      accessories={[
        {
          tag: {
            value: props.on ? (props.onLabel ?? "On") : (props.offLabel ?? "Off"),
            color: props.on ? Color.Green : Color.SecondaryText,
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            title={props.on ? `Turn Off ${props.title}` : `Turn On ${props.title}`}
            icon={Icon.Switch}
            onAction={props.onToggle}
          />
        </ActionPanel>
      }
    />
  );
}
