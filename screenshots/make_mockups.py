"""
Generate Play Store screenshots for BizTrack.

Phone  (portrait):  1080 × 1920  — each screen individually
7" tab (portrait):  1200 × 1920  — single screen centered on tablet bg
10" tab(landscape): 1920 × 1080  — two screens side by side on tablet bg
"""

from PIL import Image, ImageDraw, ImageFont
import os, sys

BASE = os.path.dirname(__file__)

# ── Raw screenshots ──────────────────────────────────────────────────────────
SCREENS = {
    "lavori":   "main_jobs.png",
    "spese":    "screen_spese.png",
    "report":   "screen_report.png",
    "scadenze": "screen_scadenze.png",
    "profilo":  "screen_profilo.png",
}

# ── Labels displayed below each phone screenshot (for marketing frames) ───────
LABELS = {
    "lavori":   "Calendario Lavori",
    "spese":    "Spese & Finanze",
    "report":   "Report Completi",
    "scadenze": "Scadenze & Avvisi",
    "profilo":  "Il Tuo Profilo",
}

# ── Color palette ─────────────────────────────────────────────────────────────
BG_DARK   = (15, 23, 42)       # slate-900
ACCENT    = (180, 83, 9)       # orange-700
ACCENT2   = (217, 119, 6)      # orange-500
BLUE      = (59, 130, 246)     # blue-500
WHITE     = (255, 255, 255)
GRAY      = (148, 163, 184)    # slate-400

# ── Helpers ───────────────────────────────────────────────────────────────────

def open_screen(name):
    path = os.path.join(BASE, SCREENS[name])
    return Image.open(path).convert("RGB")


def rounded_rect_mask(size, radius):
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, size[0]-1, size[1]-1], radius=radius, fill=255)
    return mask


def add_phone_frame(screen_img, frame_w, frame_h):
    """Paste a screenshot into a phone-shaped frame on a transparent canvas."""
    # Screen takes up inner area with some padding
    border = 18
    corner = 36
    canvas = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    # Outer body
    draw.rounded_rectangle([0, 0, frame_w-1, frame_h-1],
                            radius=corner, fill=(30, 41, 59, 255), outline=(51, 65, 85, 255), width=2)
    # Inner screen area
    sx, sy = border, border*2
    sw, sh = frame_w - border*2, frame_h - border*4
    screen_resized = screen_img.resize((sw, sh), Image.LANCZOS)
    mask = rounded_rect_mask((sw, sh), 12)
    canvas.paste(screen_resized, (sx, sy), mask)

    # Home-indicator bar
    bar_w, bar_h = int(frame_w * 0.35), 4
    bx = (frame_w - bar_w) // 2
    by = frame_h - border + 4
    draw.rounded_rectangle([bx, by, bx+bar_w, by+bar_h], radius=2, fill=(71, 85, 105, 200))

    return canvas


def gradient_bg(w, h, color1, color2, vertical=True):
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    for i in range(h if vertical else w):
        r = i / (h-1 if vertical else w-1)
        c = tuple(int(color1[j] + (color2[j]-color1[j]) * r) for j in range(3))
        if vertical:
            draw.line([(0, i), (w, i)], fill=c)
        else:
            draw.line([(i, 0), (i, h)], fill=c)
    return img


def try_font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/SFNSDisplay.ttf",
        "/System/Library/Fonts/SFNS.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except:
            pass
    return ImageFont.load_default()


def draw_centered_text(draw, text, y, w, font, color):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((w - tw) // 2, y), text, font=font, fill=color)


# ── 1. Phone screenshots (1080 × 1920, cropped from native 1080×2220) ────────
PHONE_W, PHONE_H = 1080, 1920

def make_phone(name):
    screen = open_screen(name)
    # Crop top-center to 1080×1920
    crop_top = (screen.height - PHONE_H) // 2
    screen = screen.crop((0, crop_top, PHONE_W, crop_top + PHONE_H))

    # Background
    bg = gradient_bg(PHONE_W, PHONE_H, (20, 30, 50), (10, 18, 35))

    # Slightly smaller screenshot with rounded corners
    pad = 40
    sw, sh = PHONE_W - pad*2, PHONE_H - pad*2
    screen_resized = screen.resize((sw, sh), Image.LANCZOS)
    mask = rounded_rect_mask((sw, sh), 28)
    bg.paste(screen_resized, (pad, pad), mask)

    # Subtle shadow (done by darkening border pixels – skip for simplicity)
    out = os.path.join(BASE, f"phone_{name}.png")
    bg.save(out)
    print(f"  Saved {out}")


# ── 2. 7" tablet portrait (1200 × 1920) ──────────────────────────────────────
TAB7_W, TAB7_H = 1200, 1920

def make_tab7(name):
    screen = open_screen(name)
    bg = gradient_bg(TAB7_W, TAB7_H, (15, 25, 45), (8, 15, 30))
    draw = ImageDraw.Draw(bg)

    # BizTrack logo text top
    font_big  = try_font(56, bold=True)
    font_sub  = try_font(30)
    draw_centered_text(draw, "BizTrack", 60, TAB7_W, font_big, WHITE)
    draw_centered_text(draw, "Gestisci il tuo lavoro, ovunque.", 130, TAB7_W, font_sub, GRAY)

    # Phone-shaped frame in center
    fw = int(TAB7_W * 0.55)
    fh = int(fw * (2220 / 1080))
    # Cap height
    if fh > TAB7_H - 240:
        fh = TAB7_H - 240
        fw = int(fh * (1080 / 2220))

    frame_top = 195
    fx = (TAB7_W - fw) // 2

    screen_inner = screen.resize((fw, fh), Image.LANCZOS)
    mask = rounded_rect_mask((fw, fh), 32)
    bg.paste(screen_inner, (fx, frame_top), mask)

    # Label at bottom
    label_y = frame_top + fh + 22
    font_label = try_font(36, bold=True)
    draw_centered_text(draw, LABELS[name], label_y, TAB7_W, font_label, WHITE)

    out = os.path.join(BASE, f"tab7_{name}.png")
    bg.save(out)
    print(f"  Saved {out}")


# ── 3. 10" tablet landscape (1920 × 1080) ────────────────────────────────────
# Show two complementary screens side by side
TAB10_W, TAB10_H = 1920, 1080

PAIRS = [
    ("lavori",  "report"),
    ("spese",   "scadenze"),
]

def make_tab10(name_left, name_right):
    bg = gradient_bg(TAB10_W, TAB10_H, (12, 22, 40), (6, 14, 28))
    draw = ImageDraw.Draw(bg)

    # Title
    font_title = try_font(52, bold=True)
    font_sub   = try_font(28)
    draw_centered_text(draw, "BizTrack", 30, TAB10_W, font_title, WHITE)
    draw_centered_text(draw, "Freelance Work Manager", 96, TAB10_W, font_sub, GRAY)

    # Two phone frames side by side
    fw = int(TAB10_H * 0.55)
    fh = int(fw * (2220 / 1080))
    if fh > TAB10_H - 170:
        fh = TAB10_H - 170
        fw = int(fh * (1080 / 2220))

    frame_top = 148
    gap = (TAB10_W - fw * 2) // 3

    for i, name in enumerate([name_left, name_right]):
        screen = open_screen(name)
        screen_r = screen.resize((fw, fh), Image.LANCZOS)
        mask = rounded_rect_mask((fw, fh), 28)
        fx = gap + i * (fw + gap)
        bg.paste(screen_r, (fx, frame_top), mask)

        font_lbl = try_font(30, bold=True)
        lx = fx + fw // 2
        label_y = frame_top + fh + 14
        bbox = draw.textbbox((0, 0), LABELS[name], font=font_lbl)
        tw = bbox[2] - bbox[0]
        draw.text((lx - tw//2, label_y), LABELS[name], font=font_lbl, fill=WHITE)

    pair_tag = f"{name_left}_{name_right}"
    out = os.path.join(BASE, f"tab10_{pair_tag}.png")
    bg.save(out)
    print(f"  Saved {out}")


# ── Run ───────────────────────────────────────────────────────────────────────
print("Generating phone screenshots...")
for name in SCREENS:
    make_phone(name)

print("\nGenerating 7\" tablet screenshots...")
for name in SCREENS:
    make_tab7(name)

print("\nGenerating 10\" tablet screenshots (landscape)...")
for (a, b) in PAIRS:
    make_tab10(a, b)

print("\nDone.")
