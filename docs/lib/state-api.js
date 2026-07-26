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
    return { state: payload.state };
  }

  return {
    read: () => request(),
    write: (state) => request({
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    }),
  };
}
