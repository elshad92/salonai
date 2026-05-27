"""Generate OG image for SalonAI (1200x630)."""
from PIL import Image, ImageDraw, ImageFont
import math, os

W, H = 1200, 630
out = os.path.join(os.path.dirname(__file__), "..", "public", "og-image.png")

img = Image.new("RGB", (W, H))
draw = ImageDraw.Draw(img)

# Background gradient: #0f172a → #1e293b (left-to-right)
for x in range(W):
    t = x / W
    r = int(0x0f + (0x1e - 0x0f) * t)
    g = int(0x17 + (0x29 - 0x17) * t)
    b = int(0x2a + (0x3b - 0x2a) * t)
    draw.line([(x, 0), (x, H)], fill=(r, g, b))

# Subtle decorative circles (bottom-right glow)
for i, (cx, cy, radius, alpha) in enumerate([
    (1050, 530, 280, 18),
    (950, 450, 180, 12),
    (1100, 300, 120, 8),
]):
    overlay = Image.new("RGB", (W, H), (0, 0, 0))
    o_draw = ImageDraw.Draw(overlay)
    o_draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
                   fill=(212, 168, 83))
    img = Image.blend(img, overlay, alpha / 255)
    draw = ImageDraw.Draw(img)

# Re-draw gradient on top of circles to keep bg look (skip — blending already subtle)

# Gold accent line at top
draw.rectangle([0, 0, W, 4], fill=(212, 168, 83))
# Gold accent line at bottom
draw.rectangle([0, H - 4, W, H], fill=(212, 168, 83))

# Vertical accent bar (left)
draw.rectangle([60, 40, 64, H - 40], fill=(212, 168, 83, 80))

# Try to load a font, fall back to default
def load_font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    bold_candidates = [
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for path in (bold_candidates if bold else candidates):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()

# ── LOGO / BRAND ──
font_logo = load_font(110, bold=True)
font_sub  = load_font(36)
font_tag  = load_font(26)

GOLD  = (212, 168, 83)
WHITE = (255, 255, 255)
GRAY  = (148, 163, 184)

# "SalonAI" — "Salon" white, "AI" gold
salon_text = "Salon"
ai_text    = "AI"

# Measure widths
salon_bbox = draw.textbbox((0, 0), salon_text, font=font_logo)
ai_bbox    = draw.textbbox((0, 0), ai_text,    font=font_logo)
total_w    = (salon_bbox[2] - salon_bbox[0]) + (ai_bbox[2] - ai_bbox[0])
start_x    = (W - total_w) // 2
y_logo     = 160

draw.text((start_x, y_logo), salon_text, font=font_logo, fill=WHITE)
draw.text((start_x + salon_bbox[2] - salon_bbox[0], y_logo), ai_text, font=font_logo, fill=GOLD)

# Subtitle
sub = "AI-Powered Salon Management"
sub_bbox = draw.textbbox((0, 0), sub, font=font_sub)
sub_x = (W - (sub_bbox[2] - sub_bbox[0])) // 2
draw.text((sub_x, y_logo + 130), sub, font=font_sub, fill=GRAY)

# Tagline
tag = "✨  Free Forever  •  Zero Commissions  •  WhatsApp AI  ✨"
tag_bbox = draw.textbbox((0, 0), tag, font=font_tag)
tag_x = (W - (tag_bbox[2] - tag_bbox[0])) // 2
draw.text((tag_x, y_logo + 185), tag, font=font_tag, fill=GOLD)

# Bottom URL
url_font = load_font(24)
url = "salonai-app.netlify.app"
url_bbox = draw.textbbox((0, 0), url, font=url_font)
draw.text(((W - (url_bbox[2] - url_bbox[0])) // 2, H - 60), url, font=url_font, fill=GRAY)

img.save(out, "PNG")
print(f"Saved: {os.path.abspath(out)}  ({W}x{H})")
