"""Redraw the route on X Trail's map screen and the profile on its elevation
screen (public/una/screens/trail/) so they look like a real trail rather than
the simulator's test loop. Everything else on each screen is the app's own
pixels, kept as they are; the new lines use the watch's own two colours."""
import sys, random
import numpy as np
from PIL import Image, ImageDraw

SRC, OUT = sys.argv[1], sys.argv[2]
CORE, HALO = (255, 85, 255), (85, 0, 85)
K = 4  # supersample

def spline(pts, n=24):
    out = []
    p = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for t in np.linspace(0, 1, n, endpoint=False):
            out.append(tuple(0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t
                                    + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t ** 3) for k in (0, 1)))
    out.append(pts[-1])
    return out

def stroke(size, line, dots=()):
    big = Image.new('RGBA', (size * K, size * K), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    for colour, w in ((HALO, 13), (CORE, 7)):
        q = [(x * K, y * K) for x, y in line]
        d.line(q, fill=colour + (255,), width=w * K, joint='curve')
        for x, y in (q[0], q[-1]):
            d.ellipse([x - w * K / 2, y - w * K / 2, x + w * K / 2, y + w * K / 2], fill=colour + (255,))
    for (x, y, r, colour) in dots:
        d.ellipse([(x - r) * K, (y - r) * K, (x + r) * K, (y + r) * K], fill=colour + (255,))
    return big.resize((size, size), Image.LANCZOS)

def rebuild(name, box, line, dots, keep):
    im = Image.open(f'{SRC}/{name}.png').convert('RGB')
    a = np.array(im)
    x0, y0, x1, y1 = box
    region = a[y0:y1, x0:x1]
    r, g, b = (region[..., i].astype(int) for i in range(3))
    drop = ~keep(r, g, b)
    region[drop] = 0
    base = Image.fromarray(a).convert('RGBA')
    layer = stroke(im.size[0], line, dots)
    # only inside the round display
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).ellipse([6, 6, im.size[0] - 6, im.size[1] - 6], fill=255)
    layer.putalpha(Image.composite(layer.getchannel('A'), Image.new('L', im.size, 0), mask))
    # the app's own text and marks stay on top of the line
    ui = np.array(base)
    ui_mask = (ui[..., :3].sum(axis=2) > 60)
    out = Image.alpha_composite(base, layer)
    o = np.array(out)
    o[ui_mask] = ui[ui_mask]
    Image.fromarray(o).convert('RGB').save(f'{OUT}/{name}.png', optimize=True)

random.seed(7)

# Map: a trail that wanders, from the start marker down past the runner.
trail = spline([(353, 190), (334, 218), (351, 252), (338, 281), (311, 296), (322, 331), (346, 352),
                (352, 383), (333, 404), (344, 432), (366, 446), (356, 492)])
rebuild("map", (322, 172, 376, 466), trail, [(353, 190, 12, (170, 255, 0))],
        keep=lambda r, g, b: (r < 0))  # nothing in the old route's box is kept

# Elevation: a long stepped climb to the top, a col, and a short drop to now.
prof = [(0, .08), (.07, .13), (.13, .30), (.19, .34), (.25, .52), (.31, .49), (.37, .61), (.44, .72),
        (.50, .68), (.57, .88), (.63, 1.0), (.69, .93), (.75, .82), (.82, .86), (.89, .93), (.95, .87), (1, .84)]
X0, X1, YT, YB = 52, 424, 112, 268
pts = spline([(X0 + f * (X1 - X0), YB - h * (YB - YT)) for f, h in prof], n=14)
pts = [(x, y + random.uniform(-1.6, 1.6)) for x, y in pts]
end = pts[-1]
rebuild('elevation', (40, 96, 440, 284), pts, [(end[0], end[1], 9, (255, 255, 255))],
        keep=lambda r, g, b: (r > 100) & (g > 100) & (b > 100) & (np.indices(r.shape)[1] < 150) & (np.indices(r.shape)[0] < 40))
