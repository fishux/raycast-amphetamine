import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatMinutes,
  INDEFINITE,
  minutesUntil,
  parseClockTime,
  parseDuration,
  parsePresets,
} from "../src/duration.ts";

test("parseDuration reads minutes, hours and mixed units", () => {
  assert.equal(parseDuration("45"), 45);
  assert.equal(parseDuration("90m"), 90);
  assert.equal(parseDuration("1h"), 60);
  assert.equal(parseDuration("1h30m"), 90);
  assert.equal(parseDuration("1h 30 min"), 90);
  assert.equal(parseDuration("1.5h"), 90);
  assert.equal(parseDuration("2 hours"), 120);
  assert.equal(parseDuration("1 hour and 15 minutes"), 75);
  assert.equal(parseDuration("for 20 mins"), 20);
  assert.equal(parseDuration("1:30"), 90);
  assert.equal(parseDuration("1d"), 1440);
});

test("parseDuration treats indefinite words as INDEFINITE", () => {
  for (const word of ["∞", "forever", "Indefinitely", "0", "inf"]) assert.equal(parseDuration(word), INDEFINITE);
});

test("parseDuration rejects non-durations", () => {
  for (const text of ["", "abc", "5pm", "17:30x", "1h abc", "-5", "1x"]) assert.equal(parseDuration(text), null, text);
});

test("parseClockTime picks the next matching time", () => {
  const now = new Date(2026, 9, 23, 15, 0); // 3:00 PM
  const at = (text: string, bare = false) => parseClockTime(text, now, bare);
  assert.deepEqual(at("5pm"), new Date(2026, 9, 23, 17, 0));
  assert.deepEqual(at("5:30 PM"), new Date(2026, 9, 23, 17, 30));
  assert.deepEqual(at("17:30"), new Date(2026, 9, 23, 17, 30));
  assert.deepEqual(at("5:30"), new Date(2026, 9, 23, 17, 30), "no meridiem picks the next 5:30");
  assert.deepEqual(at("9am"), new Date(2026, 9, 24, 9, 0), "past times roll to tomorrow");
  assert.deepEqual(at("until noon"), new Date(2026, 9, 24, 12, 0));
  assert.deepEqual(at("midnight"), new Date(2026, 9, 24, 0, 0));
  assert.deepEqual(at("18"), new Date(2026, 9, 23, 18, 0));
  assert.equal(at("5"), null, "bare hour is a duration unless allowed");
  assert.deepEqual(at("5", true), new Date(2026, 9, 23, 17, 0));
  assert.equal(at("13pm"), null);
  assert.equal(at("45m"), null);
});

test("minutesUntil rounds up", () => {
  const now = new Date(2026, 9, 23, 15, 0, 30);
  assert.equal(minutesUntil(new Date(2026, 9, 23, 17, 0), now), 120);
});

test("formatMinutes", () => {
  assert.equal(formatMinutes(INDEFINITE), "∞");
  assert.equal(formatMinutes(45), "45m");
  assert.equal(formatMinutes(60), "1h");
  assert.equal(formatMinutes(65), "1h 05m");
  assert.equal(formatMinutes(1500), "1d 1h");
});

test("parsePresets sorts, dedupes and skips junk", () => {
  assert.deepEqual(parsePresets("1h, 15m, junk, 60, 30"), [15, 30, 60]);
  assert.deepEqual(parsePresets(undefined), []);
});
