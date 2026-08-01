import assert from "node:assert/strict";
import test from "node:test";
import { createStateClient } from "../docs/lib/state-api.js";

test("reads state without requiring a browser concurrency token", async () => {
  const client = createStateClient({ fetchImplementation: async () => new Response(
    JSON.stringify({ state: { revision: 3 } }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  ) });
  assert.deepEqual(await client.read(), { state: { revision: 3 } });
});

test("authenticates once in memory and protects complete JSON writes", async () => {
  const requests = [];
  const client = createStateClient({ fetchImplementation: async (url, options) => {
    requests.push({ url, options });
    return new Response(JSON.stringify({ state: { revision: 4 } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } });
  await client.authenticate("test-1453");
  await client.write({ revision: 3 });
  assert.equal(requests[0].url, "/api/auth");
  assert.equal(JSON.parse(requests[0].options.body).password, "test-1453");
  assert.equal(requests[1].options.method, "PUT");
  assert.equal(requests[1].options.headers["X-Edit-Password"], "test-1453");
  assert.equal(requests[1].options.headers["If-Match"], undefined);
});

test("does not retain a rejected password or allow unauthenticated writes", async () => {
  const client = createStateClient({ fetchImplementation: async () => new Response(
    JSON.stringify({ error: "Şifre yanlış." }),
    { status: 401, headers: { "Content-Type": "application/json" } },
  ) });
  await assert.rejects(() => client.authenticate("wrong"), /Şifre yanlış/);
  await assert.rejects(() => client.write({ revision: 3 }), /şifresi gerekli/);
});
