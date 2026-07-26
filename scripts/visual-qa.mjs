import { mkdir, writeFile } from "node:fs/promises";

const cdpRoot = process.env.CDP_ENDPOINT ?? "http://127.0.0.1:9223";
const appUrl = process.env.APP_URL ?? "http://127.0.0.1:4173/";
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
  const result = await session.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function capture(session, name) {
  const result = await session.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(new URL(name, outputDirectory), Buffer.from(result.data, "base64"));
}

async function inspectViewport({ width, height, name, states = [] }) {
  const target = await createTarget("about:blank");
  const session = createSession(target.webSocketDebuggerUrl);
  await session.ready;
  await session.send("Page.enable");
  await session.send("Runtime.enable");
  await session.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 600,
    screenWidth: width,
    screenHeight: height,
  });
  await session.send("Page.navigate", { url: appUrl });
  await new Promise((resolve) => setTimeout(resolve, 1400));
  await evaluate(session, `Promise.all([...document.images].map((image) => image.complete ? true : new Promise((resolve) => {
    image.addEventListener('load', () => resolve(true), { once: true });
    image.addEventListener('error', () => resolve(false), { once: true });
  })))`);
  const metrics = await evaluate(session, `({
    innerWidth,
    innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    title: document.title,
    matches: document.querySelectorAll('[data-match-id]').length,
    failedImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src),
  })`);
  await capture(session, `${name}-home.png`);
  const stateMetrics = {};
  for (const state of states) {
    await evaluate(session, state.expression);
    await new Promise((resolve) => setTimeout(resolve, 220));
    stateMetrics[state.name] = await evaluate(session, `({
      openDialogs: [...document.querySelectorAll('dialog[open]')].map((dialog) => ({
        id: dialog.id,
        left: dialog.getBoundingClientRect().left,
        right: dialog.getBoundingClientRect().right,
        width: dialog.getBoundingClientRect().width,
        scrollWidth: dialog.scrollWidth,
        closeButton: dialog.querySelector('[data-close-dialog]')?.getBoundingClientRect().toJSON(),
        closeStyle: dialog.querySelector('[data-close-dialog]') ? {
          display: getComputedStyle(dialog.querySelector('[data-close-dialog]')).display,
          visibility: getComputedStyle(dialog.querySelector('[data-close-dialog]')).visibility,
          opacity: getComputedStyle(dialog.querySelector('[data-close-dialog]')).opacity,
          color: getComputedStyle(dialog.querySelector('[data-close-dialog]')).color,
          border: getComputedStyle(dialog.querySelector('[data-close-dialog]')).border,
        } : null,
        elementAtCloseCenter: document.elementFromPoint(353, 59)?.outerHTML,
      })),
    })`);
    await capture(session, `${name}-${state.name}.png`);
  }
  session.close();
  return { ...metrics, states: stateMetrics };
}

await mkdir(outputDirectory, { recursive: true });

const mobileStates = [
  {
    name: "menu",
    expression: `document.querySelector('#fab').click()`,
  },
  {
    name: "credential",
    expression: `document.querySelector('[data-fab-action="credential"]').click()`,
  },
  {
    name: "editor",
    expression: `(async () => {
      document.querySelector('#credential-dialog')?.close();
      const state = await fetch('./data/state.json').then((response) => response.json());
      const module = await import('./lib/editor.js');
      const model = await import('./lib/model.js');
      const draft = model.createEmptyMatch(state, '2026-08-02');
      const ids = state.players.filter((player) => player.active).map((player) => player.id).slice(0, 8);
      state.teams.forEach((team, teamIndex) => draft.teams[team.id].forEach((slot, index) => { slot.playerId = ids[teamIndex * 4 + index]; }));
      document.querySelector('[data-match-form-fields]').innerHTML = module.renderMatchForm(draft, state);
      document.querySelector('#edit-dialog').showModal();
    })()`,
  },
  {
    name: "players",
    expression: `(async () => {
      document.querySelector('#edit-dialog')?.close();
      const state = await fetch('./data/state.json').then((response) => response.json());
      const module = await import('./lib/editor.js');
      document.querySelector('[data-player-manager]').innerHTML = module.renderPlayerManager(state);
      document.querySelector('#players-dialog').showModal();
    })()`,
  },
];

const compactStates = mobileStates.filter((state) => state.name === "editor");

const [compact, mobile, desktop] = await Promise.all([
  inspectViewport({ width: 320, height: 700, name: "compact", states: compactStates }),
  inspectViewport({ width: 390, height: 844, name: "mobile", states: mobileStates }),
  inspectViewport({ width: 1440, height: 1000, name: "desktop" }),
]);

console.log(JSON.stringify({ compact, mobile, desktop }, null, 2));
