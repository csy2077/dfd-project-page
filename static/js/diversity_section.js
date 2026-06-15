// diversity_section.js — DFD vs DMD diversity, same prompt × 8 seeds.
// A 2-row × 8-column grid: left 4 columns are DMD2, right 4 columns are DFD (ours).

const V = (s) => `static/videos/diversity/${s}`;

export function mountDiversity(root) {
  // 2 rows × 4 cols per method; seeds 1..8 laid out row-major.
  const dmd = [1, 2, 3, 4, 5, 6, 7, 8].map(s => V(`dmd_${s}.mp4`));
  const dfd = [1, 2, 3, 4, 5, 6, 7, 8].map(s => V(`dfd_${s}.mp4`));

  const cell = (src) =>
    `<div class="dv-cell"><video src="${src}" muted loop playsinline preload="none"></video></div>`;

  // Build a 2×8 grid: for each row r, first the 4 DMD cells then the 4 DFD cells.
  let cells = "";
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) cells += cell(dmd[r * 4 + c]);
    for (let c = 0; c < 4; c++) cells += cell(dfd[r * 4 + c]);
  }

  root.innerHTML = `
    <p class="dv-intro">
      The same text prompt generated with 8 random seeds. DMD2 collapses to
      near-identical videos, while DFD produces clearly diverse results.
    </p>
    <div class="dv-headers">
      <div class="dv-head">DMD2</div>
      <div class="dv-head is-ours">DFD (Ours)</div>
    </div>
    <div class="dv-grid">${cells}</div>
  `;

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => e.target.querySelectorAll("video").forEach(v => {
        if (e.isIntersecting) { const p = v.play(); if (p) p.catch(() => {}); }
        else v.pause();
      }));
    }, { threshold: 0.05 });
    io.observe(root.querySelector(".dv-grid"));
  } else {
    root.querySelectorAll("video").forEach(v => { const p = v.play(); if (p) p.catch(() => {}); });
  }
}
