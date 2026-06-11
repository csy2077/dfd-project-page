import { mountShowcase } from './showcase.js';
import { mountAbstract, mountMethod, mountQuant, mountLimitation } from './static_sections.js';

document.addEventListener("DOMContentLoaded", () => {
  const map = {
    "showcase-root":   mountShowcase,
    "abstract-root":   mountAbstract,
    "method-root":     mountMethod,
    "quant-root":      mountQuant,
    "limitation-root": mountLimitation,
  };
  for (const [id, fn] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) fn(el);
  }

  const copyBtn = document.getElementById("copy-bibtex");
  const bibtex = document.getElementById("bibtex-content");
  if (copyBtn && bibtex) {
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(bibtex.textContent);
      const orig = copyBtn.textContent;
      copyBtn.textContent = "Copied!";
      setTimeout(() => { copyBtn.textContent = orig; }, 1500);
    });
  }

  setupScrollReveal();
});

function setupScrollReveal() {
  const targets = document.querySelectorAll(".section");
  targets.forEach(el => el.classList.add("reveal"));

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced || !("IntersectionObserver" in window)) {
    targets.forEach(el => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

  targets.forEach(el => io.observe(el));
}
