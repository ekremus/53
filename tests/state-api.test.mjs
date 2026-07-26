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

test("publishes complete JSON without a browser concurrency token", async () => {
  let request;
  const client = createStateClient({ fetchImplementation: async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ state: { revision: 4 } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } });
  await client.write({ revision: 3 });
  assert.equal(request.options.method, "PUT");
  assert.equal(request.options.headers["If-Match"], undefined);
});
