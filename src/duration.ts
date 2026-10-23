// Pure parsing and formatting helpers. No Raycast imports, so `npm test` can run them under plain Node.

/** Minutes value that means "no time limit" (Amphetamine's infinite session). */
export const INDEFINITE = 0;

const INDEFINITE_WORDS = new Set(["0", "∞", "inf", "infinite", "indefinite", "indefinitely", "forever", "always"]);

const UNIT_MINUTES: Record<string, number> = {
  m: 1,
  min: 1,
  mins: 1,
  minute: 1,
  minutes: 1,
  h: 60,
  hr: 60,
  hrs: 60,
  hour: 60,
  hours: 60,
  d: 1440,
  day: 1440,
  days: 1440,
};

/**
 * Parses a human duration into whole minutes.
 * Accepts "45", "90m", "1h30m", "1.5h", "2 hours", "1h 15min", "1:30" and indefinite words ("∞", "forever").
 * Returns INDEFINITE (0) for no time limit, or null when the text isn't a duration.
 */
export function parseDuration(input: string): number | null {
  const text = input
    .trim()
    .toLowerCase()
    .replace(/^for\s+/, "");
  if (!text) return null;
  if (INDEFINITE_WORDS.has(text)) return INDEFINITE;

  // "1:30" means hours:minutes.
  const clock = /^(\d+):([0-5]\d)$/.exec(text);
  if (clock) return positive(Number(clock[1]) * 60 + Number(clock[2]));

  // A bare number is minutes, matching the original Amphetamine script command.
  if (/^\d+(\.\d+)?$/.test(text)) return positive(Math.round(Number(text)));

  const token = /(\d+(?:\.\d+)?)\s*([a-z]+)\s*(?:and\s*|,\s*)?/g;
  let total = 0;
  let consumed = 0;
  let match: RegExpExecArray | null;
  while ((match = token.exec(text)) !== null) {
    if (match.index !== consumed) return null;
    const unit = UNIT_MINUTES[match[2]];
    if (unit === undefined) return null;
    total += Number(match[1]) * unit;
    consumed = token.lastIndex;
  }
  if (consumed !== text.length) return null;
  return positive(Math.round(total));
}

function positive(minutes: number): number | null {
  return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

/**
 * Parses a clock time ("17:30", "5pm", "5:30 pm", "noon", "midnight") into the next Date at that time.
 * Without am/pm, "5:30" means whichever of 5:30 AM or 5:30 PM comes next. A bare hour like "5" is only
 * accepted with `allowBareHour`, since elsewhere it reads as a duration in minutes.
 * Returns null when the text isn't a time.
 */
export function parseClockTime(input: string, now: Date = new Date(), allowBareHour = false): Date | null {
  const text = input
    .trim()
    .toLowerCase()
    .replace(/^(until|till|til|at)\s+/, "");
  let candidates: number[];
  let minutes = 0;

  if (text === "noon" || text === "midday") {
    candidates = [12];
  } else if (text === "midnight") {
    candidates = [0];
  } else {
    const match = /^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a|p)?$/.exec(text);
    if (!match) return null;
    const hours = Number(match[1]);
    minutes = match[2] ? Number(match[2]) : 0;
    const meridiem = match[3]?.[0];
    if (minutes > 59) return null;
    if (meridiem) {
      if (hours < 1 || hours > 12) return null;
      candidates = [(hours % 12) + (meridiem === "p" ? 12 : 0)];
    } else {
      if (hours > 23) return null;
      if (!match[2] && !allowBareHour && hours < 13) return null;
      candidates = hours >= 1 && hours <= 12 ? [hours % 12, (hours % 12) + 12] : [hours];
    }
  }

  const next = candidates.map((hours) => {
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
    return target;
  });
  return next.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b));
}

/** Whole minutes from now until a future date, rounded up so the session never ends early. */
export function minutesUntil(target: Date, now: Date = new Date()): number {
  return Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 60000));
}

/** "45m", "1h 05m", "2d 3h", or "∞" for INDEFINITE. */
export function formatMinutes(minutes: number): string {
  if (minutes === INDEFINITE) return "∞";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) {
    const m = minutes % 60;
    return m ? `${Math.floor(minutes / 60)}h ${String(m).padStart(2, "0")}m` : `${minutes / 60}h`;
  }
  const h = Math.floor((minutes % 1440) / 60);
  return h ? `${Math.floor(minutes / 1440)}d ${h}h` : `${minutes / 1440}d`;
}

/** Formats Amphetamine's remaining seconds, rounding up so "0m" never shows for a live session. */
export function formatSeconds(seconds: number): string {
  return formatMinutes(Math.max(1, Math.ceil(seconds / 60)));
}

/** "5:30 PM" style, in the user's locale. */
export function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Parses the comma-separated presets preference, dropping anything unparseable and duplicates. */
export function parsePresets(input: string | undefined): number[] {
  const seen = new Set<number>();
  for (const part of (input ?? "").split(",")) {
    const minutes = parseDuration(part);
    if (minutes !== null && minutes !== INDEFINITE) seen.add(minutes);
  }
  return [...seen].sort((a, b) => a - b);
}
