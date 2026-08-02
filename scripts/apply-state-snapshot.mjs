import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateState } from "../docs/lib/model.js";

function semanticState(state) {
  const normalized = validateState(state);
  return {
    ...normalized,
    revision: 0,
    updatedAt: null,
  };
}

function digest(state) {
  return createHash("sha256").update(JSON.stringify(semanticState(state))).digest("hex");
}

async function loadState(path) {
  return validateState(JSON.parse(await readFile(resolve(path), "utf8")));
}

async function requestState(endpoint, options = {}) {
  const response = await fetch(endpoint, { cache: "no-store", ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? `HTTP ${response.status}`);
  return validateState(payload.state);
}

async function main() {
  const [targetPath, expectedCurrentPath, mode] = process.argv.slice(2);
  if (!targetPath || !expectedCurrentPath || ![undefined, "--apply"].includes(mode)) {
    throw new Error("Kullanım: node scripts/apply-state-snapshot.mjs TARGET.json EXPECTED_CURRENT.json [--apply]");
  }

  const endpoint = new URL("/api/state", process.env.APP_URL ?? "https://53aoe.vercel.app/").href;
  const [target, expectedCurrent, current] = await Promise.all([
    loadState(targetPath),
    loadState(expectedCurrentPath),
    requestState(endpoint),
  ]);

  if (digest(current) !== digest(expectedCurrent)) {
    throw new Error("Canlı veri beklenen başlangıç snapshot’ıyla eşleşmiyor; hiçbir değişiklik yapılmadı.");
  }

  const summary = {
    mode: mode === "--apply" ? "apply" : "dry-run",
    endpoint,
    currentRevision: current.revision,
    currentMatches: current.matches.length,
    targetMatches: target.matches.length,
  };

  if (mode !== "--apply") {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  if (!process.env.EDIT_PASSWORD) throw new Error("EDIT_PASSWORD gerekli; hiçbir değişiklik yapılmadı.");

  const written = await requestState(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Edit-Password": process.env.EDIT_PASSWORD,
    },
    body: JSON.stringify(target),
  });
  if (digest(written) !== digest(target)) throw new Error("Sunucu yanıtı hedef snapshot’la eşleşmiyor.");

  console.log(JSON.stringify({
    ...summary,
    writtenRevision: written.revision,
    writtenAt: written.updatedAt,
    writtenPlayers: written.players.length,
    writtenMatches: written.matches.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
