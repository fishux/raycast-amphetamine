import { runWithHUD, toggleTriggers } from "./session";

export default async function Command() {
  await runWithHUD(toggleTriggers);
}
