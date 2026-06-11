// showcase.js — qualitative-results panels, one independent section per task.
//
// Each panel:
//   Stage:  [ prompt + small Teacher | big DFD (ours) | big DMD baseline ]
//   Bottom: filmstrip of static first-frame thumbnails; click to switch case.
//
// Case data lives in static/data/showcase.json (built by the asset pipeline).

const DATA_URL = "static/data/showcase.json";

let _dataPromise = null;
function loadData() {
  if (!_dataPromise) _dataPromise = fetch(DATA_URL).then(r => r.json());
  return _dataPromise;
}

// Mount the panel for one task ("i2v" | "ar" | "t2v") into `root`.
export function makeTaskShowcase(taskId) {
  return async function mount(root) {
    let data;
    try {
      data = await loadData();
    } catch (e) {
      root.innerHTML = "<p class='sc-error'>Showcase data unavailable.</p>";
      return;
    }
    const task = (data.tasks || []).find(t => t.id === taskId);
    if (!task) {
      root.innerHTML = "<p class='sc-error'>No results for this task.</p>";
      return;
    }
    buildPanel(root, task);
  };
}

function buildPanel(root, task) {
  root.innerHTML = `
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

  const note       = root.querySelector(".sc-note");
  const promptBox  = root.querySelector(".sc-prompt-box");
  const promptText = root.querySelector(".sc-prompt-text");
  const vTeacher   = root.querySelector(".sc-teacher video");
  const vDfd       = root.querySelector(".sc-main-dfd video");
  const vDmd       = root.querySelector(".sc-main-dmd video");
  const dmdLabel   = root.querySelector(".sc-label-dmd");
  const strip      = root.querySelector(".sc-strip");

  note.textContent = task.note || "";
  dmdLabel.textContent = task.baseline || "DMD";

  let caseIdx = 0;

  function setVideo(el, src) {
    if (el.getAttribute("src") === src) return;
    el.setAttribute("src", src);
    el.load();
    const p = el.play();
    if (p) p.catch(() => {});
  }

  function renderCase() {
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

  // Stream only the panel(s) currently on screen.
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
