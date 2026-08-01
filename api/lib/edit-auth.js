import { createHash, timingSafeEqual } from "node:crypto";

function reply(status, body, headers = {}) {
  return {
    status,
    body,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  };
}

function header(headers, name) {
  const key = Object.keys(headers ?? {}).find((candidate) => candidate.toLowerCase() === name);
  return key ? headers[key] : undefined;
}

function digest(value) {
  return createHash("sha256").update(String(value), "utf8").digest();
}

export function isEditPasswordValid(candidate, expected = process.env.EDIT_PASSWORD) {
  if (typeof candidate !== "string" || !candidate || typeof expected !== "string" || !expected) return false;
  return timingSafeEqual(digest(candidate), digest(expected));
}

export function createEditAuthHandler({
  editPassword = process.env.EDIT_PASSWORD,
  maxBytes = 1024,
} = {}) {
  return async function handle({ method, headers = {}, body = "" }) {
    if (method !== "POST") return reply(405, { error: "Yöntem desteklenmiyor." }, { Allow: "POST" });
    if (!String(header(headers, "content-type") ?? "").toLowerCase().startsWith("application/json")) {
      return reply(415, { error: "Yalnızca JSON kabul edilir." });
    }
    if (Buffer.byteLength(body, "utf8") > maxBytes) return reply(413, { error: "İstek çok büyük." });
    if (!editPassword) return reply(503, { error: "Düzenleme koruması yapılandırılmamış." });

    try {
      const payload = JSON.parse(body);
      if (!isEditPasswordValid(payload?.password, editPassword)) return reply(401, { error: "Şifre yanlış." });
      return reply(200, { ok: true });
    } catch (error) {
      if (error instanceof SyntaxError) return reply(400, { error: "JSON okunamadı." });
      return reply(503, { error: "Düzenleme doğrulanamadı." });
    }
  };
}
