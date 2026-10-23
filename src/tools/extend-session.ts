import { extend } from "../session";

type Input = {
  /** Minutes to add to the current session. */
  minutes: number;
};

/** Adds time to the current timed session, or starts one for that long if none is running. */
export default async function tool(input: Input) {
  const minutes = Math.round(input.minutes);
  if (!(minutes > 0)) throw new Error("minutes must be a positive number");
  return extend(minutes);
}
