import { getStatus } from "./amphetamine";
import { describe, runWithHUD } from "./session";

export default async function Command() {
  await runWithHUD(async () => {
    const status = await getStatus();
    return status.active ? `☕ ${describe(status)}` : `💤 ${describe(status)}`;
  });
}
