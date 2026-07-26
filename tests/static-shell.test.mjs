import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");

test("ships the exact identity and both meydan teams", () => {
  assert.match(html, /Bu Ecof Empires🏹🪓⚔️/);
  assert.match(html, /Cortinyanlar/);
  assert.match(html, /Bakracoğulları/);
});

test("is a local mobile-first GitHub Pages application", () => {
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /type="module" src="\.\/app\.js"/);
  assert.match(html, /href="\.\/manifest\.webmanifest"/);
  assert.doesNotMatch(html, /http-equiv=["']refresh/i);
  assert.doesNotMatch(html, /chatgpt\.site|fabled-clove/i);
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:/i);
});

test("exposes the complete semantic application surface", () => {
  for (const id of [
    "app",
    "scoreboard",
    "latest-match",
    "recent-matches",
    "leaderboard",
    "fab",
    "fab-menu",
    "archive-dialog",
    "edit-dialog",
    "players-dialog",
    "credential-dialog",
    "notice-region",
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

test("avoids app chrome the user rejected", () => {
  assert.doesNotMatch(html, /<header\b|<footer\b|<aside\b/i);
  assert.doesNotMatch(html, /sidebar|bottom-nav|bottom navigation/i);
});

test("keeps scripts and styles CSP-safe", () => {
  assert.match(html, /Content-Security-Policy/);
  assert.doesNotMatch(html, /\son\w+\s*=/i);
  assert.doesNotMatch(html, /<style\b/i);
  assert.equal((html.match(/<script\b/g) ?? []).length, 1);
});
