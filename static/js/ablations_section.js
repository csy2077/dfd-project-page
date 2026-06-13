// ablations_section.js — qualitative ablation studies as labelled video grids.
//
// Each block: a heading, a short description (adapted from the paper), and a grid
// of autoplaying videos with column headers (and optional row labels). Videos are
// lazily started/paused via an IntersectionObserver so off-screen grids don't stream.

const V = (src) => `static/videos/ablations/${src}`;

const BLOCKS = [
  {
    id: "ab-mix",
    title: "Gradient Mixing Weight",
    desc: `DFD forms its practical update as a mixture of the DFD and DMD gradients
      with weight <span class="math">w</span>. We compare <strong>w&nbsp;=&nbsp;&frac12;</strong>
      (our default, a DFD&nbsp;+&nbsp;DMD mixture) against <strong>w&nbsp;=&nbsp;1</strong>
      (pure DFD). The two settings look nearly identical, showing the method is stable
      and insensitive to the choice of <span class="math">w</span>.`,
    cols: ["w = 1/2 &nbsp;(DFD + DMD mixture)", "w = 1 &nbsp;(pure DFD)"],
    rows: [
      [V("mix_half_1.mp4"), V("mix_one_1.mp4")],
      [V("mix_half_2.mp4"), V("mix_one_2.mp4")],
    ],
  },
  {
    id: "ab-gan",
    title: "Effect of the GAN Loss",
    desc: `DMD2 relies on an auxiliary GAN loss for implicit real-data supervision.
      Because DFD supervises with real data <em>explicitly</em>, the GAN can be dropped:
      removing it simplifies the pipeline and even improves dynamic degree and imaging
      quality, while keeping the other metrics comparable.`,
    cols: ["With GAN loss", "Without GAN loss (Ours)"],
    colClass: ["", "is-ours"],
    rows: [
      [V("gan_with.mp4"), V("gan_without.mp4")],
    ],
  },
  {
    id: "ab-scratch",
    title: "Distilling from Scratch (No DMD2 Pretraining)",
    desc: `DFD requires the <em>validity condition</em> to hold for stable training,
      which a DMD2-pretrained student satisfies. Initializing directly from the teacher
      instead &mdash; distilling from scratch &mdash; violates this condition: even after
      a long run (e.g.&nbsp;1400 iterations) the model fails to converge, on both
      text-to-video and image-to-video tasks.`,
    cols: ["From scratch — sample 1", "From scratch — sample 2"],
    rowLabels: ["Text-to-Video", "Image-to-Video"],
    rows: [
      [V("scratch_t2v_1.mp4"), V("scratch_t2v_2.mp4")],
      [V("scratch_i2v_1.mp4"), V("scratch_i2v_2.mp4")],
    ],
  },
  {
    id: "ab-scale",
    title: "Scaling Up with Large Batch Size",
    desc: `Scaling the image-to-video batch size from <strong>16</strong> to
      <strong>128</strong> consistently improves results &mdash; notably better temporal
      stability during large motions and improved physical plausibility (e.g.&nbsp;object
      permanence).`,
    cols: ["Batch size 16", "Batch size 128"],
    colClass: ["", "is-ours"],
    rows: [
      [V("scale_bs16_1.mp4"), V("scale_bs128_1.mp4")],
      [V("scale_bs16_2.mp4"), V("scale_bs128_2.mp4")],
    ],
  },
];

function gridHtml(block) {
  const ncol = block.cols.length;
  const hasRowLabels = !!block.rowLabels;
  const colClass = block.colClass || block.cols.map(() => "");

  const header =
    (hasRowLabels ? `<div class="ab-rowlabel-spacer"></div>` : "") +
    block.cols.map((c, i) =>
      `<div class="ab-col-head ${colClass[i]}">${c}</div>`).join("");

  const rows = block.rows.map((row, r) => {
    const label = hasRowLabels
      ? `<div class="ab-row-label">${block.rowLabels[r]}</div>` : "";
    const cells = row.map(src =>
      `<div class="ab-cell"><video src="${src}" muted loop playsinline preload="none"></video></div>`
    ).join("");
    return label + cells;
  }).join("");

  const cols = (hasRowLabels ? "auto " : "") + `repeat(${ncol}, 1fr)`;
  return `
    <div class="ab-grid" style="grid-template-columns: ${cols};">
      ${header}${rows}
    </div>`;
}

export function mountAblations(root) {
  root.innerHTML = `
    <p>
      Qualitative ablations isolating each design choice in DFD. Quantitative numbers
      for these studies are in the <a href="#quant">Quantitative Results</a> section.
    </p>
    ${BLOCKS.map(b => `
      <div class="ab-block" id="${b.id}">
        <h3 class="ab-title">${b.title}</h3>
        <p class="ab-desc">${b.desc}</p>
        ${gridHtml(b)}
      </div>
    `).join("")}
  `;

  // Lazy play / pause per block.
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        e.target.querySelectorAll("video").forEach(v => {
          if (e.isIntersecting) {
            if (!v.getAttribute("src")) return;
            const p = v.play(); if (p) p.catch(() => {});
          } else {
            v.pause();
          }
        });
      });
    }, { threshold: 0.1 });
    root.querySelectorAll(".ab-grid").forEach(g => io.observe(g));
  } else {
    root.querySelectorAll("video").forEach(v => { const p = v.play(); if (p) p.catch(() => {}); });
  }
}
