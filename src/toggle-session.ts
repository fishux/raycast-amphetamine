import { runWithHUD, toggle } from "./session";

export default async function Command() {
  await runWithHUD(toggle);
}
