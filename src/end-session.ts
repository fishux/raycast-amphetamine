import { runWithHUD, stop } from "./session";

export default async function Command() {
  await runWithHUD(stop);
}
