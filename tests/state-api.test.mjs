import assert from "node:assert/strict";
import test from "node:test";
import { createStateClient } from "../docs/lib/state-api.js";

test("reads state and captures the ETag", async () => {
  const client = createStateClient({ fetchImplementation: async () => new Response(
    JSON.stringify({ state: { revision: 3 } }),
    { status: 200, headers: { ETag: '"r3"', "Content-Type": "application/json" } },
  ) });
  assert.deepEqual(await client.read(), { state: { revision: 3 }, etag: '"r3"' });
});

test("publishes JSON with If-Match and maps 409", async () => {
  let request;
  const success = createStateClient({ fetchImplementation: async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ state: { revision: 4 } }), { status: 200, headers: { ETag: '"r4"' } });
  } });
  await success.write({ revision: 3 }, '"r3"');
  assert.equal(request.options.headers["If-Match"], '"r3"');
  assert.equal(request.options.method, "PUT");

  const stale = createStateClient({ fetchImplementation: async () => new Response(
    JSON.stringify({ error: "Veri başka biri tarafından güncellendi." }), { status: 409 },
  ) });
  await assert.rejects(() => stale.write({ revision: 3 }, '"r3"'), /başka biri/);
});
