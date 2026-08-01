import assert from "node:assert/strict";
import test from "node:test";
import { createEditAuthHandler, isEditPasswordValid } from "../api/lib/edit-auth.js";

test("compares the configured edit password without accepting missing values", () => {
  assert.equal(isEditPasswordValid("test-1453", "test-1453"), true);
  assert.equal(isEditPasswordValid("1453", "test-1453"), false);
  assert.equal(isEditPasswordValid("", "test-1453"), false);
  assert.equal(isEditPasswordValid("test-1453", ""), false);
});

test("auth endpoint accepts only JSON POST with the configured password", async () => {
  const handle = createEditAuthHandler({ editPassword: "test-1453" });
  const success = await handle({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "test-1453" }),
  });
  assert.equal(success.status, 200);
  assert.deepEqual(success.body, { ok: true });
  assert.equal(success.headers["Cache-Control"], "no-store");

  const wrong = await handle({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "wrong" }),
  });
  assert.equal(wrong.status, 401);

  const get = await handle({ method: "GET", headers: {}, body: "" });
  assert.equal(get.status, 405);
});

test("auth endpoint fails closed when the server password is missing", async () => {
  const handle = createEditAuthHandler({ editPassword: "" });
  const response = await handle({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "test-1453" }),
  });
  assert.equal(response.status, 503);
});
