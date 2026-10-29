# Edit log: HYROX or ATHX?

Decisions, component names and open questions, newest gate first. The brief is
`VIDEO-BRIEF-HYROX-ATHX.md`, the scope is `VIDEO-PRODUCTION-SCOPE.md`, and
`PRODUCTION-PLAN.md` holds the agreed fixes and the recording script.

## Working commands

```bash
pipeline/bootstrap.sh          # fresh container: restore tools, deps, fonts; 1 s smoke render
pipeline/bootstrap.sh --check  # report only
npm run check                  # typecheck, facts and timings checks, VO fit report
pipeline/check_pdfs.sh         # page counts and RGB check of assets/pdf
npm run studio                 # Remotion Studio (needs a port forward to view)
npm run render:test            # the Gate 0 one-second render
npm run still:test:portrait    # the same card at 1080 x 1920
```

## Gate status

| Gate | State |
|---|---|
| 0. Setup | **Delivered 2026-10-29, awaiting review** (open: Q4, Q5, Q6, Q8, Q9) |
| 1. Assets | Blocked on the book interiors (Q8); logo and covers received |

---

## Gate 0 addendum 2: brand, covers and the cut-down (2026-10-29)

**Brand yellow: `#FBD85B`** (Jon: "typically the yellow used"). Set in
`tokens.ts` as `colour.accent`. The website's CSS uses `#FADB5C`, at most 3 levels
per channel away and indistinguishable on screen, so nothing on the site needs to
change for the two to match.

**White logo.** `assets/brand/hybridx-logo-full-white.png`: the full lock-up, 1400 x
785, `#ECECEC` on transparent. That is the same geometry as the site's black
`Full Logo (2).png`, so it is the reversed official file. It is used unmodified on
the end cards. PNG only; at 1400 px wide it covers any end-card size at 1080p.

**Covers.** `ATHX-2027-Mens-COVER-white.pdf` and `ATHX-2027-Womens-COVER-white.pdf`
are full print wraps (back, spine, front on one page), not front-only files. They
replace the brief's `*-FRONT.pdf` in `check_pdfs.sh` and `bootstrap.sh`.
- Black plate, white type, edition accents exactly `#EA580C` and `#7C3AED`, the
  `mens` and `womens` tokens. RGB, vector, no images.
- The front cover is the right-hand 513 pt panel. Gate 1 crops its trim box
  (inside the 9 pt bleed) for `CoverPair`. The back and spine are not used.
- The spines match KDP's white-paper calliper (0.002252 in per page): men's 0.356 in
  for 158 pages, women's 0.365 in for 162, so the women's cover was built for the
  162-page print file including its blank page.

**9:16 cut-down in scope** (Jon: "longer form landscape video and short portrait
video"). Both deliverables in scope 9 are now planned:
- `sceneTimings.ts` now holds two plans, `main` and `reel`, with one conform engine.
  `reel` is brief Part 4, seven beats from 0:00 to 1:02, target 0:55 to 1:05.
  Compositions read `timelines.main` and `timelines.reel`. Main-video numbers are
  unchanged.
- `npm run check` checks both. Reel: 79 words, 0:31 of speech at 150 wpm. r1 and
  r2 are about a second short once padded; r4 and r5 carry 6 s of graphic time each
  that a VO-led cut would close (projected 0:51). As with the main video, Gate 2's
  measured build lengths set the floors.
- The reel's VO lines are its own, not lifted from the main script, and are not in
  PRODUCTION-PLAN.md's recording script: one extra WAV, `vo-reel.wav`, seven lines
  with the same two-second gaps. See Q9.
- Gate 1 crops: nothing extra. The reel reuses the split jerk table and both covers.
- `RenderTestPortrait` (1080 x 1920) added beside `RenderTest`; both render.

**Craft note for Gate 2.** The portrait test card broke a line between "69" and
"min". Components will join every number to its unit with a non-breaking space.

---

## Gate 0 addendum: the print PDFs (2026-10-29)

Received `ATHX-2027-Mens-print.pdf` and `ATHX-2027-Womens-print.pdf`. Both were
built by ReportLab on 2026-10-28 at 513 x 738 pt (a 7 x 10 in trim with bleed).
They are newer than the copies in Drive (2026-08-29, 416 KB and 421 KB). Both
are stored in `assets/pdf/` under their own names, gitignored, not renamed,
because they are not the colour interiors.

| Check | Men's | Women's |
|---|---|---|
| Pages | 158, as expected | 162 = 161 content + 1 blank padding page (p162 is pure white) |
| Colour | **Greyscale throughout** | **Greyscale throughout** |

- **Colour.** All 158 + 162 pages render with zero chroma. The content streams
  set colour through RGB operators, but all 14 distinct values are neutral greys
  (#000000 to #FFFFFF); no images, no CMYK. Where the colour editions would carry
  the men's orange or women's purple, these use black. They are clean,
  legible black-on-white pages, but not what brief 2.4 asks for.
- **Women's offset (correction 2) confirmed exactly.** A page-by-page text
  alignment matches p1 to p42 one-for-one. Women's p43 to p45 are the added
  Chapter 13, "Aligning the Block". Men's p43 to p158 equal women's p46 to p161
  (+3). From the Taper onwards the women's chapter numbers are one higher (men's
  Ch 14 "The Compressed Warm-Up" is women's Ch 15), which matters only if a cut-out
  shows a chapter number.
- **Page index verified against the men's book.** Every page in brief 5.2 holds
  what the brief says. Correction 1 confirmed: p14 holds "Earn the load", the split
  jerk focus by week table and "The drills" table; p15 holds "If your split jerk is
  not ready in time" and the competition rules.
- **`check_pdfs.sh` reworked.** It now checks every PDF in the folder whatever its
  name, scans every page at 20 dpi rather than a sample, and lists the distinct RGB
  values. It counts trailing blank pages so print padding does not fail the page
  count, and it fails a book interior that is not in colour.

**Q8. Colour interiors.** These PDFs cannot be used for cut-outs as the brief
specifies. Two ways forward:
- (a) **Recommended.** Export the colour interiors from the same build (2026-10-28),
  so the page numbers verified above still hold. If the colour export drops the
  bleed, crop coordinates differ from the print files, but Gate 1 measures every
  crop from the PDF's own text boxes (correction 9), so that costs nothing.
- (b) Proceed with the greyscale print files as the cut-out source. They read
  cleanly as white paper on the near-black plate, but the edition colours are lost.
  The men's and women's p6 tables in Scene 7 would then be told apart only by their
  footers or by a label we add.

---

## Gate 0: Setup (2026-10-29)

### Environment

| Check | Result |
|---|---|
| OS | Ubuntu 24.04.5, 4 vCPU, 15 GB RAM, 16 GB /dev/shm, 29 GB disk free |
| Node | v22.22.0 |
| FFmpeg | 6.1.1, with loudnorm, ebur128, deesser, afftdn, acompressor, alimiter, sidechaincompress |
| Poppler | pdftoppm, pdfinfo, pdfimages, pdftotext present |
| ImageMagick, Python 3, Pillow | present (Pillow 12.3) |
| Chrome | Playwright's chrome-headless-shell 153.0.8010.12; every library resolves |
| Remotion | 4.0.539 |
| Render test | 25 frames, 1920 x 1080, H.264 High, yuv420p, bt709, 25 fps, 1.000 s (`out/tests/render-test.mp4`, still in `out/stills/render-test.png`) |

### Decisions

1. **Project location.** `hybridx-video/` at the root of the website repo,
   self-contained (own `package.json`, `tsconfig.json`, `node_modules`). The root
   `tsconfig.json` and `vitest.config.ts` now exclude it. Without that, the site's
   `next build` typecheck would pick up the Remotion files on App Hosting, where
   their dependencies are not installed. Nothing in it is deployed.
2. **What is not in git.** Book PDFs (paid product), page renders, cut-outs,
   voiceover, music, footage and renders are gitignored. All except the PDFs and
   audio are regenerated by the pipeline. Fonts (OFL) and the scripts are tracked.
3. **Brand yellow, provisional: `#FADB5C`.** Superseded: `#FBD85B` confirmed,
   see addendum 2.
4. **Fonts.** The Google Fonts variable builds of Space Grotesk and Inter, from
   github.com/google/fonts, with their OFL licences, in `assets/fonts/`. These are
   the same files hybridx.club serves through `next/font/google`, so the video and
   site set type identically. They render the scope's four weights (Space Grotesk
   500/700, Inter 400/600) from two files rather than the four static TTFs the scope
   names. No fontTools here to cut statics; if you have house static files, drop
   them in and change `src/fonts.ts`.
5. **Browser.** Remotion's own Chrome download is blocked from this container
   (its CDN returns 403). `remotion.config.ts` uses Playwright's pre-installed
   headless shell instead, found by globbing `/opt/pw-browsers`, and
   `REMOTION_BROWSER_EXECUTABLE` overrides it.
6. **Headless stability (correction 11).** Remotion already launches Chrome with
   `--no-sandbox`, `--disable-setuid-sandbox` and `--disable-dev-shm-usage`, and
   multi-process Chrome is its Linux default, so a small `/dev/shm` (Docker's
   64 MB) is handled without extra flags. Added: `swangle` GL (software ANGLE, no
   GPU here), a 60 s delayRender timeout, and concurrency of min(vCPU - 1,
   RAM / 1.5 GB), which is 3 tabs here. `REMOTION_CONCURRENCY` overrides it; a
   proper `remotion benchmark` waits for real components at Gate 2.
7. **Delivery format (correction 11).** 1920 x 1080 H.264 (High profile,
   yuv420p, bt709), CRF 16, preset medium, JPEG intermediate frames at quality 95.
   No 4K ProRes master: this video is all graphics, so 4K gains nothing. If fine
   text shows ringing at Gate 4, render the final with `--image-format=png`.
8. **Public folder is `assets/`**, so components use `staticFile('cutouts/x.png')`.
   Remotion copies it into each render bundle; at this project's size that is
   seconds. Revisit if the page renders grow large.
9. **Timings model (correction 5).** `src/data/sceneTimings.ts` holds the
   storyboard as planned, in m:ss, with every retime from correction 5. `npm run
   check` asserts each retime and the brief's YouTube chapters exactly.
   Compositions read `timelines.main` (and, since addendum 2, `timelines.reel`),
   which conform to the recorded VO:
   - Until `src/data/voTimings.json` holds a paragraph, its shots keep their planned length.
   - Once it does, shots carrying that paragraph are cut to *lead 0.4 s + speech + tail 1.8 s*.
     The tail is the 1.5 s hold plus a breath; 5b uses 3 s because the brief holds the finished map for 3 s.
   - A shot is never cut below its `minSeconds`, and every later cut ripples.
   - Shots sharing a paragraph (1a to 1c) scale together.
   - Chapters are derived from the conformed timeline.
   - Scene dissolves are centred on the boundaries, so they never change the running time.
10. **VO-keyed builds.** Builds that land on a spoken word are cues anchored to
    that word in `voScript.ts`: the carry-over lines (SkiErg, rower, Burpees,
    sandbag, dumbbell, heavy, running), the 6a windows (overhead, squat, deadlift),
    the 3b zone cards, the 7b skill cards, the Scene 9 cards (fitness, strength,
    three, less) and the 10b day pages (heavy, MetCon, engine). Before the
    recording they are placed at 150 wpm; after it, at the measured word time if
    the VO pipeline provides one, otherwise proportionally.
11. **VO script** lives in `src/data/voScript.ts`, verbatim from the plan's
    recording script (626 words), and is the source for the Gate 4 captions.
12. **The 69 minutes (correction 3).** `facts.athx.clock.onTheClockMinutes = 69`,
    with the zone slots 20 + 24 + 25 recorded beside it (source: the plan, citing
    BLK BOX). The check confirms they sum to 69 and that the strength slot equals
    the 20-minute pairs length. Individual working time derives to 64.
13. **MetCon X loads.** The fact sheet writes them as "DB 20 kg / 12.5 kg, sandbag
    50 kg / 30 kg"; stored as men / women, the order it states for the row. No
    storyboard shot shows them.
14. **PDF colour check.** `pipeline/check_pdfs.sh` + `pdf_colour.py` use three
    signals: device colour operators in the content streams (rg/k/g with operands),
    embedded image colour spaces from `pdfimages -list`, and a 50 dpi render's chroma.
    Self-tested on the four RGB PDFs in the site repo (all read RGB) and a synthetic
    CMYK file (reads CMYK).

### Corrections from the kick-off: where each one lands

| # | Correction | Status |
|---|---|---|
| 1 | Drills table from men's p14 | Gate 1, `crops.json` (6c already reads "p14 focus + drills tables") |
| 2 | Women's page = men's up to p42, then + 3 | Gate 1, a mapping function in the crop pipeline |
| 3 | 3c card "3 ZONES, 69 MIN ON THE CLOCK" | `facts.ts` done; copy built from facts at Gate 2. See Q5 |
| 4 | VO 3b "in about two and a half hours" | Done, `voScript.ts` |
| 5 | Retimes, parameterised | Done, `sceneTimings.ts`, asserted by `npm run check` |
| 6 | SkillCard component | Gate 2 |
| 7 | Women's p6 beside the men's | Gate 1 crop, Gate 2 layout |
| 8 | Scene 9 rules land yellow, settle to white | Gate 2 |
| 9 | Pixel-exact crops via `pdftotext -bbox-layout` or a grid overlay | Gate 1 |
| 10 | `deesser=i=0.4:m=0.5:f=0.5:s=o` in `clean_vo.sh` | Gate 1 |
| 11 | Headless config, 1080p H.264, `bootstrap.sh` | Done (Decisions 5 to 7) |

### Findings

1. **No yellow in the logo files.** No `assets/brand` was supplied, so I sampled
   every HybridX logo in the website repo (`public/Full Logo (2).png`,
   `public/Icon Logo.png`, `public/plan-finder/hybridx-logo-full.png`,
   `handover/.../hybridx-x-mark.jpg`). Every opaque pixel is `#131313`, zero
   saturated pixels: the marks are monochrome. The site's CSS uses `#FADB5C` 39
   times (`--accent` and `--primary` in `globals.css`, `brand.yellow` in
   `tailwind.config.ts`) and `#C8FF00` nowhere. `#FADB5C` is a warm yellow, nearer
   HYROX's own yellow than `#C8FF00` would have been. That makes "HYROX content in
   grey, yellow for HybridX highlights only" more important, not less.
2. **The logos are black only.** On a black end card they would be invisible, and
   the QA list says the official logo is used unmodified, so I will not invert it.
3. **Book PDFs are not in the container.** Your Google Drive has
   `ATHX-2027-Mens.pdf` (416,237 bytes) and three copies of `ATHX-2027-Womens.pdf`
   (421,646 bytes each). The Drive connector returns file contents as base64 text
   through the conversation, which is not a workable way to move a binary PDF.
   Small files for 158-page books, which is fine if they are all vector; the check
   will tell.
4. **Not found anywhere:** the two FRONT cover PDFs, the Volume-Progression PDF,
   any SVG logo.
5. **VO fit at 150 wpm.** The retimed shots fit the words but leave no room for
   the lead-in and the 1.5 s hold:
   - 6a to 6d, 10a to 10c, 8b and 4b are 0.2 s to 2.4 s short once padded.
   - The conform will lengthen them when the real read arrives; that is its job.
   - Going the other way, 3a (+7 s), 4a (+5 s) and 5a (+13 s) have slack that a
     VO-driven cut would close, which is why a 150 wpm read projects to 5:14.
   - The `minSeconds` floors are my estimates until the components exist. Gate 2
     replaces them with measured build lengths: the race map labels and carry-over
     map need reading time. That will lift the projection into range.
   - No decision needed now; flagged so the Gate 3 length is not a surprise.
6. **Recording dependency.** The VO pipeline will split each scene WAV into
   paragraphs at the two-second silences the brief asks for. A mid-paragraph pause
   over about 1.2 s would split a paragraph in two; the pipeline will refuse a scene
   whose paragraph count does not match the script, rather than guess.

### Questions

Answered:

- **Q1. Brand yellow.** `#FBD85B`. See addendum 2.
- **Q2. Logo files.** White full lock-up received. See addendum 2.
- **Q3. PDFs.** Print interiors and cover wraps received. The Volume-Progression
  PDF is still optional and absent. The colour interiors are Q8.
- **Q7. 9:16 cut-down.** In scope. See addendum 2.

Open (need your input):

- **Q4. Where the project lives.** Committed and pushed to branch
  `claude/hyrox-athx-video-gate0` of the website repo; no pull request opened. Keep
  it there, or move it to its own repo?
- **Q5. The 64 against 69 question.** Scenes 1 and 3 label the ATHX blocks
  STRENGTH 15 min, ENDURANCE 24 min, METCON X 25 min cap. Those add to 64, while
  the 3c card says 69 MIN ON THE CLOCK. A viewer who adds up the blocks gets a
  different number. Options:
  - (a) Label the strength block with its 20-minute slot and say "15 min lifting"
    inside the 3b card.
  - (b) Use the plan's other wording, "UP TO 64 MIN OF WORK".
  - (c) Keep both as briefed.
- **Q6. Lines over eight words.** Two storyboard lines break the 8-word rule:
  - The 3c HYROX card: 12 words. Proposed: "1 RACE, ABOUT 60 TO 100 MIN", with small
    print "Most age-group athletes, start to finish". The headline mirrors the ATHX
    card; the small print keeps the brief's caveat.
  - The Scene 8 caption: 9 words. Proposed: "3 KM RUN. ONLY SKI METRES SCORE".
  - Scene 9 card 4 is 8 or 9 words depending on whether "3" and "8" count; fine as
    is unless you count them.
  - The reel's captions are all 6 words or fewer.
- **Q8. Colour interiors.** See the print PDFs addendum: (a) export them from the
  2026-10-28 build (recommended), or (b) cut from the greyscale print files.
- **Q9. Reel VO.** Brief Part 4's r2 says "three separate tests in an afternoon".
  `voScript.ts` carries correction 4 over to it ("in about two and a half hours")
  for the same reason as 3b: say if you want the original. Jon also needs the seven
  reel lines added to his recording script; they are in `voScript.ts` (r1 to r7).

Not needed until Gate 3: the voiceover WAVs (`vo-s01` to `vo-s10`, plus
`vo-reel.wav`) and the licensed music track with its licence.

## Components

None yet. Built at Gate 2; names follow scope Section 5, plus `SkillCard`.
