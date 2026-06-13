#!/usr/bin/env python3
"""Render a silent, captioned overview video for the DFD project page.

Pure OpenCV + matplotlib (no ffmpeg). Structure:
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
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1280, 720, 24
HERE = os.path.dirname(os.path.abspath(__file__))
VID  = os.path.join(HERE, "static/videos")
OUT  = os.path.join(VID, "overview.mp4")

MPL = os.path.join(os.path.dirname(matplotlib.__file__), "mpl-data/fonts/ttf")
F_REG  = os.path.join(MPL, "DejaVuSans.ttf")
F_BOLD = os.path.join(MPL, "DejaVuSans-Bold.ttf")

# palette (matches the site)
BG      = (250, 248, 245)   # near-white, BGR
FG      = (40, 30, 20)
MUTED   = (110, 100, 92)
ACCENT  = (235, 99, 37)      # blue (BGR of #2563eb)
RED     = (38, 38, 220)      # accent red (BGR of #dc2626)

def font(sz, bold=False):
    return ImageFont.truetype(F_BOLD if bold else F_REG, sz)

def blank(color=BG):
    return np.full((H, W, 3), color, np.uint8)

def draw_text(img, lines, fonts, colors, cy, align="center", line_gap=18, x=None):
    """Draw a stack of text lines centered vertically around cy. Returns next y."""
    pil = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    d = ImageDraw.Draw(pil)
    heights = []
    for ln, fn in zip(lines, fonts):
        bb = d.textbbox((0, 0), ln, font=fn)
        heights.append(bb[3] - bb[1])
    total = sum(heights) + line_gap * (len(lines) - 1)
    y = cy - total // 2
    for ln, fn, col in zip(lines, fonts, colors):
        bb = d.textbbox((0, 0), ln, font=fn)
        w = bb[2] - bb[0]
        if align == "center":
            tx = (W - w) // 2
        elif align == "left":
            tx = x if x is not None else 80
        else:
            tx = W - w - (x or 80)
        d.text((tx, y - bb[1]), ln, font=fn, fill=(col[2], col[1], col[0]))
        y += (bb[3] - bb[1]) + line_gap
    out = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
    img[:, :, :] = out
    return y

def wrap(text, fn, max_w):
    pil = Image.new("RGB", (10, 10)); d = ImageDraw.Draw(pil)
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=fn) <= max_w:
            cur = t
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines

def equation_png():
    """Render the simplified DFD gradient via matplotlib mathtext -> BGR array."""
    tex = (r"$g_{\mathrm{DFD}}(\theta)=\mathbb{E}_{x\sim p_{\mathrm{real}},\,z}"
           r"\left[\left(\nabla_x\log p_{\mathrm{fake}}(G_\theta(z,c))-"
           r"\nabla_x\log p_{\mathrm{real}}(x)\right)\nabla_\theta G_\theta(z,c)\right]$")
    fig = plt.figure(figsize=(11, 1.7), dpi=160)
    fig.patch.set_alpha(0)
    fig.text(0.5, 0.5, tex, ha="center", va="center", fontsize=20, color="#0f172a")
    fig.canvas.draw()
    buf = np.asarray(fig.canvas.buffer_rgba())
    plt.close(fig)
    rgb = cv2.cvtColor(buf, cv2.COLOR_RGBA2BGR)
    # composite onto BG
    a = buf[:, :, 3:4] / 255.0
    rgb = (rgb * a + np.array(BG) * (1 - a)).astype(np.uint8)
    return rgb

# ---------- segment builders ----------
def hold(writer, frame, secs):
    for _ in range(int(secs * FPS)):
        writer.write(frame)

def fade_in(writer, frame, secs=0.4):
    n = int(secs * FPS)
    for i in range(n):
        a = (i + 1) / n
        writer.write((frame.astype(np.float32) * a + np.array(BG) * (1 - a)).astype(np.uint8))

def title_card(writer):
    f = blank()
    cv2.rectangle(f, (0, 0), (W, 8), ACCENT, -1)
    y = draw_text(f, ["DFD"], [font(120, True)], [RED], 250)
    draw_text(f, ["Data-Forcing Distillation"], [font(58, True)], [FG], 360)
    sub = "One line to Restore Diversity and Fidelity in Few-Step Video Generation"
    draw_text(f, wrap(sub, font(34), W - 240), [font(34)] * 3, [MUTED] * 3, 480)
    fade_in(writer, f); hold(writer, f, 3.2)

def text_card(writer, kicker, body, secs=4.5, accent=ACCENT):
    f = blank()
    draw_text(f, [kicker], [font(30, True)], [accent], 150)
    lines = wrap(body, font(42), W - 240)
    fonts = [font(42)] * len(lines)
    draw_text(f, lines, fonts, [FG] * len(lines), H // 2 + 20, line_gap=22)
    fade_in(writer, f); hold(writer, f, secs)

def equation_card(writer):
    f = blank()
    draw_text(f, ["The DFD gradient"], [font(34, True)], [ACCENT], 150)
    eq = equation_png()
    eh, ew = eq.shape[:2]
    scale = min((W - 160) / ew, 1.0)
    eq = cv2.resize(eq, (int(ew * scale), int(eh * scale)))
    eh, ew = eq.shape[:2]
    y0 = (H - eh) // 2
    f[y0:y0 + eh, (W - ew) // 2:(W - ew) // 2 + ew] = eq
    cap = "Evaluate the teacher score at a REAL sample x instead of the student's output."
    draw_text(f, wrap(cap, font(30), W - 240), [font(30)] * 2, [MUTED] * 2, H - 110)
    fade_in(writer, f); hold(writer, f, 5.0)

def code_card(writer):
    f = blank()
    draw_text(f, ["One line of code"], [font(34, True)], [ACCENT], 130)
    # window panel
    px, py, pw, ph = 150, 230, W - 300, 230
    cv2.rectangle(f, (px, py), (px + pw, py + ph), (245, 244, 243), -1)
    cv2.rectangle(f, (px, py), (px + pw, py + ph), (210, 205, 200), 1)
    cv2.rectangle(f, (px, py), (px + pw, py + 38), (236, 234, 232), -1)
    for i, col in enumerate([(86, 95, 255), (46, 189, 255), (63, 201, 39)]):
        cv2.circle(f, (px + 22 + i * 22, py + 19), 7, col, -1)
    pil = Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGR2RGB)); d = ImageDraw.Draw(pil)
    mono = font(22)
    d.text((px + 24, py + 62), "# teacher_in = gen.detach()      # original DMD",
           font=mono, fill=(22, 163, 74))
    # highlighted line
    d.rectangle([px + 16, py + 110, px + pw - 16, py + 150], fill=(232, 240, 253))
    d.rectangle([px + 16, py + 110, px + 19, py + 150], fill=(37, 99, 235))
    d.text((px + 28, py + 118),
           "teacher_in = data.detach() if rand() < p else gen.detach()",
           font=mono, fill=(15, 23, 42))
    f[:, :, :] = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
    draw_text(f, ["The only change between DMD and DFD."],
              [font(30)], [MUTED], py + ph + 70)
    fade_in(writer, f); hold(writer, f, 4.5)

def section_card(writer, title):
    f = blank()
    cv2.rectangle(f, (0, H // 2 - 90), (W, H // 2 + 90), (243, 241, 238), -1)
    draw_text(f, [title], [font(64, True)], [FG], H // 2)
    fade_in(writer, f, 0.3); hold(writer, f, 1.6)

class Loop:
    def __init__(self, path):
        self.cap = cv2.VideoCapture(path)
    def frame(self):
        ok, fr = self.cap.read()
        if not ok:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ok, fr = self.cap.read()
        return fr

def montage(writer, cases, secs_each=3.2):
    """cases: list of (label, teacher_path, dfd_path, dmd_path)."""
    panel_w = (W - 4 * 16) // 3
    panel_h = int(panel_w * 9 / 16)
    y0 = (H - panel_h) // 2 + 10
    labels = ["Teacher", "DFD (Ours)", "DMD"]
    label_cols = [MUTED, ACCENT, MUTED]
    for label, *paths in cases:
        loops = [Loop(p) for p in paths]
        for _ in range(int(secs_each * FPS)):
            f = blank()
            # top caption
            draw_text(f, wrap(label, font(30, True), W - 160)[:1], [font(30, True)],
                      [FG], 70)
            for i, lp in enumerate(loops):
                fr = lp.frame()
                if fr is None:
                    continue
                fr = cv2.resize(fr, (panel_w, panel_h))
                x = 16 + i * (panel_w + 16)
                f[y0:y0 + panel_h, x:x + panel_w] = fr
                cv2.rectangle(f, (x, y0), (x + panel_w, y0 + panel_h),
                              ACCENT if i == 1 else (210, 205, 200),
                              3 if i == 1 else 1)
            # method labels under each panel
            pil = Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGR2RGB)); d = ImageDraw.Draw(pil)
            fn = font(26, True)
            for i, (lab, col) in enumerate(zip(labels, label_cols)):
                x = 16 + i * (panel_w + 16)
                tw = d.textlength(lab, font=fn)
                d.text((x + (panel_w - tw) / 2, y0 + panel_h + 14), lab,
                       font=fn, fill=(col[2], col[1], col[0]))
            f[:, :, :] = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
            writer.write(f)

def outro(writer):
    f = blank()
    draw_text(f, ["Data-Forcing Distillation"], [font(52, True)], [FG], 280)
    draw_text(f, ["github.com/csy2077/dfd-project-page"], [font(34)], [ACCENT], 380)
    fade_in(writer, f); hold(writer, f, 3.0)

def main():
    vw = cv2.VideoWriter(OUT, cv2.VideoWriter_fourcc(*"mp4v"), FPS, (W, H))
    assert vw.isOpened()

    title_card(vw)
    text_card(vw, "THE PROBLEM",
              "Distilling video diffusion with DMD collapses sample diversity and "
              "over-saturates outputs — a side effect of the mode-seeking reverse-KL objective.")
    text_card(vw, "OUR IDEA",
              "DFD adds a teacher score discrepancy: it pulls the student toward modes it "
              "missed and away from over-saturated outputs absent in real data.")
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
    outro(vw)

    vw.release()
    print("wrote", OUT, os.path.getsize(OUT) // 1024, "KB")

if __name__ == "__main__":
    main()
