#!/usr/bin/env python3
"""Render a silent, sci-fi styled overview video for the DFD project page.

Pure OpenCV + matplotlib + PIL (no ffmpeg). H.264 output (avc1) so it plays
in VS Code / browsers. Structure:
  title -> problem -> idea -> equation -> one-line code
  -> i2v montage -> autoregressive montage -> t2v montage -> outro

Run with the conda python that has cv2 + matplotlib:
  .../pytorch-2.8-cu128/bin/python3 make_overview.py
Output: static/videos/overview.mp4
"""
import os
import cv2
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1280, 720, 24
HERE = os.path.dirname(os.path.abspath(__file__))
VID  = os.path.join(HERE, "static/videos")
OUT  = os.path.join(VID, "overview.mp4")

MPL = os.path.join(os.path.dirname(matplotlib.__file__), "mpl-data/fonts/ttf")
F_REG  = os.path.join(MPL, "DejaVuSans.ttf")
F_BOLD = os.path.join(MPL, "DejaVuSans-Bold.ttf")
F_MONO = os.path.join(MPL, "DejaVuSansMono.ttf")
F_MONOB= os.path.join(MPL, "DejaVuSansMono-Bold.ttf")

# ── sci-fi palette (RGB) ──
BG_TOP   = (8, 13, 28)      # deep space navy
BG_BOT   = (3, 5, 12)       # near black
CYAN     = (34, 211, 238)   # neon cyan
BLUE     = (96, 165, 250)   # electric blue
MAGENTA  = (232, 121, 249)
WHITE    = (232, 244, 255)
MUTED    = (148, 170, 196)
GRIDCOL  = (40, 70, 110)

def font(sz, kind="reg"):
    return ImageFont.truetype(
        {"reg": F_REG, "bold": F_BOLD, "mono": F_MONO, "monob": F_MONOB}[kind], sz)

def bg_layer():
    """Vertical gradient + faint grid + HUD corner brackets."""
    top = np.array(BG_TOP, np.float32); bot = np.array(BG_BOT, np.float32)
    ramp = np.linspace(0, 1, H)[:, None, None]
    img = (top * (1 - ramp) + bot * ramp).astype(np.uint8)
    img = np.repeat(img, W, axis=1)
    pil = Image.fromarray(img)
    d = ImageDraw.Draw(pil, "RGBA")
    step = 64
    for x in range(0, W, step):
        d.line([(x, 0), (x, H)], fill=(*GRIDCOL, 45), width=1)
    for y in range(0, H, step):
        d.line([(0, y), (W, y)], fill=(*GRIDCOL, 45), width=1)
    # HUD corner brackets
    m, L = 26, 46
    for (cx, cy, dx, dy) in [(m, m, 1, 1), (W - m, m, -1, 1),
                              (m, H - m, 1, -1), (W - m, H - m, -1, -1)]:
        d.line([(cx, cy), (cx + dx * L, cy)], fill=(*CYAN, 180), width=2)
        d.line([(cx, cy), (cx, cy + dy * L)], fill=(*CYAN, 180), width=2)
    return pil

def glow_text(pil, lines, fonts, colors, cy, line_gap=20, tracking=0, glow=CYAN, glow_r=10):
    """Draw centered stacked lines with a neon glow. Returns next y."""
    d = ImageDraw.Draw(pil)
    def line_w(s, fn):
        if tracking == 0:
            return d.textlength(s, font=fn)
        return sum(d.textlength(ch, font=fn) + tracking for ch in s) - tracking
    heights = [fn.getbbox(s)[3] - fn.getbbox(s)[1] for s, fn in zip(lines, fonts)]
    total = sum(heights) + line_gap * (len(lines) - 1)
    y = cy - total // 2
    # glow layer
    glow_layer = Image.new("RGBA", pil.size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    yy = y
    for s, fn, h in zip(lines, fonts, heights):
        x = (W - line_w(s, fn)) / 2
        off = fn.getbbox(s)[1]
        _draw_tracked(gd, x, yy - off, s, fn, (*glow, 220), tracking)
        yy += h + line_gap
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(glow_r))
    pil.alpha_composite(glow_layer)
    # sharp text
    d = ImageDraw.Draw(pil)
    yy = y
    for s, fn, col, h in zip(lines, fonts, colors, heights):
        x = (W - line_w(s, fn)) / 2
        off = fn.getbbox(s)[1]
        _draw_tracked(d, x, yy - off, s, fn, (*col, 255), tracking)
        yy += h + line_gap
    return y + total

def _draw_tracked(d, x, y, s, fn, fill, tracking):
    if tracking == 0:
        d.text((x, y), s, font=fn, fill=fill); return
    for ch in s:
        d.text((x, y), ch, font=fn, fill=fill)
        x += d.textlength(ch, font=fn) + tracking

def kicker(pil, text, cy, col=CYAN):
    """A small mono, wide-tracked HUD label with flanking ticks."""
    d = ImageDraw.Draw(pil)
    fn = font(22, "monob")
    w = sum(d.textlength(c, font=fn) + 6 for c in text) - 6
    x = (W - w) / 2
    d.line([(x - 60, cy), (x - 20, cy)], fill=(*col, 255), width=2)
    d.line([(x + w + 20, cy), (x + w + 60, cy)], fill=(*col, 255), width=2)
    _draw_tracked(d, x, cy - 14, text, fn, (*col, 255), 6)

def wrap(text, fn, max_w):
    tmp = ImageDraw.Draw(Image.new("RGB", (4, 4)))
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if tmp.textlength(t, font=fn) <= max_w: cur = t
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines

def to_bgr(pil):
    return cv2.cvtColor(np.array(pil.convert("RGB")), cv2.COLOR_RGB2BGR)

def equation_png():
    tex = (r"$g_{\mathrm{DFD}}(\theta)=\mathbb{E}_{x\sim p_{\mathrm{real}},\,z}"
           r"\left[\left(\nabla_x\log p_{\mathrm{fake}}(G_\theta(z,c))-"
           r"\nabla_x\log p_{\mathrm{real}}(x)\right)\nabla_\theta G_\theta(z,c)\right]$")
    fig = plt.figure(figsize=(11, 1.7), dpi=170)
    fig.patch.set_alpha(0)
    fig.text(0.5, 0.5, tex, ha="center", va="center", fontsize=20, color="#22d3ee")
    fig.canvas.draw()
    buf = np.asarray(fig.canvas.buffer_rgba()).copy()
    plt.close(fig)
    return buf  # RGBA

# ── segment helpers ──
def hold(writer, bgr, secs):
    for _ in range(int(secs * FPS)):
        writer.write(bgr)

def fade_in(writer, bgr, secs=0.5):
    n = int(secs * FPS)
    base = np.array(BG_BOT, np.float32)[::-1]  # BGR
    for i in range(n):
        a = (i + 1) / n
        writer.write((bgr.astype(np.float32) * a + base * (1 - a)).astype(np.uint8))

def title_card(writer):
    pil = bg_layer().convert("RGBA")
    kicker(pil, "FEW-STEP VIDEO DISTILLATION", 175)
    glow_text(pil, ["DATA-FORCING DISTILLATION"], [font(58, "bold")], [WHITE], 320,
              tracking=2, glow=CYAN, glow_r=14)
    glow_text(pil, wrap("Restoring Diversity and Fidelity in Few-Step Video Generation",
                        font(32), W - 320),
              [font(32)] * 2, [CYAN, CYAN], 450, glow=BLUE, glow_r=8)
    hold0 = to_bgr(pil)
    fade_in(writer, hold0); hold(writer, hold0, 3.2)

def text_card(writer, kick, body, secs=4.6, kcol=CYAN):
    pil = bg_layer().convert("RGBA")
    kicker(pil, kick, 165, kcol)
    lines = wrap(body, font(40), W - 280)
    glow_text(pil, lines, [font(40)] * len(lines), [WHITE] * len(lines),
              H // 2 + 20, line_gap=24, glow=BLUE, glow_r=7)
    bgr = to_bgr(pil); fade_in(writer, bgr); hold(writer, bgr, secs)

def equation_card(writer):
    """Show the DFD method diagram (dfd_method.png) on a light panel."""
    pil = bg_layer().convert("RGBA")
    kicker(pil, "THE DFD METHOD", 90)

    img = Image.open(os.path.join(HERE, "static/images/dfd_method.png")).convert("RGBA")
    # composite the (transparent) diagram onto white so its dark text is readable
    white = Image.new("RGBA", img.size, (255, 255, 255, 255))
    white.alpha_composite(img)
    img = white
    iw, ih = img.size
    avail_w, avail_h = W - 150, H - 230
    scale = min(avail_w / iw, avail_h / ih)
    img = img.resize((int(iw * scale), int(ih * scale)), Image.LANCZOS)
    iw, ih = img.size

    pad = 18
    px, py = (W - iw) // 2 - pad, (H - ih) // 2 - pad + 20
    pw, ph = iw + 2 * pad, ih + 2 * pad
    # cyan glow + white rounded panel
    glow = Image.new("RGBA", pil.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).rounded_rectangle([px, py, px + pw, py + ph], 14, fill=(*CYAN, 120))
    pil.alpha_composite(glow.filter(ImageFilter.GaussianBlur(14)))
    d = ImageDraw.Draw(pil, "RGBA")
    d.rounded_rectangle([px, py, px + pw, py + ph], 14, fill=(255, 255, 255, 255),
                        outline=(*CYAN, 230), width=2)
    pil.alpha_composite(img, (px + pad, py + pad))
    bgr = to_bgr(pil); fade_in(writer, bgr); hold(writer, bgr, 6.0)

def code_card(writer):
    pil = bg_layer().convert("RGBA")
    kicker(pil, "ONE LINE OF CODE", 135)
    d = ImageDraw.Draw(pil, "RGBA")
    px, py, pw, ph = 150, 235, W - 300, 220
    d.rounded_rectangle([px, py, px + pw, py + ph], 10, fill=(10, 18, 36, 235),
                        outline=(*CYAN, 150), width=1)
    d.rounded_rectangle([px, py, px + pw, py + 36], 10, fill=(16, 26, 50, 255))
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        d.ellipse([px + 16 + i * 20, py + 14, px + 24 + i * 20, py + 22], fill=(*c, 255))
    mono = font(21, "mono")
    d.text((px + 22, py + 60), "# teacher_in = gen.detach()      # original DMD",
           font=mono, fill=(120, 200, 140, 255))
    # highlighted DFD line with glow
    gl = Image.new("RGBA", pil.size, (0, 0, 0, 0)); gd = ImageDraw.Draw(gl)
    gd.text((px + 28, py + 116), "teacher_in = data.detach() if rand() < p else gen.detach()",
            font=mono, fill=(*CYAN, 255))
    pil.alpha_composite(gl.filter(ImageFilter.GaussianBlur(7)))
    d = ImageDraw.Draw(pil, "RGBA")
    d.rectangle([px + 16, py + 108, px + 20, py + 150], fill=(*CYAN, 255))
    d.text((px + 28, py + 116), "teacher_in = data.detach() if rand() < p else gen.detach()",
           font=mono, fill=(*WHITE, 255))
    glow_text(pil, ["The only change between DMD and DFD."], [font(28)], [MUTED],
              py + ph + 70, glow=BLUE, glow_r=5)
    bgr = to_bgr(pil); fade_in(writer, bgr); hold(writer, bgr, 4.6)

def section_card(writer, title):
    pil = bg_layer().convert("RGBA")
    d = ImageDraw.Draw(pil, "RGBA")
    d.line([(W//2 - 320, H//2 - 70), (W//2 + 320, H//2 - 70)], fill=(*CYAN, 120), width=1)
    d.line([(W//2 - 320, H//2 + 70), (W//2 + 320, H//2 + 70)], fill=(*CYAN, 120), width=1)
    glow_text(pil, [title.upper()], [font(50, "bold")], [WHITE], H // 2,
              tracking=3, glow=CYAN, glow_r=12)
    bgr = to_bgr(pil); fade_in(writer, bgr, 0.35); hold(writer, bgr, 1.7)

class Loop:
    def __init__(self, path):
        self.cap = cv2.VideoCapture(path)
    def frame(self):
        ok, fr = self.cap.read()
        if not ok:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ok, fr = self.cap.read()
        return fr

def grid_clip(writer, kick, paths, rows, cols, caption, secs=4.5,
              highlight=False, kcol=CYAN):
    """Show `paths` in a rows×cols grid for `secs`, with a kicker + caption."""
    side, gap = 64, 16
    top, bot = 132, 128
    region_h = H - top - bot
    panel_w = (W - 2 * side - (cols - 1) * gap) // cols
    panel_h = int(panel_w * 9 / 16)
    grid_h = rows * panel_h + (rows - 1) * gap
    y_start = top + (region_h - grid_h) // 2

    ov = bg_layer().convert("RGBA")
    kicker(ov, kick, 80, kcol)
    d = ImageDraw.Draw(ov, "RGBA")
    coords = []
    for idx in range(len(paths)):
        rr, cc = idx // cols, idx % cols
        x = side + cc * (panel_w + gap)
        y = y_start + rr * (panel_h + gap)
        coords.append((x, y))
        col = CYAN if highlight else GRIDCOL
        d.rectangle([x - 2, y - 2, x + panel_w + 2, y + panel_h + 2],
                    outline=(*col, 255), width=2 if highlight else 1)
    # caption
    cap_lines = wrap(caption, font(27), W - 240)
    glow_text(ov, cap_lines, [font(27)] * len(cap_lines),
              [MUTED] * len(cap_lines), H - 64, glow=BLUE, glow_r=5, line_gap=10)
    ov_bgr = to_bgr(ov)

    loops = [Loop(p) for p in paths]
    for _ in range(int(secs * FPS)):
        f = ov_bgr.copy()
        for (x, y), lp in zip(coords, loops):
            fr = lp.frame()
            if fr is None:
                continue
            f[y:y + panel_h, x:x + panel_w] = cv2.resize(fr, (panel_w, panel_h))
        writer.write(f)

def montage(writer, cases, secs_each=3.2):
    panel_w = (W - 4 * 18) // 3
    panel_h = int(panel_w * 9 / 16)
    y0 = (H - panel_h) // 2 + 16
    labels = ["TEACHER", "DFD (OURS)", "DMD"]
    lab_cols = [MUTED, CYAN, MUTED]
    for label, *paths in cases:
        loops = [Loop(p) for p in paths]
        # static overlay (bg + caption + borders + labels) built once
        ov = bg_layer().convert("RGBA")
        kicker(ov, label.upper(), 78)
        d = ImageDraw.Draw(ov, "RGBA")
        for i in range(3):
            x = 18 + i * (panel_w + 18)
            col = CYAN if i == 1 else GRIDCOL
            d.rectangle([x - 2, y0 - 2, x + panel_w + 2, y0 + panel_h + 2],
                        outline=(*col, 255), width=3 if i == 1 else 1)
            fn = font(24, "monob")
            tw = sum(d.textlength(c, font=fn) + 3 for c in labels[i]) - 3
            _draw_tracked(d, x + (panel_w - tw) / 2, y0 + panel_h + 16, labels[i], fn,
                          (*lab_cols[i], 255), 3)
        ov_bgr = to_bgr(ov)
        for _ in range(int(secs_each * FPS)):
            f = ov_bgr.copy()
            for i, lp in enumerate(loops):
                fr = lp.frame()
                if fr is None: continue
                fr = cv2.resize(fr, (panel_w, panel_h))
                x = 18 + i * (panel_w + 18)
                f[y0:y0 + panel_h, x:x + panel_w] = fr
            writer.write(f)

def outro(writer):
    pil = bg_layer().convert("RGBA")
    kicker(pil, "PROJECT PAGE", 250)
    glow_text(pil, ["DATA-FORCING DISTILLATION"], [font(44, "bold")], [WHITE], 340,
              tracking=2, glow=CYAN, glow_r=12)
    glow_text(pil, ["github.com/csy2077/dfd-project-page"], [font(30, "mono")], [CYAN],
              430, glow=BLUE, glow_r=8)
    bgr = to_bgr(pil); fade_in(writer, bgr); hold(writer, bgr, 3.0)

def main():
    vw = cv2.VideoWriter(OUT, cv2.VideoWriter_fourcc(*"avc1"), FPS, (W, H))
    assert vw.isOpened(), "H.264 (avc1) writer failed to open"

    DMDP = os.path.join(HERE, "..", "dmd problem")
    over = os.path.join(DMDP, "oversaturation")
    div_dmd = os.path.join(DMDP, "limited diversity/dmd2")
    div_dfd = os.path.join(DMDP, "limited diversity/dfd")
    seeds = list(range(1, 9))

    title_card(vw)

    # ── The DMD2 problem, shown with videos instead of paragraphs ──
    section_card(vw, "The Problem with DMD2")
    grid_clip(vw, "PROBLEM 1 — OVER-SATURATION",
              [f"{over}/student_step4_0004_seed4.mp4",
               f"{over}/student_step4_0060_seed2.mp4"],
              1, 2,
              "DMD2 over-saturates: colors and contrast drift far from real video.",
              secs=4.5)
    grid_clip(vw, "PROBLEM 2 — LIMITED DIVERSITY",
              [f"{div_dmd}/student_step4_0067_seed{s}.mp4" for s in seeds],
              2, 4,
              "Same prompt, 8 random seeds — DMD2 collapses to near-identical videos.",
              secs=5.0)

    # ── Our method ──
    section_card(vw, "Data-Forcing Distillation")
    equation_card(vw)
    code_card(vw)

    a = os.path.join(VID, "i2v"); r = os.path.join(VID, "ar"); t = os.path.join(VID, "t2v")
    section_card(vw, "Image-to-Video")
    montage(vw, [
        ("Cars on highway",   f"{a}/cars_highway_teacher.mp4",  f"{a}/cars_highway_dfd.mp4",  f"{a}/cars_highway_dmd.mp4"),
        ("Giraffe in field",  f"{a}/giraffe_field_teacher.mp4", f"{a}/giraffe_field_dfd.mp4", f"{a}/giraffe_field_dmd.mp4"),
        ("Couple with umbrella", f"{a}/couple_umbrella_teacher.mp4", f"{a}/couple_umbrella_dfd.mp4", f"{a}/couple_umbrella_dmd.mp4"),
    ])
    section_card(vw, "Autoregressive Video Generation")
    montage(vw, [
        ("Gundam city",     f"{r}/gundam_teacher.mp4",        f"{r}/gundam_dfd.mp4",        f"{r}/gundam_dmd.mp4"),
        ("Woman portrait",  f"{r}/woman_portrait_teacher.mp4",f"{r}/woman_portrait_dfd.mp4",f"{r}/woman_portrait_dmd.mp4"),
        ("Astronaut on moon", f"{r}/astronaut_moon_teacher.mp4", f"{r}/astronaut_moon_dfd.mp4", f"{r}/astronaut_moon_dmd.mp4"),
    ])
    section_card(vw, "Text-to-Video")
    montage(vw, [
        ("Fox in snow",     f"{t}/anim_fox_teacher.mp4",    f"{t}/anim_fox_dfd.mp4",    f"{t}/anim_fox_dmd.mp4"),
        ("Turquoise coast", f"{t}/vipe_coast_teacher.mp4",  f"{t}/vipe_coast_dfd.mp4",  f"{t}/vipe_coast_dmd.mp4"),
        ("Sea turtle",      f"{t}/vipe_turtle_teacher.mp4", f"{t}/vipe_turtle_dfd.mp4", f"{t}/vipe_turtle_dmd.mp4"),
    ])

    # ── DFD restores diversity (same prompt as the DMD2 collapse above) ──
    section_card(vw, "DFD Restores Diversity")
    grid_clip(vw, "DFD — SAME PROMPT, 8 SEEDS",
              [f"{div_dfd}/student_step4_0067_seed{s}.mp4" for s in seeds],
              2, 4,
              "With DFD, the same prompt and 8 seeds yield clearly diverse videos.",
              secs=5.5, highlight=True)

    outro(vw)
    vw.release()
    print("wrote", OUT, os.path.getsize(OUT) // 1024, "KB")

if __name__ == "__main__":
    main()
