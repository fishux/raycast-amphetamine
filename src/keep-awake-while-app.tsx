import { Action, ActionPanel, Application, getApplications, Icon, List, open, showHUD } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { INDEFINITE } from "./duration";
import { resolveDisplay, showError, startFor } from "./session";
import { isAppRunning, runningExecutables, startAppWatch } from "./watcher";

export default function Command() {
  const { data, isLoading } = usePromise(async () => {
    const [apps, executables] = await Promise.all([getApplications(), runningExecutables()]);
    const visible = apps.filter((app) => app.path.endsWith(".app"));
    return {
      running: visible.filter((app) => isAppRunning(app.path, executables)),
      installed: visible.filter((app) => !isAppRunning(app.path, executables)),
    };
  });

  async function watch(app: Application, launch: boolean, display: string) {
    try {
      if (launch) await open(app.path);
      // startFor clears any earlier watch, so start the session before recording the new one.
      await startFor(INDEFINITE, display);
      await startAppWatch(app);
      await showHUD(`☕ Awake while ${app.name} runs`);
    } catch (error) {
      await showError(error);
    }
  }

  const otherDisplay = resolveDisplay() === "on" ? "sleep" : "on";

  function item(app: Application, running: boolean) {
    return (
      <List.Item
        key={app.path}
        icon={{ fileIcon: app.path }}
        title={app.name}
        subtitle={running ? "Running" : undefined}
        actions={
          <ActionPanel>
            <Action
              title={running ? `Keep Awake While ${app.name} Runs` : `Open ${app.name} and Keep Awake`}
              icon={Icon.Pill}
              onAction={() => watch(app, !running, resolveDisplay())}
            />
            <Action
              title={otherDisplay === "sleep" ? "Keep Awake, Allow Display Sleep" : "Keep Awake, Display Awake"}
              icon={otherDisplay === "sleep" ? Icon.Moon : Icon.Desktop}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
              onAction={() => watch(app, !running, otherDisplay)}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Keep your Mac awake until this app quits…">
      <List.Section title="Running">{data?.running.map((app) => item(app, true))}</List.Section>
      <List.Section title="Installed">{data?.installed.map((app) => item(app, false))}</List.Section>
    </List>
  );
}
