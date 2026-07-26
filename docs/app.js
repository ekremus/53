import { calculateStatistics, validateState } from "./lib/model.js";
import {
  renderArchive,
  renderLatestMatch,
  renderLeaderboard,
  renderRecentMatches,
  renderScoreboard,
} from "./lib/views.js";

function openDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

export async function startApp(documentRoot = document, dependencies = {}) {
  const fetchImplementation = dependencies.fetch ?? globalThis.fetch;
  const targets = {
    scoreboard: documentRoot.querySelector("#scoreboard"),
    latest: documentRoot.querySelector("#latest-match"),
    recent: documentRoot.querySelector("#recent-matches"),
    leaderboard: documentRoot.querySelector("#leaderboard"),
    archive: documentRoot.querySelector("#archive-dialog"),
    archiveTitle: documentRoot.querySelector("[data-archive-title]"),
    archiveContent: documentRoot.querySelector("[data-archive-content]"),
    notice: documentRoot.querySelector("#notice-region"),
  };

  function notify(message, tone = "error") {
    if (!targets.notice) return;
    targets.notice.innerHTML = `<div class="notice notice--${tone}" role="status">${String(message).replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</div>`;
    globalThis.setTimeout?.(() => { targets.notice.innerHTML = ""; }, 4200);
  }

  function render(state) {
    const stats = calculateStatistics(state);
    targets.scoreboard.innerHTML = renderScoreboard(state, stats);
    targets.latest.innerHTML = renderLatestMatch(state);
    targets.recent.innerHTML = renderRecentMatches(state, 5);
    targets.leaderboard.innerHTML = renderLeaderboard(stats, 8);
    for (const target of [targets.scoreboard, targets.latest, targets.recent, targets.leaderboard]) {
      target?.removeAttribute("aria-busy");
    }
    return stats;
  }

  let state;
  try {
    const response = await fetchImplementation(`./data/state.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Maç kayıtları yüklenemedi.");
    state = validateState(await response.json());
    render(state);
  } catch (error) {
    notify(error instanceof Error ? error.message : "Maç kayıtları yüklenemedi.");
    targets.latest.innerHTML = `<div class="empty-state"><strong>Kayıtlar yüklenemedi</strong><button class="text-action" type="button" data-retry>Tekrar dene</button></div>`;
    documentRoot.querySelector("[data-retry]")?.addEventListener("click", () => globalThis.location?.reload());
    return null;
  }

  documentRoot.querySelectorAll("[data-open-archive]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.openArchive;
      const stats = calculateStatistics(state);
      targets.archiveTitle.textContent = view === "players" ? "Tüm oyuncular" : "Tüm maçlar";
      targets.archiveContent.innerHTML = renderArchive(state, stats, view);
      openDialog(targets.archive);
    });
  });
  documentRoot.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => closeDialog(button.closest("dialog")));
  });

  return { getState: () => state, render, notify };
}

if (typeof document !== "undefined") {
  startApp(document);
}
