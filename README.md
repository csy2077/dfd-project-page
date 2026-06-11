# DFD Project Page

Project page for **Data-Forcing Distillation: Restoring Diversity and Fidelity in
Few-Step Video Generation**.

Static site — vanilla HTML / CSS / ES modules (no build step). Adapted from the
oscar-project-page template.

## Preview locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Layout

- `index.html` — page shell: header, TOC, section mount points
- `static/js/showcase.js` — interactive qualitative-results panel
  (task switcher → prompt + teacher | DFD | DMD baseline → thumbnail filmstrip)
- `static/js/static_sections.js` — abstract / method / quantitative table / limitation
- `static/data/showcase.json` — case manifest (task → cases → prompt, thumb, videos)
- `static/videos/{i2v,t2v,ar}/<case>_{teacher,dfd,dmd}.mp4` — result videos
- `static/images/thumbs/` — first-frame thumbnails for the filmstrip

Video sources: `Data-forcing-distillation-supplementary-results/` (i2v + t2v) and
`self_forcing_videos/` (autoregressive; teacher = seed 1).
