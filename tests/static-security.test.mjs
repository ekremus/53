import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const url = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) return sourceFiles(url);
    return /\.(?:html|js|css|json|webmanifest)$/.test(entry.name) ? [url] : [];
  }));
  return nested.flat();
}

const docsRoot = new URL("../docs/", import.meta.url);
const files = await sourceFiles(docsRoot);
const sources = (await Promise.all(files.map(async (url) => `${url.pathname}\n${await readFile(url, "utf8")}`))).join("\n");

test("contains no embedded credential or retired runtime endpoint", () => {
  assert.doesNotMatch(sources, /(?:github_pat_|ghp_)[A-Za-z0-9_]+/);
  assert.doesNotMatch(sources, /chatgpt\.site|fabled-clove|\/api\/matches|EDIT_PASSWORD/i);
});

test("loads no external script, stylesheet, or font", () => {
  assert.doesNotMatch(sources, /<script[^>]+src=["']https?:/i);
  assert.doesNotMatch(sources, /<link[^>]+href=["']https?:[^"']+\.css/i);
  assert.doesNotMatch(sources, /@import\s+(?:url\()?['"]?https?:/i);
});

test("limits browser connections to self and GitHub API", async () => {
  const html = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
  assert.match(html, /connect-src 'self' https:\/\/api\.github\.com/);
  assert.match(html, /script-src 'self'/);
  assert.match(html, /object-src 'none'/);
  assert.match(html, /frame-ancestors 'none'/);
});

test("uses encrypted credential storage primitives", async () => {
  const github = await readFile(new URL("../docs/lib/github.js", import.meta.url), "utf8");
  assert.match(github, /PBKDF2/);
  assert.match(github, /iterations:\s*250_000/);
  assert.match(github, /AES-GCM/);
  assert.doesNotMatch(github, /console\.(?:log|debug|info)/);
});
