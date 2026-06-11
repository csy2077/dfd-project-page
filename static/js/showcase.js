// showcase.js — interactive qualitative-results panel.
//
// Top:    three task buttons (Image-to-Video / Autoregressive / Text-to-Video).
// Stage:  [ prompt + small Teacher | big DFD (ours) | big DMD baseline ].
// Bottom: filmstrip of static first-frame thumbnails; click to switch case.
//
// Case data lives in static/data/showcase.json (built by the asset pipeline).

const DATA_URL = "static/data/showcase.json";

export async function mountShowcase(root) {
  let data;
  try {
    data = await (await fetch(DATA_URL)).json();
  } catch (e) {
    root.innerHTML = "<p class='sc-error'>Showcase data unavailable.</p>";
    return;
  }

  const tasks = data.tasks || [];
  if (!tasks.length) return;

  // ---------- skeleton ----------
  root.innerHTML = `
    <div class="sc-task-nav" role="tablist"></div>
    <p class="sc-note"></p>
    <div class="sc-stage">
      <div class="sc-side">
        <div class="sc-prompt-box">
          <div class="sc-box-label">Prompt</div>
          <div class="sc-prompt-text"></div>
        </div>
        <figure class="sc-teacher">
          <div class="sc-box-label">Teacher</div>
          <video muted loop playsinline preload="metadata"></video>
        </figure>
      </div>
      <figure class="sc-main sc-main-dfd">
        <div class="sc-vid-label is-ours">DFD (Ours)</div>
        <video muted loop playsinline preload="metadata"></video>
      </figure>
      <figure class="sc-main sc-main-dmd">
        <div class="sc-vid-label sc-label-dmd">DMD2</div>
        <video muted loop playsinline preload="metadata"></video>
      </figure>
    </div>
    <div class="sc-strip" role="listbox" aria-label="Choose a result"></div>
  `;

  const nav        = root.querySelector(".sc-task-nav");
  const note       = root.querySelector(".sc-note");
  const promptBox  = root.querySelector(".sc-prompt-box");
  const promptText = root.querySelector(".sc-prompt-text");
  const vTeacher   = root.querySelector(".sc-teacher video");
  const vDfd       = root.querySelector(".sc-main-dfd video");
  const vDmd       = root.querySelector(".sc-main-dmd video");
  const dmdLabel   = root.querySelector(".sc-label-dmd");
  const strip      = root.querySelector(".sc-strip");

  let taskIdx = 0;
  let caseIdx = 0;

  // ---------- task buttons ----------
  const taskBtns = tasks.map((t, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sc-task-btn";
    b.textContent = t.label;
    b.setAttribute("role", "tab");
    b.addEventListener("click", () => { taskIdx = i; caseIdx = 0; renderTask(); });
    nav.appendChild(b);
    return b;
  });

  function setVideo(el, src) {
    if (el.getAttribute("src") === src) return;
    el.setAttribute("src", src);
    el.load();
    const p = el.play();
    if (p) p.catch(() => {});
  }

  function renderCase() {
    const task = tasks[taskIdx];
    const c = task.cases[caseIdx];

    // prompt (blank box for i2v)
    if (c.prompt) {
      promptBox.classList.remove("is-empty");
      promptText.textContent = c.prompt;
    } else {
      promptBox.classList.add("is-empty");
      promptText.textContent = "";
    }

    setVideo(vTeacher, c.videos.teacher);
    setVideo(vDfd,     c.videos.dfd);
    setVideo(vDmd,     c.videos.dmd);

    strip.querySelectorAll(".sc-thumb").forEach((el, i) => {
      el.classList.toggle("is-active", i === caseIdx);
      el.setAttribute("aria-selected", i === caseIdx ? "true" : "false");
    });
  }

  function renderTask() {
    const task = tasks[taskIdx];
    taskBtns.forEach((b, i) => b.classList.toggle("is-active", i === taskIdx));
    note.textContent = task.note || "";
    dmdLabel.textContent = task.baseline || "DMD";

    strip.innerHTML = "";
    task.cases.forEach((c, i) => {
      const t = document.createElement("button");
      t.type = "button";
      t.className = "sc-thumb";
      t.setAttribute("role", "option");
      t.title = c.title;
      t.innerHTML = `<img src="${c.thumb}" alt="${c.title}" loading="lazy"><span>${c.title}</span>`;
      t.addEventListener("click", () => { caseIdx = i; renderCase(); });
      strip.appendChild(t);
    });

    renderCase();
  }

  renderTask();

  // Pause the showcase videos when scrolled far off-screen; resume when back.
  if ("IntersectionObserver" in window) {
    const vids = [vTeacher, vDfd, vDmd];
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        vids.forEach(v => {
          if (!v.getAttribute("src")) return;
          if (e.isIntersecting) { const p = v.play(); if (p) p.catch(() => {}); }
          else v.pause();
        });
      });
    }, { threshold: 0.05 });
    io.observe(root.querySelector(".sc-stage"));
  }
}
