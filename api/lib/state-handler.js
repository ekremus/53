import { validateState } from "../../docs/lib/model.js";

function reply(status, body, headers = {}) {
  return {
    status,
    body,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  };
}

function header(headers, name) {
  const key = Object.keys(headers ?? {}).find((candidate) => candidate.toLowerCase() === name);
  return key ? headers[key] : undefined;
}

function isValidationError(error) {
  return error instanceof Error && /geçersiz|olmalı|tanımlanmalı|kullanılmış|zaten var|kayıtlı değil|yer alamaz|değiştirilemez|desteklenmiyor/.test(error.message);
}

export function createStateHandler({
  store,
  now = () => new Date(),
  maxBytes = 128 * 1024,
} = {}) {
  if (!store?.read || !store?.write) throw new Error("State store gerekli.");

  return async function handle({ method, headers = {}, body = "" }) {
    try {
      if (method === "GET") {
        const current = await store.read();
        return reply(200, { state: validateState(current.state) }, { "Cache-Control": "no-store" });
      }

      if (method !== "PUT") {
        return reply(405, { error: "Yöntem desteklenmiyor." }, { Allow: "GET, PUT" });
      }
      if (!String(header(headers, "content-type") ?? "").toLowerCase().startsWith("application/json")) {
        return reply(415, { error: "Yalnızca JSON kabul edilir." });
      }
      if (Buffer.byteLength(body, "utf8") > maxBytes) {
        return reply(413, { error: "Veri çok büyük." });
      }

      const current = await store.read();
      const submitted = validateState(JSON.parse(body));
      submitted.revision = current.state.revision + 1;
      submitted.updatedAt = now().toISOString();
      const next = validateState(submitted);
      await store.write(next);
      return reply(200, { state: next }, {
        "Cache-Control": "no-store",
      });
    } catch (error) {
      if (error instanceof SyntaxError) return reply(400, { error: "JSON okunamadı." });
      if (isValidationError(error)) return reply(422, { error: error.message });
      return reply(503, { error: "Maç kayıtlarına şu anda ulaşılamıyor." });
    }
  };
}
