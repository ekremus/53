import { calculateStatistics, validateState } from "./lib/model.js";
import { createStateClient } from "./lib/state-api.js";
import { escapeHtml, renderScoreStrip, renderStatsTable } from "./lib/views.js";

function installMenu(documentRoot) {
  const button = documentRoot.querySelector(".action-seal");
  const menu = documentRoot.querySelector("#action-menu");
  button.addEventListener("click", () => {
    const open = menu.hidden;
    menu.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (open) menu.querySelector("a")?.focus();
  });
  documentRoot.addEventListener("click", (event) => {
    if (!menu.hidden && !menu.contains(event.target) && !button.contains(event.target)) {
      menu.hidden = true;
      button.setAttribute("aria-expanded", "false");
    }
  });
  documentRoot.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) {
      menu.hidden = true;
      button.setAttribute("aria-expanded", "false");
      button.focus();
    }
  });
}

export async function startStatsPage(documentRoot = document, client = createStateClient()) {
  const scoreRoot = documentRoot.querySelector("#score-strip");
  const statsRoot = documentRoot.querySelector("#stats-root");
  installMenu(documentRoot);
  try {
    const { state } = await client.read();
    const normalized = validateState(state);
    const stats = calculateStatistics(normalized);
    scoreRoot.innerHTML = renderScoreStrip(normalized, stats);
    statsRoot.innerHTML = renderStatsTable(stats);
  } catch (error) {
    statsRoot.innerHTML = `<div class="load-error"><strong>Sıralama açılamadı</strong><span>${escapeHtml(error.message ?? "Tekrar dene.")}</span></div>`;
  } finally {
    scoreRoot.removeAttribute("aria-busy");
    statsRoot.removeAttribute("aria-busy");
  }
}

if (typeof document !== "undefined") startStatsPage();
