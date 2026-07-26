export function createStateClient({
  fetchImplementation = globalThis.fetch,
  endpoint = "/api/state",
} = {}) {
  async function request(options = {}) {
    const response = await fetchImplementation(endpoint, { cache: "no-store", ...options });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error ?? "Maç kayıtlarına ulaşılamıyor.");
      error.status = response.status;
      throw error;
    }
    const etag = response.headers.get("ETag");
    if (!etag) throw new Error("Veri sürümü alınamadı.");
    return { state: payload.state, etag };
  }

  return {
    read: () => request(),
    write: (state, etag) => request({
      method: "PUT",
      headers: { "Content-Type": "application/json", "If-Match": etag },
      body: JSON.stringify(state),
    }),
  };
}
