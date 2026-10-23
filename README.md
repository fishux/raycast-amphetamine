# Amphetamine Sessions for Raycast

Control [Amphetamine](https://apps.apple.com/app/amphetamine/id937984704) from Raycast. Type `awake 45`, `awake 1h30m`, or `until 5pm` and your Mac stays awake. Add a menu bar countdown, extend a session with a keystroke, keep the Mac awake while an app runs, or just ask Raycast AI.

It uses Amphetamine's AppleScript interface, so it needs nothing beyond Amphetamine itself (free on the Mac App Store).

## Commands

| Command                          | What it does                                                                                                                                                                          | Try                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Start Session**                | Starts a session for a duration or until a time. A display argument picks "Keep Display On" or "Allow Display Sleep".                                                                 | `45`, `90m`, `1h30m`, `1.5h`, `∞`, `5pm` |
| **End Session**                  | Ends the current session.                                                                                                                                                             |                                          |
| **Toggle Session**               | Ends a running session, or starts one with your default duration. Good for a hotkey.                                                                                                  |                                          |
| **Manage Sessions**              | A list showing the current session, your presets, and a live "Keep Awake for…" row for whatever you type. Also has switches for display sleep, lid-closed, Triggers, and Drive Alive. | type `2h20m` or `6:30pm`                 |
| **Keep Awake Until**             | Stays awake until a clock time. Without am/pm, `5:30` means the next 5:30.                                                                                                            | `5pm`, `17:30`, `noon`                   |
| **Keep Awake While App Runs**    | Pick an app (running apps first). The session ends on its own when that app quits.                                                                                                    | Xcode, Final Cut, a game                 |
| **Extend Session**               | Adds time to the current session and keeps its display and lid-closed settings. With no session running, it starts one.                                                               | blank = 30m, `15`, `1h`                  |
| **Session Status**               | Shows a HUD such as "Awake · 42m left · display on".                                                                                                                                  |                                          |
| **Toggle Display Sleep**         | Lets the display sleep while the Mac stays awake, or not.                                                                                                                             |                                          |
| **Toggle Awake with Lid Closed** | Turns Amphetamine's closed-display mode on or off.                                                                                                                                    |                                          |
| **Toggle Triggers**              | Pauses or resumes Amphetamine's automatic Triggers.                                                                                                                                   |                                          |
| **Session Menu Bar**             | A menu bar icon with a live countdown, presets, +15m / +1h, option switches, and a low-battery auto-stop.                                                                             |                                          |

### Raycast AI

The extension adds AI tools, so you can type `@amphetamine-sessions keep my Mac awake until the download finishes at 3:15` or `@amphetamine-sessions how long until my Mac can sleep?` in Raycast AI. This needs Raycast Pro.

### Plain script commands

[`script-commands/`](script-commands) has the original Script Commands from the idea this project started from: a timed session, an end-session command, and an inline status countdown. Use them if you don't want the full extension.

## Install

### 1. Prerequisites

- macOS with [Raycast](https://www.raycast.com) installed.
- [Amphetamine](https://apps.apple.com/app/amphetamine/id937984704) installed from the Mac App Store and opened once.
- [Node.js](https://nodejs.org) 22.22 or newer, plus npm. Check with `node -v`. To install it: `brew install node`.

### 2. Get the code

```bash
git clone https://github.com/fishux/raycast-amphetamine.git
cd raycast-amphetamine
npm install
```

### 3. Import it into Raycast

```bash
npm run dev
```

This builds the extension and adds it to Raycast. Raycast opens, and the commands appear under **Amphetamine Sessions**. When it says `built extension successfully`, press `Ctrl+C`. **The extension stays installed** after you stop the dev server, and it keeps working across Raycast restarts.

To update later, run `git pull`, then `npm install && npm run dev` again.

### 4. Allow Raycast to control Amphetamine

The first time a command talks to Amphetamine, macOS asks: _"Raycast" wants access to control "Amphetamine"._ Click **Allow**. If you clicked Don't Allow, turn it back on in **System Settings → Privacy & Security → Automation → Raycast → Amphetamine**.

### 5. Set it up (recommended)

1. **Aliases and hotkeys.** Open Raycast Settings (`⌘,`) → Extensions → Amphetamine Sessions.
   - Give **Start Session** the alias `awake`, so `awake 45` works.
   - Give **Toggle Session** a hotkey such as `⌥⌘A`.
   - Give **Keep Awake Until** the alias `until`.
2. **Menu bar.** Run **Session Menu Bar** once, or enable it in the extension's settings. The countdown appears next to a pill icon.
3. **Preferences.** In the same settings pane, set:
   - **Default Duration**, e.g. `1h`. Leave it blank to use Amphetamine's own default.
   - **Default Display Behavior.**
   - **Presets**, e.g. `15m, 30m, 1h, 2h, 4h, 8h`.
   - Under Session Menu Bar: **Low Battery Auto-Stop**, e.g. `20`, and whether to hide the icon when idle.
4. **Quicklinks for one-tap presets (optional).** Run Raycast's **Create Quicklink** command and paste a link like the ones below. Then give it its own name and hotkey.
   ```
   raycast://extensions/fishux/amphetamine-sessions/start-session?arguments=%7B%22duration%22%3A%2225m%22%7D
   raycast://extensions/fishux/amphetamine-sessions/keep-awake-until?arguments=%7B%22time%22%3A%225pm%22%7D
   ```

### Using the script commands instead

1. In Raycast, run **Create Script Command** once, or go to Raycast Settings → Extensions → **+** → Add Script Directory.
2. Choose this repo's `script-commands` folder.
3. The commands appear as _Amphetamine: Timed Session_, _Amphetamine: End Session_, and _Amphetamine: Status_.

### Uninstall

In Raycast Settings → Extensions, right-click **Amphetamine Sessions** and choose **Uninstall Extension**. Then delete the cloned folder.

## How it works, and its limits

- **Starting replaces.** Every start goes through Amphetamine's `start new session`, which replaces any current session, including one started by a Trigger.
- **Extending restarts.** "Extend" restarts the session with the remaining time plus the extra time, because Amphetamine has no extend command. It can't extend Trigger sessions, or app- or time-based sessions started in Amphetamine itself.
- **App watching.** "Keep Awake While App Runs" starts an indefinite session, plus a tiny background shell loop that checks every 15 seconds and ends the session once the app quits. Starting or ending a session from this extension cancels the watch. It works whether or not the menu bar command is enabled.
- **Low-battery auto-stop** runs inside **Session Menu Bar** (checked every minute), so that command must be enabled. It fires once per discharge: if you restart a session afterwards, it won't stop it again until the Mac has been back on power.
- **Lid-closed warning.** Turning on "awake with lid closed" may show Amphetamine's one-time warning dialog. Tick _Do Not Show This Message Again_ there.
- **Schedules.** For "weekdays 9–5" style schedules, use Amphetamine's own **Triggers**. They run even when Raycast is closed. This extension can pause and resume them.

## Development

```bash
npm run dev     # build, import into Raycast, rebuild on save
npm test        # parser unit tests (durations and clock times)
npm run build   # production build and type check
npm run lint    # Raycast lint and Prettier
```

`npm run lint` reports `Invalid author "fishux"` until `author` in `package.json` matches a [Raycast Store](https://www.raycast.com) username. That only matters for publishing. Local installs work either way. If you change the author, update the quicklink URLs above to match.

## License

MIT
