"""Report whether a PDF is RGB colour, CMYK or greyscale.

Usage: python3 -I pipeline/pdf_colour.py BOOK.pdf

Three independent signals, because no single one is conclusive:

1. Content-stream colour operators. Inflates every Flate stream and counts the
   device colour operators: rg/RG set DeviceRGB, k/K set DeviceCMYK, g/G set
   DeviceGray. Vector text, rules and table fills are coloured this way.
   It also lists the distinct RGB values: a greyscale book written through RGB
   operators uses only values with r == g == b.
2. Embedded images, from `pdfimages -list`: colour space and component count
   (3 = RGB, 4 = CMYK, 1 = grey).
3. A 20 dpi render of every page: which pages carry visible chroma, so an "RGB"
   PDF that renders grey is caught. Also counts trailing blank pages, which print
   files carry as padding.

Stdlib plus Pillow only. Prints a human-readable block, then one RESULT line
for check_pdfs.sh.
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


RG_VALUES = re.compile(rb"(?:^|\s)" + (rb"([-+]?(?:\d+(?:\.\d*)?|\.\d+))\s+") * 3 + rb"(?:rg|RG)" + _END)


def rgb_values(pdf: Path) -> Counter:
    """Distinct DeviceRGB colours set in the content streams. A greyscale book
    written through RGB operators shows only values with r == g == b."""
    values: Counter = Counter()
    for m in STREAM.finditer(pdf.read_bytes()):
        try:
            body = zlib.decompress(m.group(1))
        except zlib.error:
            continue
        for t in RG_VALUES.finditer(body):
            values[tuple(round(float(x) * 255) for x in t.groups())] += 1
    return values


def scan_pages(pdf: Path) -> list[tuple[int, bool]]:
    """Every page at 20 dpi in one pass: (peak chroma, blank) per page."""
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["pdftoppm", "-r", "20", "-png", str(pdf), f"{tmp}/p"], check=True, capture_output=True)
        out = []
        for f in sorted(Path(tmp).glob("p-*.png"), key=lambda p: int(p.stem.split("-")[1])):
            px = Image.open(f).convert("RGB").get_flattened_data()
            out.append((max(max(p) - min(p) for p in px), all(min(p) == 255 for p in px)))
    return out


def main() -> None:
    pdf = Path(sys.argv[1])
    ops, names = stream_signals(pdf)
    images = image_signals(pdf)
    values = rgb_values(pdf)
    chromatic = [v for v in values if max(v) - min(v) > 6]
    print(
        f"  colour operators: rgb {ops['rgb']} ({len(values)} distinct values, {len(chromatic)} chromatic),"
        f" cmyk {ops['cmyk']}, gray {ops['gray']}"
    )
    print(f"  colour space names: " + ", ".join(f"{k} {v}" for k, v in names.items()))
    print(f"  embedded images: {dict(images) or 'none'}")

    pages = scan_pages(pdf)
    coloured = [i + 1 for i, (peak, _) in enumerate(pages) if peak > 40]
    trailing_blank = 0
    for _, blank in reversed(pages):
        if not blank:
            break
        trailing_blank += 1
    shown = ", ".join(f"p{p}" for p in coloured[:12]) + (" ..." if len(coloured) > 12 else "")
    print(f"  render: {len(pages)} pages scanned; {len(coloured)} carry colour{f' ({shown})' if coloured else ''}")
    if trailing_blank:
        print(f"  trailing blank pages: {trailing_blank} (print padding; content is {len(pages) - trailing_blank} pages)")

    cmyk = ops["cmyk"] > 0 or names["DeviceCMYK"] > 0 or any(k.endswith("4comp") for k in images)
    if cmyk:
        verdict = "cmyk"
        note = "CMYK content present: renders will shift colour; ask for an RGB export"
    elif coloured:
        verdict = "rgb-colour"
        note = "RGB colour"
    else:
        verdict = "greyscale"
        note = "greyscale throughout: no page renders with colour"
    print(f"  verdict: {note}")
    # Machine-readable summary for check_pdfs.sh.
    print(f"RESULT pages={len(pages)} content={len(pages) - trailing_blank} colour_pages={len(coloured)} verdict={verdict}")


if __name__ == "__main__":
    main()
