import { runWithHUD, toggleDisplaySleep } from "./session";

export default async function Command() {
  await runWithHUD(toggleDisplaySleep);
}
