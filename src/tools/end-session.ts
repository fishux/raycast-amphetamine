import { stop } from "../session";

/** Ends the current Amphetamine session so the Mac can sleep normally. */
export default async function tool() {
  return stop();
}
