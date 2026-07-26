import { renderMatchMatrix } from "./lib/matrix.js";
import { calculateStatistics, validateState } from "./lib/model.js";
import { createStateClient } from "./lib/state-api.js";
import { renderScoreStrip } from "./lib/views.js";

function installActionMenu(documentRoot) {
  const button = documentRoot.querySelector(".action-seal");
  const menu = documentRoot.querySelector("#action-menu");
  if (!button || !menu) return;

  function close({ focus = false } = {}) {
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", "İşlem menüsünü aç");
    if (focus) button.focus();
  }

  button.addEventListener("click", () => {
    const open = menu.hidden;
    menu.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "İşlem menüsünü kapat" : "İşlem menüsünü aç");
    if (open) menu.querySelector("a,button")?.focus();
  });
  documentRoot.addEventListener("click", (event) => {
    if (!menu.hidden && !menu.contains(event.target) && !button.contains(event.target)) close();
  });
  documentRoot.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) close({ focus: true });
  });
}

export async function startPublicPage(documentRoot = document, { client = createStateClient() } = {}) {
  const score = documentRoot.querySelector("#score-strip");
  const matrix = documentRoot.querySelector("#matrix-root");
  installActionMenu(documentRoot);
  try {
    const { state } = await client.read();
    const normalized = validateState(state);
    score.innerHTML = renderScoreStrip(normalized, calculateStatistics(normalized));
    matrix.innerHTML = renderMatchMatrix(normalized);
  } catch {
    score.innerHTML = "";
    matrix.innerHTML = `<div class="load-error"><strong>Kayıtlar açılamadı</strong><button type="button" data-retry>Tekrar dene</button></div>`;
    documentRoot.querySelector("[data-retry]")?.addEventListener("click", () => globalThis.location.reload());
  } finally {
    score.removeAttribute("aria-busy");
    matrix.removeAttribute("aria-busy");
  }
}

if (typeof document !== "undefined") startPublicPage();
