import { readFile } from "node:fs/promises";
import { get, head, put } from "@vercel/blob";
import { validateState } from "../docs/lib/model.js";

const state = validateState(JSON.parse(await readFile(new URL("../docs/data/state.json", import.meta.url))));
const existing = await get("state.json", { access: "private", useCache: false }).catch(() => null);
const existingMetadata = existing ? await head("state.json") : null;

if (existing) {
  const remote = validateState(JSON.parse(await new Response(existing.stream).text()));
  if (remote.revision > state.revision) {
    throw new Error(`Blob revision ${remote.revision} yerel seed'den yeni; üzerine yazılmadı.`);
  }
}

const written = await put("state.json", `${JSON.stringify(state, null, 2)}\n`, {
  access: "private",
  allowOverwrite: Boolean(existing),
  contentType: "application/json",
  cacheControlMaxAge: 60,
  ...(existingMetadata?.etag ? { ifMatch: existingMetadata.etag } : {}),
});

console.log(JSON.stringify({
  pathname: written.pathname,
  revision: state.revision,
  matches: state.matches.length,
  players: state.players.length,
}));
