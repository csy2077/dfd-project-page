// static_sections.js — Abstract, Method, Quantitative Results, Limitation.
// All text and figures are adapted from the paper LaTeX sources.

const ABSTRACT = `Recent progress has shown promise in distilling multi-step video
diffusion models into efficient few-step students. Among them, Distribution Matching
Distillation (DMD) and its successor DMD2 achieved strong generation quality and fast
convergence. However, due to the nature of the reverse Kullback&ndash;Leibler (KL)
objective, these methods exhibit two persistent failure modes: a substantial drop in
sample diversity, and visibly over-saturated outputs that deviate from real-video
appearance. In this work, we propose <strong>Data-Forcing Distillation (DFD)</strong>,
a simple post-training framework that restores diversity and fidelity in DMD
<em>with only a single line of code change</em>. At its core is the <em>teacher score
discrepancy</em> that guides the student toward the real-data distribution, pulling it
to missing modes (mitigating mode collapse) and away from problematic modes absent in
real data (avoiding over-saturation). We provide an in-depth theoretical analysis of
our framework and validate our approach on text-to-video, image-to-video, and
autoregressive video generation. With <em>only 100&ndash;300 steps</em> of finetuning, DFD effectively
restores diversity and fidelity on both Wan2.1-1.3B and Cosmos-Predict2.5-2B models,
resolving the over-saturation artifacts with significantly better video dynamics and
appearance, and even outperforms the teacher model.`;

const METHOD_CAPTION = `<strong>DFD vs.&nbsp;the original DMD.</strong> Our DFD computes
the real score directly on videos sampled from the real data distribution, while the
original DMD computes the real score on the student's own generations. Evaluating the
teacher score at real samples exposes the <em>teacher score discrepancy</em> &mdash;
the gap, in the teacher's score field, between a real sample and the student's
generation &mdash; which pulls the student toward modes it has missed and away from
over-saturated outputs that do not exist in real data.`;

const METHOD_TEXT = `DFD injects a real-data regularization term into the DMD gradient:
instead of evaluating the teacher (real) score at the student's output
<span class="math">G<sub>&theta;</sub>(z,&nbsp;c)</span>, we evaluate it at a real
sample <span class="math">x&nbsp;&sim;&nbsp;p<sub>real</sub>(&middot;&nbsp;|&nbsp;c)</span>
drawn under the same condition.`;

// eq:dfd_grad_simple — the simplified DFD gradient (Practical Implementation).
const DFD_GRAD_SIMPLE_TEX = String.raw`
  g_{\mathrm{DFD}}(\theta)
  \;=\;
  \mathbb{E}_{\substack{\boldsymbol{x} \sim p_{\mathrm{real}}(\cdot \mid c) \\
                        \boldsymbol{z} \sim \mathcal{N}(\boldsymbol{0},\, \boldsymbol{I})}}\!
  \left[\bigl(\nabla_{x} \log p_{\mathrm{fake}}(G_\theta(\boldsymbol{z}, c))
        - \nabla_x \log p_{\mathrm{real}}(\boldsymbol{x})\bigr)\,
        \nabla_\theta G_\theta(\boldsymbol{z}, c)\right]`;

const PRACTICAL_TEXT = `The only difference compared to the DMD gradient is the second
score: it is evaluated at a real data sample <span class="math">x</span> instead of the
student's own output. In practice the update stochastically mixes the DFD and DMD
gradients with probability <span class="math">p</span>, which reduces to a
<strong>single line of code change</strong> in the DMD2 training loop (highlighted
below).`;

// Algorithm 1 — Student update step, Jupyter-notebook style.
// Condensed to the essential lines; the {hl} line is the only DFD vs DMD difference.
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Lightweight Python-ish syntax highlighter for the notebook cell.
function pyHighlight(line) {
  // whole-line comment
  const cm = line.match(/^(\s*)(#.*)$/);
  if (cm) return `${cm[1]}<span class="tok-com">${esc(cm[2])}</span>`;

  // split off a trailing inline comment (not inside quotes — safe for our snippet)
  let code = line, trail = "";
  const hash = line.indexOf("#");
  if (hash >= 0) { code = line.slice(0, hash); trail = line.slice(hash); }

  let h = esc(code);
  h = h.replace(/\b(def|if|else|return|for|in|None|True|False)\b/g, '<span class="tok-kw">$1</span>');
  h = h.replace(/\b(student_network|teacher_network|fake_score_network|forward_diffusion|detach|rand|mse_loss)\b/g,
                '<span class="tok-fn">$1</span>');
  h = h.replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-num">$1</span>');
  if (trail) h += `<span class="tok-com">${esc(trail)}</span>`;
  return h;
}

const ALGO_LINES = [
  "def student_update_step(z, t, eps, data, cond, p):",
  "    gen = student_network(z, t, cond)                  # student sample",
  "    # teacher_in = gen.detach()                        # original DMD",
  { hl: "    teacher_in = data.detach() if torch.rand() < p else gen.detach()" },
  "    fake  = fake_score_network(forward_diffusion(gen, eps, t), t, cond)",
  "    real  = teacher_network(forward_diffusion(teacher_in, eps, t), t, cond)",
  "    target = gen - (fake - real)                       # DMD/DFD gradient",
  "    return 0.5 * F.mse_loss(gen, target.detach())",
];

function algoHtml() {
  const lines = ALGO_LINES.map(l => {
    if (typeof l === "string")
      return `<span class="nb-line">${pyHighlight(l) || "&nbsp;"}</span>`;
    return `<span class="nb-line nb-hl">${pyHighlight(l.hl)}</span>`;
  }).join("\n");
  return `
    <figure class="nb-cell">
      <div class="nb-head">
        <span class="nb-dots"><i></i><i></i><i></i></span>
        <span class="nb-title">student_update_step.py</span>
      </div>
      <div class="nb-body">
        <span class="nb-prompt">In&nbsp;[1]:</span>
        <pre class="nb-code"><code>${lines}</code></pre>
      </div>
      <figcaption class="algo-note">
        The <span class="hl-word">highlighted</span> line is the <em>only</em>
        difference between the DFD and DMD frameworks.
      </figcaption>
    </figure>`;
}

export function mountAbstract(root) {
  root.innerHTML = `<p>${ABSTRACT}</p>`;
}

export function mountMethod(root) {
  root.innerHTML = `
    <figure>
      <img src="static/images/method_dfd.jpg" alt="Comparison between DFD and DMD"
           style="width: 100%; max-width: 1100px; display: block; margin: 0 auto;">
      <figcaption class="caption">${METHOD_CAPTION}</figcaption>
    </figure>
    <p>${METHOD_TEXT}</p>

    <h3 class="method-sub">Practical Implementation</h3>
    <p>The DFD gradient reduces to a clean, simple form:</p>
    <div class="method-eq" id="dfd-grad-eq"></div>
    <p>${PRACTICAL_TEXT}</p>
    ${algoHtml()}
    <p class="method-note">
      Because DFD provides <em>explicit</em> real-data supervision through the score
      discrepancy term, the auxiliary GAN loss used by DMD2 can be dropped entirely
      without hurting performance. DFD is applied as a short post-training stage
      (100&ndash;300 steps) on top of a DMD2-pretrained student.
    </p>
  `;

  // Render eq:dfd_grad_simple with KaTeX (plain-text fallback if CDN is blocked).
  const eqEl = root.querySelector("#dfd-grad-eq");
  if (window.katex) {
    window.katex.render(DFD_GRAD_SIMPLE_TEX, eqEl, { displayMode: true, throwOnError: false });
  } else {
    eqEl.innerHTML = `<code>g_DFD(&theta;) = E_{x~p_real(&middot;|c), z~N(0,I)}[ (&nabla;_x log p_fake(G_&theta;(z,c)) &minus; &nabla;_x log p_real(x)) &nabla;_&theta; G_&theta;(z,c) ]</code>`;
  }
}

// ---- Quantitative results: all tables from the paper ----
// Values copied verbatim from the LaTeX sources; bold marks the best value
// per column as in the paper (best among distilled methods where applicable).

// Cell helper: ["0.956", true] renders bold.
const td = (cell) =>
  Array.isArray(cell) ? `<td><strong>${cell[0]}</strong></td>` : `<td>${cell}</td>`;

function tableHtml({ groups, cols, rows }) {
  const groupRow = groups
    ? `<tr class="qt-groups"><th></th>${groups.map(g => `<th colspan="${g.span}">${g.label}</th>`).join("")}</tr>`
    : "";
  const colRow = `<tr class="qt-cols">${cols.map(c => `<th>${c}</th>`).join("")}</tr>`;
  const body = rows.map(r =>
    `<tr class="${r.cls || ""}"><td>${r.name}</td>${r.cells.map(td).join("")}</tr>`
  ).join("");
  return `
    <div class="table-scroll">
      <table class="quant-table">
        <thead>${groupRow}${colRow}</thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

const VBENCH_I2V_COLS = ["Method","Subject<br>Cons.","Background<br>Cons.","Aesthetic<br>Quality",
  "Temporal<br>Flicker.","Motion<br>Smooth.","I2V<br>Subject","I2V<br>Background","Average"];

const QUANT_TABLES = [
  {
    title: "Text-to-Video (Wan2.1-1.3B)",
    caption: `Averaged over an animation test set and a mix-style test set
      (70&nbsp;+&nbsp;70 prompts &times; 8 seeds = 1120 videos). DFD leads in average
      VBench quality and in <em>every</em> diversity metric, while DMD2 and DP-DMD
      collapse toward homogeneous styles and near-static camera motion.`,
    table: {
      groups: [{label:"Video Quality",span:6},{label:"Video Diversity",span:4},{label:"Camera Pose Diversity",span:2}],
      cols: ["Method","Subject<br>Cons.","Background<br>Cons.","Temporal<br>Flicker.","Motion<br>Smooth.",
             "Aesthetic<br>Quality","Average<br>VBench","CLIP<br>(Mean)","CLIP<br>(Per-frame)",
             "DINO<br>(Mean)","DINO<br>(Per-frame)","Endpoint<br>Dist.","Trajectory<br>Dist."],
      rows: [
        { name:"Teacher", cls:"qt-teacher",
          cells:["0.956","0.959","0.976","0.985","0.622","0.899","0.178","0.222","0.301","0.350","30.571","26.651"] },
        { name:"DMD2",
          cells:["0.956",["0.957"],"0.973","0.985","0.634","0.901","0.120","0.165","0.190","0.239","9.148","4.284"] },
        { name:"DP-DMD",
          cells:[["0.960"],["0.957"],["0.977"],"0.987","0.633","0.903","0.126","0.165","0.197","0.239","7.208","3.466"] },
        { name:"DFD (Ours)", cls:"qt-ours",
          cells:["0.956","0.955","0.976",["0.988"],["0.655"],["0.906"],["0.128"],["0.170"],["0.205"],["0.252"],["18.513"],["19.256"]] },
      ],
    },
  },
  {
    title: "Image-to-Video (Cosmos-Predict2.5-2B) — VBench test suite",
    caption: `VBench metrics on the VBench test image suite; higher is better. DFD
      consistently outperforms the baselines on all metrics, and is even better than
      the teacher model.`,
    table: {
      cols: VBENCH_I2V_COLS,
      rows: [
        { name:"Teacher", cls:"qt-teacher",
          cells:["0.9616","0.9648","0.6320","0.9717","0.9905","0.9867","0.9925","0.9285"] },
        { name:"DMD2",
          cells:["0.9421","0.9621","0.6301","0.9734","0.9886","0.9850","0.9900","0.9245"] },
        { name:"DP-DMD",
          cells:["0.8457","0.9068","0.5850","0.9603","0.9832","0.9570","0.9520","0.8843"] },
        { name:"DFD (Ours)", cls:"qt-ours",
          cells:[["0.9613"],["0.9692"],["0.6371"],["0.9759"],["0.9900"],["0.9859"],["0.9930"],["0.9303"]] },
      ],
    },
  },
  {
    title: "Image-to-Video — curated ViPE test set",
    caption: `VBench metrics on our curated ViPE test set; higher is better. DFD again
      outperforms DMD2 and DP-DMD, and surpasses the teacher model.`,
    table: {
      cols: ["Method","Subject<br>Cons.","Background<br>Cons.","Aesthetic<br>Quality",
             "Temporal<br>Flicker.","Motion<br>Smooth.","I2V<br>Subject","I2V<br>Background","Average"],
      rows: [
        { name:"Teacher", cls:"qt-teacher",
          cells:["0.9340","0.9468","0.6026","0.9694","0.9886","0.9781","0.9860","0.9151"] },
        { name:"DMD2",
          cells:["0.9340","0.9473",["0.6095"],"0.9722","0.9892","0.9805","0.9868","0.9171"] },
        { name:"DP-DMD",
          cells:["0.8372","0.8942","0.5621","0.9562","0.9823","0.9545","0.9655","0.8789"] },
        { name:"DFD (Ours)", cls:"qt-ours",
          cells:[["0.9417"],["0.9538"],"0.6047",["0.9814"],["0.9918"],["0.9825"],["0.9893"],["0.9207"]] },
      ],
    },
  },
  {
    title: "Scaling up with large batch size (Image-to-Video)",
    caption: `Models distilled with batch size 16 vs.&nbsp;128, evaluated on the
      VBench test set. The larger batch yields better temporal stability during large
      motions and improved physical plausibility.`,
    table: {
      cols: ["Batch size","Subject<br>Cons.","Background<br>Cons.","Aesthetic<br>Quality",
             "Temporal<br>Flicker.","Motion<br>Smooth.","I2V<br>Subject","I2V<br>Background","Average"],
      rows: [
        { name:"16",
          cells:["0.9613",["0.9692"],"0.6371",["0.9759"],"0.9900","0.9859",["0.9930"],"0.9303"] },
        { name:"128", cls:"qt-ours",
          cells:[["0.9638"],"0.9685",["0.6383"],"0.9783",["0.9914"],["0.9878"],"0.9929",["0.9316"]] },
      ],
    },
  },
  {
    title: "Ablation: effect of the GAN loss (Text-to-Video, animation set)",
    caption: `Removing the GAN loss yields results comparable to the model distilled
      with it &mdash; DFD's explicit real-data supervision makes the GAN unnecessary,
      and dynamic degree even improves.`,
    table: {
      cols: ["Model (DFD)","Subject<br>Cons.","Background<br>Cons.","Temporal<br>Flicker.",
             "Motion<br>Smooth.","Dynamic<br>Degree","Aesthetic<br>Quality","Imaging<br>Quality"],
      rows: [
        { name:"w/o GAN", cls:"qt-ours",
          cells:[["0.9690"],"0.9620","0.9785","0.9899",["0.5000"],"0.7194",["0.7452"]] },
        { name:"w/ GAN",
          cells:["0.9666",["0.9625"],["0.9831"],["0.9912"],"0.3750",["0.7213"],"0.7210"] },
      ],
    },
  },
  {
    title: "Ablation: gradient mixing weight w (Text-to-Video, animation set)",
    caption: `Comparing w&nbsp;=&nbsp;&frac12; (our default, DFD&nbsp;+&nbsp;DMD mixture)
      against w&nbsp;=&nbsp;1 (pure DFD). The differences are small, indicating the
      method is stable and insensitive to the choice of w.`,
    table: {
      cols: ["Model","Subject<br>Cons.","Background<br>Cons.","Temporal<br>Flicker.",
             "Motion<br>Smooth.","Dynamic<br>Degree","Aesthetic<br>Quality","Imaging<br>Quality"],
      rows: [
        { name:"w = 1/2", cls:"qt-ours",
          cells:[["0.9691"],["0.9661"],"0.9830","0.9907",["0.5625"],"0.7135",["0.7457"]] },
        { name:"w = 1",
          cells:["0.9666","0.9625",["0.9831"],["0.9912"],"0.3750",["0.7213"],"0.7210"] },
      ],
    },
  },
];

export function mountQuant(root) {
  root.innerHTML = `
    <p>
      All quantitative results from the paper. Bold marks the best value per column
      (best among distilled methods where the teacher is shown); higher is better.
    </p>
    ${QUANT_TABLES.map(t => `
      <h3 class="quant-sub">${t.title}</h3>
      <p class="quant-caption">${t.caption}</p>
      ${tableHtml(t.table)}
    `).join("")}
  `;
}

const LIMITATION_TEXT = `While DFD substantially improves few-step video generation, its
performance remains limited under an extremely constrained generation budget. When
generation is restricted to two steps or fewer, the two-step distilled
Cosmos-Predict2.5-2B model still struggles to produce high-quality videos: fast-moving
objects, such as the man's hands, appear blurry; fine details, such as the woman's
facial features, lose fidelity; and the model sometimes collapses to nearly static
videos with little motion. Despite the improvements brought by DFD, generating
high-quality and temporally dynamic videos remains challenging in the highly
aggressive two-step-or-fewer regime.`;

export function mountLimitation(root) {
  root.innerHTML = `
    <p>${LIMITATION_TEXT}</p>
    <figure>
      <div class="limit-grid">
        <video src="static/videos/limitation/limit_1.mp4" muted loop playsinline preload="none"></video>
        <video src="static/videos/limitation/limit_2.mp4" muted loop playsinline preload="none"></video>
      </div>
      <figcaption class="caption">
        <strong>Limitation of DFD under a two-step generation budget.</strong>
        With two-step distillation of the Cosmos-Predict2.5-2B model, DFD still produces
        blurry results for fast-moving content, loses fine detail, or collapses to
        highly static videos.
      </figcaption>
    </figure>
  `;

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => e.target.querySelectorAll("video").forEach(v => {
        if (e.isIntersecting) { const p = v.play(); if (p) p.catch(() => {}); }
        else v.pause();
      }));
    }, { threshold: 0.1 });
    io.observe(root.querySelector(".limit-grid"));
  } else {
    root.querySelectorAll("video").forEach(v => { const p = v.play(); if (p) p.catch(() => {}); });
  }
}
