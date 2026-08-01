export function createStateClient({
  fetchImplementation = globalThis.fetch,
  endpoint = "/api/state",
  authEndpoint = "/api/auth",
} = {}) {
  let editPassword = "";

  async function request(url, options = {}) {
    const response = await fetchImplementation(url, { cache: "no-store", ...options });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error ?? "Maç kayıtlarına ulaşılamıyor.");
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  return {
    read: async () => ({ state: (await request(endpoint)).state }),
    authenticate: async (password) => {
      await request(authEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      editPassword = password;
      return true;
    },
    clearEditPassword: () => { editPassword = ""; },
    write: async (state) => {
      if (!editPassword) {
        const error = new Error("Düzenleme şifresi gerekli.");
        error.status = 401;
        throw error;
      }
      const payload = await request(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Edit-Password": editPassword },
        body: JSON.stringify(state),
      });
      return { state: payload.state };
    },
  };
}
