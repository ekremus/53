const destination = document.body.dataset.legacyTarget === "standings"
  ? "/?view=standings"
  : "/?view=matches&edit=1";

globalThis.location.replace(destination);
