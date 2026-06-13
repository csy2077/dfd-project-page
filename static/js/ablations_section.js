// ablations_section.js — qualitative ablation studies as labelled video grids.
//
// Each block: a heading, a short description (adapted from the paper), and a grid
// of autoplaying videos with column headers (and optional row labels). Videos are
// lazily started/paused via an IntersectionObserver so off-screen grids don't stream.

const V = (src) => `static/videos/ablations/${src}`;

// Each block renders like the Limitation figure: a row of videos + a caption.
// `videos` is a single row; the caption spells out which column is which.
const BLOCKS = [
  {
    id: "ab-mix",
    title: "Gradient Mixing Weight",
    videos: [V("mix_half_1.mp4"), V("mix_one_1.mp4")],
    caption: `<strong>Gradient mixing weight.</strong> Left: <strong>w = ½</strong>
      (our default, a DFD&nbsp;+&nbsp;DMD mixture). Right: <strong>w = 1</strong>
      (pure DFD). The two settings look nearly identical, showing DFD is stable and
      insensitive to the choice of w.`,
  },
  {
    id: "ab-gan",
    title: "Effect of the GAN Loss",
    videos: [V("gan_with.mp4"), V("gan_without.mp4")],
    caption: `<strong>Effect of the GAN loss.</strong> Left: with GAN loss. Right:
      without GAN loss (ours). Because DFD supervises with real data explicitly, the
      GAN can be dropped &mdash; this even improves dynamic degree and imaging quality
      while keeping the other metrics comparable.`,
  },
  {
    id: "ab-scratch",
    title: "Distilling from Scratch (No DMD2 Pretraining)",
    videos: [V("scratch_t2v_1.mp4"), V("scratch_i2v_1.mp4")],
    caption: `<strong>Distilling from scratch.</strong> Left: text-to-video. Right:
      image-to-video. Initializing directly from the teacher violates the validity
      condition: even after a long run (e.g.&nbsp;1400 iterations) the model fails to
      converge.`,
  },
  {
    id: "ab-scale",
    title: "Scaling Up with Large Batch Size",
    videos: [V("scale_bs16_1.mp4"), V("scale_bs128_1.mp4")],
    caption: `<strong>Scaling up the batch size.</strong> Left: batch size 16. Right:
      batch size 128. The larger batch consistently improves results &mdash; notably
      better temporal stability during large motions and improved physical plausibility
      (e.g.&nbsp;object permanence).`,
  },
];

export function mountAblations(root) {
  root.innerHTML = `
    <p>
      Qualitative ablations isolating each design choice in DFD. Quantitative numbers
      for these studies are in the <a href="#quant">Quantitative Results</a> section.
    </p>
    ${BLOCKS.map(b => `
      <div class="ab-block" id="${b.id}">
        <h3 class="ab-title">${b.title}</h3>
        <figure>
          <div class="limit-grid">
            ${b.videos.map(src =>
              `<video src="${src}" muted loop playsinline preload="none"></video>`).join("")}
          </div>
          <figcaption class="caption">${b.caption}</figcaption>
        </figure>
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
    root.querySelectorAll(".limit-grid").forEach(g => io.observe(g));
  } else {
    root.querySelectorAll("video").forEach(v => { const p = v.play(); if (p) p.catch(() => {}); });
  }
}
