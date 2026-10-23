import { runWithHUD, toggleClosedDisplay } from "./session";

export default async function Command() {
  await runWithHUD(toggleClosedDisplay);
}
