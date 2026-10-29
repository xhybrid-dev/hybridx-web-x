"""Report whether a PDF is RGB colour, CMYK or greyscale.

Usage: python3 -I pipeline/pdf_colour.py BOOK.pdf [PAGE ...]

Three independent signals, because no single one is conclusive:

1. Content-stream colour operators. Inflates every Flate stream and counts the
   device colour operators: rg/RG set DeviceRGB, k/K set DeviceCMYK, g/G set
   DeviceGray. Vector text, rules and table fills are coloured this way.
2. Embedded images, from `pdfimages -list`: colour space and component count
   (3 = RGB, 4 = CMYK, 1 = grey).
3. A low-resolution render of the sample pages: how much of the page carries
   visible chroma, so a "colour" PDF that renders grey is caught.

Stdlib plus Pillow only. Prints one human-readable block per PDF.
"""

import re
import subprocess
import sys
import tempfile
import zlib
from collections import Counter
from pathlib import Path

from PIL import Image

STREAM = re.compile(rb"stream\r?\n(.*?)\r?\nendstream", re.S)
# A device colour operator only counts with its numeric operands in front of it
# (3 for rg, 4 for k, 1 for g); a bare letter is usually part of something else.
_NUM = rb"[-+]?(?:\d+(?:\.\d*)?|\.\d+)\s+"
_END = rb"(?=[\s/\[(<]|$)"
OPS = {
    "rgb": re.compile(rb"(?:^|\s)" + _NUM * 3 + rb"(?:rg|RG)" + _END),
    "cmyk": re.compile(rb"(?:^|\s)" + _NUM * 4 + rb"(?:k|K)" + _END),
    "gray": re.compile(rb"(?:^|\s)" + _NUM + rb"(?:g|G)" + _END),
}
NAMES = {
    "DeviceCMYK": re.compile(rb"/DeviceCMYK"),
    "DeviceRGB": re.compile(rb"/DeviceRGB"),
    "OutputIntent": re.compile(rb"/OutputIntents?"),
}


def stream_signals(pdf: Path) -> tuple[Counter, Counter]:
    data = pdf.read_bytes()
    ops: Counter = Counter()
    names: Counter = Counter()
    for chunk in [data, *(m.group(1) for m in STREAM.finditer(data))]:
        body = chunk
        if chunk is not data:
            try:
                body = zlib.decompress(chunk)
            except zlib.error:
                continue  # images and fonts with other filters; not content streams
        for key, rx in NAMES.items():
            names[key] += len(rx.findall(body))
        if chunk is not data:
            for key, rx in OPS.items():
                ops[key] += len(rx.findall(body))
    return ops, names


def image_signals(pdf: Path) -> Counter:
    out = subprocess.run(["pdfimages", "-list", str(pdf)], capture_output=True, text=True, check=True).stdout
    kinds: Counter = Counter()
    for line in out.splitlines()[2:]:
        cols = line.split()
        if len(cols) > 6 and cols[2] == "image":
            kinds[f"{cols[5]}/{cols[6]}comp"] += 1
    return kinds


def render_chroma(pdf: Path, page: int) -> tuple[float, int]:
    """Share of pixels with visible chroma, and the strongest chroma, at 50 dpi."""
    with tempfile.TemporaryDirectory() as tmp:
        stem = Path(tmp) / "p"
        subprocess.run(
            ["pdftoppm", "-r", "50", "-f", str(page), "-l", str(page), "-png", "-singlefile", str(pdf), str(stem)],
            check=True,
            capture_output=True,
        )
        im = Image.open(f"{stem}.png").convert("RGB")
        px = list(im.get_flattened_data() if hasattr(im, "get_flattened_data") else im.getdata())
    chroma = [max(p) - min(p) for p in px]
    return sum(c > 40 for c in chroma) / len(chroma), max(chroma)


def main() -> None:
    pdf = Path(sys.argv[1])
    info = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, check=True).stdout
    count = int(re.search(r"^Pages:\s+(\d+)", info, re.M).group(1))
    pages = [p for p in (int(a) for a in sys.argv[2:]) if 1 <= p <= count] or [1]
    ops, names = stream_signals(pdf)
    images = image_signals(pdf)
    print(f"  colour operators: rgb {ops['rgb']}, cmyk {ops['cmyk']}, gray {ops['gray']}")
    print(f"  colour space names: " + ", ".join(f"{k} {v}" for k, v in names.items()))
    print(f"  embedded images: {dict(images) or 'none'}")
    any_colour = False
    for page in pages:
        share, peak = render_chroma(pdf, page)
        any_colour |= peak > 40
        print(f"  render p{page}: {share:.1%} of pixels in colour, peak chroma {peak}")
    cmyk = ops["cmyk"] > 0 or names["DeviceCMYK"] > 0 or any(k.endswith("4comp") for k in images)
    if cmyk:
        verdict = "CMYK content present: renders will shift colour; ask for an RGB export"
    elif any_colour:
        verdict = "RGB colour"
    else:
        verdict = "no colour on the sampled pages: greyscale, or sample other pages"
    print(f"  verdict: {verdict}")


if __name__ == "__main__":
    main()
