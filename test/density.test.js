import { test } from "node:test";
import assert from "node:assert/strict";
import { densityReport, ngrams, parseAppId, tokenize } from "../density.js";

test("tokenize lowercases and keeps accents and apostrophes", () => {
  assert.deepEqual(tokenize("Café Planner, don't STOP!"), ["café", "planner", "don't", "stop"]);
});

test("parseAppId handles ids and URLs", () => {
  assert.equal(parseAppId("389801252"), "389801252");
  assert.equal(parseAppId("id389801252"), "389801252");
  assert.equal(parseAppId("https://apps.apple.com/us/app/instagram/id389801252"), "389801252");
  assert.equal(parseAppId("instagram"), null);
});

test("ngrams skip phrases that start or end with stopwords", () => {
  const c = ngrams(tokenize("track your habits and track your habits daily"), 2);
  assert.equal(c.get("your habits"), undefined);
  assert.equal(c.get("habits daily"), 1);
});

test("densityReport counts and flags name words", () => {
  const r = densityReport({ name: "Habit Tracker", description: "Habit tracker for habit building. Habit streaks." }, { maxN: 2 });
  assert.equal(r.totalWords, 7);
  const habit = r.ngrams[1].find((x) => x.term === "habit");
  assert.equal(habit.count, 3);
  assert.equal(habit.density, 42.86);
  assert.equal(habit.inName, true);
});
