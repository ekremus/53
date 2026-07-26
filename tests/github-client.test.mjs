import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createGitHubClient,
  decryptCredential,
  encryptCredential,
} from "../docs/lib/github.js";

const fixtureState = JSON.parse(await readFile(
  new URL("../docs/data/state.json", import.meta.url),
  "utf8",
));

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    dump: () => JSON.stringify(Object.fromEntries(values)),
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("encrypts and decrypts a token without persisting plaintext", async () => {
  const token = "secret-example-token";
  const payload = await encryptCredential(token, "53", webcrypto);
  assert.equal(payload.version, 1);
  assert.doesNotMatch(JSON.stringify(payload), new RegExp(token));
  assert.equal(await decryptCredential(payload, "53", webcrypto), token);
  await assert.rejects(() => decryptCredential(payload, "wrong", webcrypto), /PIN/);
});

test("stores only an encrypted credential payload and clears it", async () => {
  const storage = memoryStorage();
  const client = createGitHubClient({ fetch: async () => jsonResponse({}), crypto: webcrypto, storage });
  const payload = await client.encryptCredential("secret-example-token", "53");
  client.saveCredential(payload);
  assert.deepEqual(client.readCredential(), payload);
  assert.doesNotMatch(storage.dump(), /secret-example-token/);
  client.clearCredential();
  assert.equal(client.readCredential(), null);
});

test("verifies repository push permission using GitHub-only requests", async () => {
  const calls = [];
  const client = createGitHubClient({
    crypto: webcrypto,
    storage: memoryStorage(),
    fetch: async (url, options) => {
      calls.push({ url, options });
      return jsonResponse({ permissions: { push: true } });
    },
  });
  const result = await client.verifyRepositoryAccess("secret-example-token");
  assert.equal(result, true);
  assert.equal(calls[0].url, "https://api.github.com/repos/ekremus/53");
  assert.equal(calls[0].options.headers.Authorization, "Bearer secret-example-token");
});

test("rejects authenticated accounts without write access", async () => {
  const client = createGitHubClient({
    crypto: webcrypto,
    storage: memoryStorage(),
    fetch: async () => jsonResponse({ permissions: { push: false } }),
  });
  await assert.rejects(() => client.verifyRepositoryAccess("secret-example-token"), /yazma yetkisi/);
});

test("reads and validates repository JSON with its blob SHA", async () => {
  const content = Buffer.from(`${JSON.stringify(fixtureState)}\n`, "utf8").toString("base64");
  const client = createGitHubClient({
    crypto: webcrypto,
    storage: memoryStorage(),
    fetch: async () => jsonResponse({ content, sha: "blob-sha" }),
  });
  const result = await client.readRemoteState("secret-example-token");
  assert.equal(result.sha, "blob-sha");
  assert.equal(result.state.matches.length, 2);
});

test("commits formatted state JSON against the supplied SHA", async () => {
  let request;
  const client = createGitHubClient({
    crypto: webcrypto,
    storage: memoryStorage(),
    fetch: async (url, options) => {
      request = { url, options };
      return jsonResponse({ commit: { sha: "commit-sha" }, content: { sha: "new-blob" } });
    },
  });
  const result = await client.commitRemoteState({
    token: "secret-example-token",
    state: fixtureState,
    sha: "blob-sha",
    message: "data: test commit",
  });
  assert.equal(result.commitSha, "commit-sha");
  assert.equal(result.sha, "new-blob");
  assert.equal(request.options.method, "PUT");
  const body = JSON.parse(request.options.body);
  assert.equal(body.sha, "blob-sha");
  assert.equal(body.branch, "main");
  assert.equal(body.message, "data: test commit");
  assert.deepEqual(JSON.parse(Buffer.from(body.content, "base64").toString("utf8")), fixtureState);
});

test("maps stale SHA and authentication failures without leaking the token", async () => {
  for (const [status, expected] of [[401, /bağlantısı geçersiz/], [403, /yazma yetkisi/], [409, /başka biri tarafından güncellendi/], [422, /doğrulanamadı/]]) {
    const client = createGitHubClient({
      crypto: webcrypto,
      storage: memoryStorage(),
      fetch: async () => jsonResponse({ message: "secret-example-token" }, status),
    });
    await assert.rejects(
      () => client.commitRemoteState({ token: "secret-example-token", state: fixtureState, sha: "old", message: "data: test" }),
      (error) => expected.test(error.message) && !error.message.includes("secret-example-token"),
    );
  }
});
