// Shows a block's <template> in the side panel; every text lives in index.html.
const panel = document.getElementById("panel");

function select(id, scroll) {
  const block = document.getElementById(id);
  const template = block?.querySelector("template");
  if (!template) return;
  document.querySelectorAll(".node").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.id === id)));
  panel.replaceChildren(template.content.cloneNode(true));
  if (scroll) {
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    block.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
  }
}

document.addEventListener("click", e => {
  const target = e.target.closest("[data-id]");
  if (!target) return;
  select(target.dataset.id, !target.classList.contains("node"));
  try { history.replaceState(null, "", "#" + target.dataset.id); } catch (_) {}
});

const start = location.hash.slice(1);
select(document.getElementById(start)?.querySelector("template") ? start : "route", Boolean(start));
