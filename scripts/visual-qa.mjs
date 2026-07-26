import { mkdir, writeFile } from "node:fs/promises";

const cdpRoot = process.env.CDP_ENDPOINT ?? "http://127.0.0.1:9223";
const appUrl = new URL(process.env.APP_URL ?? "http://127.0.0.1:4173/");
const outputDirectory = new URL("../.impeccable/qa/", import.meta.url);

async function createTarget(url) {
  const response = await fetch(`${cdpRoot}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  if (!response.ok) throw new Error(`CDP target oluşturulamadı: ${response.status}`);
  return response.json();
}

function createSession(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let nextId = 1;
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  return {
    ready: new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    }),
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close: () => socket.close(),
  };
}

async function evaluate(session, expression) {
  const result = await session.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}

async function capture(session, name) {
  const result = await session.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(new URL(`${name}.png`, outputDirectory), Buffer.from(result.data, "base64"));
}

async function waitForReady(session) {
  await evaluate(session, `new Promise((resolve) => {
    const done = () => !document.querySelector('[aria-busy="true"]');
    if (done()) return resolve(true);
    const timer = setInterval(() => { if (done()) { clearInterval(timer); resolve(true); } }, 50);
    setTimeout(() => { clearInterval(timer); resolve(false); }, 6000);
  })`);
  await evaluate(session, `Promise.all([...document.images].map((image) => image.complete ? true : new Promise((resolve) => {
    image.addEventListener('load', () => resolve(true), { once: true });
    image.addEventListener('error', () => resolve(false), { once: true });
  })))`);
}

async function metrics(session) {
  return evaluate(session, `(() => {
    const matrix = document.querySelector('.match-matrix');
    const rail = document.querySelector('.matrix-rail');
    const originalScrollLeft = matrix?.scrollLeft ?? 0;
    if (matrix) matrix.scrollLeft = 0;
    const railLeftBefore = rail?.getBoundingClientRect().left ?? null;
    if (matrix) matrix.scrollLeft = Math.min(260, matrix.scrollWidth - matrix.clientWidth);
    const railLeftAfter = rail?.getBoundingClientRect().left ?? null;
    if (matrix) matrix.scrollLeft = originalScrollLeft;
    return {
      innerWidth,
      innerHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
      documentScrollHeight: document.documentElement.scrollHeight,
      matrixClientWidth: matrix?.clientWidth ?? null,
      matrixScrollWidth: matrix?.scrollWidth ?? null,
      matrixScrollLeft: originalScrollLeft,
      railLeftBefore,
      railLeftAfter,
      matchColumns: document.querySelectorAll('[data-match-column], [data-edit-match]').length,
      failedImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src),
      openDialogs: [...document.querySelectorAll('dialog[open]')].map((dialog) => dialog.id),
      runtimeErrors: globalThis.__qaErrors ?? [],
    };
  })()`);
}

async function inspectPage({ route, width, height, name, action }) {
  const target = await createTarget("about:blank");
  const session = createSession(target.webSocketDebuggerUrl);
  await session.ready;
  await session.send("Page.enable");
  await session.send("Runtime.enable");
  await session.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `globalThis.__qaErrors = []; addEventListener('error', (event) => __qaErrors.push(event.message)); addEventListener('unhandledrejection', (event) => __qaErrors.push(String(event.reason)));`,
  });
  await session.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600,
    screenWidth: width,
    screenHeight: height,
  });
  await session.send("Page.navigate", { url: new URL(route, appUrl).href });
  await waitForReady(session);
  if (action) {
    await evaluate(session, action);
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  const result = await metrics(session);
  await capture(session, name);
  session.close();
  return result;
}

await mkdir(outputDirectory, { recursive: true });

const checks = [
  { route: "/", width: 320, height: 700, name: "public-320" },
  { route: "/", width: 390, height: 844, name: "public-390" },
  { route: "/", width: 1440, height: 1000, name: "public-1440" },
  { route: "/", width: 390, height: 844, name: "public-390-scrolled", action: `document.querySelector('.match-matrix').scrollLeft = 260` },
  { route: "/edit/", width: 320, height: 700, name: "edit-320" },
  { route: "/edit/", width: 390, height: 844, name: "edit-390" },
  { route: "/edit/", width: 390, height: 844, name: "edit-players-390", action: `document.querySelector('[data-open-players]').click()` },
  { route: "/stats/", width: 390, height: 844, name: "stats-390" },
];

const results = await Promise.all(checks.map(async (check) => [check.name, await inspectPage(check)]));
console.log(JSON.stringify(Object.fromEntries(results), null, 2));
