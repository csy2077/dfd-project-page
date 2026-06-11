// Shared tab component. Lazy-renders each panel on first activation and
// pauses videos in hidden panels so only the visible tab streams.
//
//   mountTabs(root, [
//     { label: "AgiBot", render: (panel) => { panel.innerHTML = "…"; } },
//     …
//   ]);

let _seq = 0;

export function mountTabs(root, tabs, { initial = 0 } = {}) {
  if (!tabs.length) return;
  const uid = `tabset-${_seq++}`;

  const nav = document.createElement("div");
  nav.className = "tabs-nav";
  nav.setAttribute("role", "tablist");

  const body = document.createElement("div");
  body.className = "tabs-body";

  const btns = [];
  const panels = [];
  const done = [];

  tabs.forEach((t, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab-btn";
    btn.id = `${uid}-tab-${i}`;
    btn.setAttribute("role", "tab");
    btn.innerHTML = t.label;
    btn.addEventListener("click", () => activate(i));
    nav.appendChild(btn);
    btns.push(btn);

    const panel = document.createElement("div");
    panel.className = "tab-panel";
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", btn.id);
    panel.hidden = true;
    body.appendChild(panel);
    panels.push(panel);
    done.push(false);
  });

  function activate(i) {
    tabs.forEach((_, j) => {
      const on = j === i;
      btns[j].classList.toggle("is-active", on);
      btns[j].setAttribute("aria-selected", on ? "true" : "false");
      panels[j].hidden = !on;
    });
    if (!done[i]) {
      tabs[i].render(panels[i]);
      done[i] = true;
    }
    // Stream only the visible panel.
    panels.forEach((p, j) => {
      p.querySelectorAll("video").forEach(v => {
        if (j === i) { const r = v.play(); if (r) r.catch(() => {}); }
        else v.pause();
      });
    });
  }

  root.append(nav, body);
  activate(initial);
}
