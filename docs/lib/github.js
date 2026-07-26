import { validateState } from "./model.js";

export const GITHUB_CONFIG = Object.freeze({
  owner: "ekremus",
  repo: "53",
  branch: "main",
  statePath: "docs/data/state.json",
  apiVersion: "2022-11-28",
});

const STORAGE_KEY = "bu-ecof-empires.github-credential.v1";
const API_ROOT = "https://api.github.com";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(String(value).replace(/\s/g, ""));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function utf8ToBase64(value) {
  return bytesToBase64(textEncoder.encode(value));
}

function base64ToUtf8(value) {
  return textDecoder.decode(base64ToBytes(value));
}

function requireCrypto(provider) {
  if (!provider?.subtle || typeof provider.getRandomValues !== "function") {
    throw new Error("Bu tarayıcı güvenli kimlik bilgisi saklamayı desteklemiyor.");
  }
  return provider;
}

async function deriveCredentialKey(pin, salt, provider, usage) {
  if (typeof pin !== "string" || !pin) throw new Error("PIN gerekli.");
  const sourceKey = await provider.subtle.importKey(
    "raw",
    textEncoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return provider.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 250_000 },
    sourceKey,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

export async function encryptCredential(token, pin, provider = globalThis.crypto) {
  const cryptoProvider = requireCrypto(provider);
  if (typeof token !== "string" || !token.trim()) throw new Error("GitHub tokenı gerekli.");
  const salt = cryptoProvider.getRandomValues(new Uint8Array(16));
  const iv = cryptoProvider.getRandomValues(new Uint8Array(12));
  const key = await deriveCredentialKey(pin, salt, cryptoProvider, "encrypt");
  const ciphertext = await cryptoProvider.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(token.trim()),
  );
  return {
    version: 1,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptCredential(payload, pin, provider = globalThis.crypto) {
  const cryptoProvider = requireCrypto(provider);
  try {
    if (!payload || payload.version !== 1) throw new Error("invalid payload");
    const salt = base64ToBytes(payload.salt);
    const iv = base64ToBytes(payload.iv);
    const ciphertext = base64ToBytes(payload.ciphertext);
    const key = await deriveCredentialKey(pin, salt, cryptoProvider, "decrypt");
    const plaintext = await cryptoProvider.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    const token = textDecoder.decode(plaintext);
    if (!token) throw new Error("empty credential");
    return token;
  } catch {
    throw new Error("PIN yanlış veya GitHub bağlantısı bozulmuş.");
  }
}

function errorForStatus(status) {
  if (status === 401) return new Error("GitHub bağlantısı geçersiz. Bağlantıyı yenile.");
  if (status === 403) return new Error("GitHub hesabının bu repoya yazma yetkisi yok.");
  if (status === 404) return new Error("GitHub reposu veya veri dosyası bulunamadı.");
  if (status === 409) return new Error("Veri başka biri tarafından güncellendi. Son hâlini yükleyip tekrar dene.");
  if (status === 422) return new Error("GitHub kaydı doğrulanamadı. Alanları kontrol et.");
  if (status >= 500) return new Error("GitHub şu anda yanıt veremiyor. Biraz sonra tekrar dene.");
  return new Error("GitHub işlemi tamamlanamadı.");
}

export function createGitHubClient({
  fetch: fetchImplementation = globalThis.fetch,
  crypto: cryptoProvider = globalThis.crypto,
  storage = globalThis.localStorage,
} = {}) {
  if (typeof fetchImplementation !== "function") throw new Error("Fetch desteği bulunamadı.");

  async function request(path, { token, method = "GET", body } = {}) {
    const url = `${API_ROOT}${path}`;
    if (!url.startsWith(`${API_ROOT}/`)) throw new Error("Geçersiz GitHub isteği.");
    const headers = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": GITHUB_CONFIG.apiVersion,
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    let response;
    try {
      response = await fetchImplementation(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new Error("GitHub bağlantısı kurulamadı. İnternetini kontrol et.");
    }
    if (!response.ok) throw errorForStatus(response.status);
    return response.json().catch(() => ({}));
  }

  function saveCredential(payload) {
    if (!storage) throw new Error("Bu tarayıcı kimlik bilgisi saklamayı desteklemiyor.");
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function readCredential() {
    if (!storage) return null;
    const value = storage.getItem(STORAGE_KEY);
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      return parsed?.version === 1 ? parsed : null;
    } catch {
      return null;
    }
  }

  function clearCredential() {
    storage?.removeItem(STORAGE_KEY);
  }

  async function verifyRepositoryAccess(token) {
    const result = await request(`/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`, { token });
    if (result?.permissions?.push !== true) {
      throw new Error("GitHub hesabının bu repoya yazma yetkisi yok.");
    }
    return true;
  }

  async function readRemoteState(token) {
    const result = await request(
      `/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.statePath}?ref=${GITHUB_CONFIG.branch}`,
      { token },
    );
    if (typeof result.content !== "string" || typeof result.sha !== "string") {
      throw new Error("GitHub veri dosyası okunamadı.");
    }
    let state;
    try {
      state = validateState(JSON.parse(base64ToUtf8(result.content)));
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error("GitHub veri dosyası geçerli JSON değil.");
      throw error;
    }
    return { state, sha: result.sha };
  }

  async function commitRemoteState({ token, state, sha, message }) {
    if (typeof sha !== "string" || !sha) throw new Error("GitHub dosya sürümü eksik.");
    if (typeof message !== "string" || !message.trim()) throw new Error("Commit mesajı eksik.");
    const normalized = validateState(state);
    const content = utf8ToBase64(`${JSON.stringify(normalized, null, 2)}\n`);
    const result = await request(
      `/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${GITHUB_CONFIG.statePath}`,
      {
        token,
        method: "PUT",
        body: {
          message: message.trim(),
          content,
          sha,
          branch: GITHUB_CONFIG.branch,
        },
      },
    );
    return {
      commitSha: result?.commit?.sha ?? null,
      sha: result?.content?.sha ?? null,
    };
  }

  return {
    encryptCredential: (token, pin) => encryptCredential(token, pin, cryptoProvider),
    decryptCredential: (payload, pin) => decryptCredential(payload, pin, cryptoProvider),
    saveCredential,
    readCredential,
    clearCredential,
    verifyRepositoryAccess,
    readRemoteState,
    commitRemoteState,
  };
}

export function saveCredential(payload) {
  return createGitHubClient().saveCredential(payload);
}

export function readCredential() {
  return createGitHubClient().readCredential();
}

export function clearCredential() {
  return createGitHubClient().clearCredential();
}

export function verifyRepositoryAccess(token) {
  return createGitHubClient().verifyRepositoryAccess(token);
}

export function readRemoteState(token) {
  return createGitHubClient().readRemoteState(token);
}

export function commitRemoteState(input) {
  return createGitHubClient().commitRemoteState(input);
}
