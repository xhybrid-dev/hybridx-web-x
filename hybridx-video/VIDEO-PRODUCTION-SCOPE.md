# HybridX Video Production Scope

**Role:** Claude, working in Claude Code as a senior motion graphic designer and video editor
**Projects covered:**
1. ATHX 2027 landscape explainer (`ATHX-2027-Video-Brief-and-Storyboards.md`, Part 2)
2. ATHX 2027 portrait Reel (same brief, Part 3)
3. HYROX or ATHX? animated comparison (`ATHX-vs-HYROX-Animated-Video-Brief.md`)

The two briefs say *what* each video contains. This scope says *how* it gets built: the tools, project structure, design system, components, asset pipeline, quality checks and working method. Save all three files in the project folder and point Claude Code at this one first.

---

## 1. Tool choice

### 1.1 Recommendation

**Use Remotion as the main tool, with FFmpeg for audio and encoding and Poppler (`pdftoppm`) for the book page renders. Leave Blender out unless you later want a 3D book shot.**

| Tool | What it is | Cost for HybridX | Fit for these videos |
|---|---|---|---|
| **Remotion** | Videos written as React components, rendered frame by frame in headless Chrome | Free for individuals and companies with three or fewer people. A company licence is needed above that | **Best fit.** Mature and well documented. Frame-accurate timing, precise easing, SVG line drawing, captions, audio, and one set of components rendering in both 16:9 and 9:16 |
| **HyperFrames** (HeyGen) | Videos written as HTML and CSS with GSAP or similar animation, rendered in headless Chrome | Free, Apache 2.0, with no commercial thresholds | **Strong alternative.** Built for AI agents and has a Claude Code plugin. Newer, and its editor is still evolving. Choose it if HybridX grows past three people, or if you want plain HTML rather than React |
| **Motion Canvas / Revideo** | TypeScript animation libraries | Free, MIT | Good for diagrams, but less suited to editing footage and audio |
| **Blender** | Full 3D suite, scriptable in Python | Free, GPL | Overkill for flat typographic motion. Renders are slow and the edit-and-review loop is clumsy. Only worth it for a single photoreal 3D book shot |
| **MoviePy + FFmpeg** | Python editing library | Free | Fine for simple cuts. Motion design quality is limited, so use it as a fallback only |

**Why Remotion over the others.** The look in both briefs is typographic: ruled tables, lines that draw themselves, counting numbers, document cut-outs and clean lower thirds. That is exactly what Remotion handles well. Every element is code, so a change ("make that table build slower", "swap to the women's figures") is a quick edit and re-render, not a manual redo in a timeline. One component library serves all three videos and both aspect ratios, which keeps the branding consistent.

**Licence check.** Remotion is free for you as long as HybridX has three or fewer people. If that changes, either buy a Remotion company licence or switch to HyperFrames, which has no thresholds. Because the briefs keep the design system and components separate from the tool (Section 4), the move would mean porting the component code, not redesigning anything.

### 1.2 Supporting tools

| Tool | Job |
|---|---|
| FFmpeg / FFprobe | Voiceover clean-up, loudness measurement and normalisation, final encodes, technical checks |
| Poppler (`pdftoppm`, `pdfinfo`) | Rendering book pages from the colour PDFs at 300 dpi |
| Node.js 22 LTS | Runs Remotion |
| Python 3 + Pillow | Cropping page renders from a manifest, building contact sheets |
| Space Grotesk and Inter (local font files) | All typography, loaded from local files, not a font CDN |

---

## 2. Role and standards

Claude works as a senior motion designer and editor, not as a template filler.

- **Taste:** restrained, documentary-style motion. Every movement has a reason. Anything that draws attention to the animation rather than the information gets removed.
- **Craft:** consistent spacing, alignment to a grid, type that is legible at the size it is shown, and colour used sparingly.
- **Editing:** cuts motivated by speech and action, pacing that leaves time to read, and a mix where the voice is always clear.
- **Accuracy:** every figure on screen comes from the fact sheets in the briefs. If something is unclear, Claude asks rather than inventing it.
- **Process:** it works in stages and stops at each review gate (Section 7). It shows stills and short tests before full renders, and it keeps a log of decisions.

---

## 3. Project structure

```
hybridx-video/
  VIDEO-PRODUCTION-SCOPE.md        <- this file
  VIDEO-BRIEF.md                   <- ATHX explainer and Reel brief
  VIDEO-BRIEF-HYROX-ATHX.md        <- comparison brief
  EDIT-LOG.md                      <- decisions, questions, re-shoot notes
  assets/
    brand/        logo files (SVG/PNG), brand colour notes
    fonts/        SpaceGrotesk-Medium.ttf, SpaceGrotesk-Bold.ttf, Inter-Regular.ttf, Inter-SemiBold.ttf
    pdf/          ATHX-2027-Mens.pdf, ATHX-2027-Womens.pdf, *-FRONT.pdf, Volume-Progression.pdf
    pages/        rendered page PNGs (generated)
    cutouts/      cropped elements (generated from crops.json)
    footage/      A-roll and B-roll (explainer and Reel only)
    proxies/      720p proxies of footage (generated)
    audio/
      vo/         raw voiceover WAVs, one per scene
      vo-clean/   processed voiceover (generated)
      music/      licensed tracks and licence files
  pipeline/
    crops.json            page, crop box and output name for every cut-out
    render_pages.sh       pdftoppm renders
    crop_cutouts.py       crops from crops.json
    clean_vo.sh           FFmpeg voiceover chain
    measure_loudness.sh   two-pass loudnorm report
    contact_sheet.py      one frame every 2 s into a grid PNG
    qa.sh                 ffprobe and loudness checks against spec
  src/                    Remotion project
    tokens.ts             design system (Section 4)
    easing.ts             shared easing curves and durations
    components/           shared component library (Section 5)
    compositions/
      AthxExplainer.tsx   16:9
      AthxReel.tsx        9:16
      HyroxVsAthx.tsx     16:9
      HyroxVsAthxReel.tsx 9:16 (optional cut-down)
    data/                 facts.ts (every number from the fact sheets), captions/*.srt
  out/
    stills/  tests/  rough/  final/
```

---

## 4. Design system (`src/tokens.ts`)

Everything visual reads from one tokens file, so the three videos stay consistent and a brand correction is a one-line change.

### 4.1 Colour

| Token | Value | Use |
|---|---|---|
| `bg` | `#1C1117` | Graphic plates |
| `black` | `#000000` | Title and end cards |
| `text` | `#FFFFFF` | Primary text |
| `textMuted` | `rgba(255,255,255,0.6)` | Secondary text |
| `rule` | `rgba(255,255,255,0.22)` | Table rules, hairlines |
| `panel` | `rgba(255,255,255,0.06)` | Table header fill, card fill |
| `accent` | HybridX yellow, confirmed from the logo files (`#C8FF00` expected) | One highlight per shot at most |
| `hyroxNeutral` | `#A3A3A3` | HYROX content in the comparison video only |
| `mens` | `#EA580C` | Only as printed on Men's Edition cut-outs and covers |
| `womens` | `#7C3AED` | Only as printed on Women's Edition cut-outs and covers |

### 4.2 Type scale

| Style | 16:9 (1920 x 1080) | 9:16 (1080 x 1920) | Font |
|---|---|---|---|
| Display | 96 px, tracking -1% | 84 px | Space Grotesk 700, caps |
| Heading | 56 px | 52 px | Space Grotesk 700, caps |
| Label | 22 px, tracking +10% | 26 px | Space Grotesk 500, caps |
| Body / VO captions | 36 px | 48 px | Inter 600 |
| Table text | 28 px, tabular figures | 32 px | Inter 400 / 600 |
| Small print | 20 px | 24 px | Inter 400 |

Nothing on screen is smaller than 20 px at 1080p.

### 4.3 Layout

- 16:9 uses a 12-column grid with 96 px outer margins and 24 px gutters, and a title-safe area of 90%.
- 9:16 uses a 6-column grid with 60 px side margins. Text sits only inside the Reels safe zone, x 60 to 960 and y 250 to 1480.
- Spacing comes in steps of 8 px.

### 4.4 Motion (`src/easing.ts`)

| Token | Value |
|---|---|
| `easeStandard` | `Easing.bezier(0.65, 0, 0.35, 1)` (in-out cubic) |
| `easeEnter` | `Easing.bezier(0.22, 1, 0.36, 1)` (out quint) |
| `easeExit` | `Easing.bezier(0.64, 0, 0.78, 0)` (in quint) |
| `textIn` | 12 frames, 24 px rise, opacity 0 to 1 |
| `textOut` | 10 frames |
| `rowStagger` | 6 frames |
| `countUp` | 20 frames |
| `lineDraw` | 12 to 24 frames, linear speed |
| `sceneDissolve` | 10 frames |
| `pushIn` | 100% to 104% scale across the shot |

Springs with overshoot, bounce and elastic easing are not used anywhere.

---

## 5. Component library (`src/components/`)

These are built once and reused across all three videos and both aspect ratios. Each has a props interface, a Remotion Studio story with sample data, and a still in `out/stills/`.

| Component | Purpose | Used in |
|---|---|---|
| `Plate` | Background with an optional faint page-texture layer | All |
| `TitleCard` | Two-line title with a yellow rule | All |
| `LowerThird` | Name and role label with a 4 px rule | Explainer |
| `SectionLabel` | Small caps label that fades in at the top left | All |
| `Callout` | Short sentence of up to eight words, eased in | All |
| `DataTable` | Ruled table with header fill, row-by-row build, highlight on a chosen cell | All |
| `CountUp` | Number counting to an exact value, with a tabular-figure font | All |
| `SplitBar` | 24-minute bar that splits into run and ski, with ski metres counting up | Explainer, Reel, comparison |
| `WindowTimeline` | 15-minute Strength Zone timeline with three windows | Explainer, comparison |
| `ZoneTimeline` | ATHX afternoon: three blocks with recovery gaps | Comparison |
| `RaceMap` | HYROX 8 x (1 km + station) chain that draws itself | Comparison |
| `ScoringDiagram` | Total time against placings summed | Comparison |
| `CarryOverMap` | Two columns joined by lines (solid or dashed) that draw one at a time | Comparison |
| `PhaseBar` | 12 weeks, four phases, deloads marked | All |
| `CutOut` | Cropped page image as a flat card with a soft shadow, mask-wipe reveal, highlight band or underline | All |
| `CoverPair` | Both covers side by side with a slow push-in | All |
| `CaptionTrack` | Burned-in captions from SRT, with keyword highlight and safe-zone aware | Reels |
| `EndCard` | Logo, URL and disclaimer | All |
| `Pictogram` | Monoline equipment icons on a 48 px grid (optional) | Comparison |
| `SafeZoneOverlay` | Development-only overlay showing the safe areas, never rendered in finals | Reels |

**Data rule:** components never contain hard-coded figures. Every number comes from `src/data/facts.ts`, which is written once from the fact sheets and checked against them at Gate 1.

---

## 6. Asset pipeline

### 6.1 Book pages and cut-outs

1. Render each listed page from the colour PDFs:
   `pdftoppm -r 300 -f N -l N -png assets/pdf/ATHX-2027-Mens.pdf assets/pages/mens-pN`
2. Record every crop in `pipeline/crops.json` as `{ "id", "pdf", "page", "box": [x0, y0, x1, y1] }` in pixel units at 300 dpi.
3. `crop_cutouts.py` produces `assets/cutouts/<id>.png`, trimmed with an 8 px margin and no rescaling beyond 100%.
4. Output a contact sheet of every cut-out for review at Gate 1.

The page numbers are listed in each brief. The women's edition has the same structure plus two extra pages, so its page numbers must be confirmed before any women's crop is taken.

### 6.2 Footage (explainer and Reel only)

- Run FFprobe on every clip and log the codec, resolution, frame rate and duration in `EDIT-LOG.md`.
- Make 720p ProRes Proxy or H.264 proxies for previewing. Final renders use the originals.
- Conform everything to 25 fps. Flag any clip at another rate rather than silently retiming it.

### 6.3 Voiceover

FFmpeg chain, tuned by ear at Gate 3:

```
highpass=f=80, afftdn=nf=-25, deesser, acompressor=threshold=-18dB:ratio=3:attack=10:release=120,
equalizer=f=3500:t=q:w=1:g=2, alimiter=limit=0.89
```

Then run a two-pass `loudnorm` to -16 LUFS for the voice stem, before the final mix is brought to -14 LUFS integrated with a -1 dBTP ceiling.

### 6.4 Music and mix

- Duck the music under speech to about -22 LUFS short-term, using volume curves in Remotion keyed to the voiceover timings, or `sidechaincompress` in FFmpeg.
- Natural sound sits about 10 dB under the voice.
- Measure the final mix with FFmpeg `ebur128` and record the result in the QA report.

---

## 7. Working method and review gates

The same gates apply to each video. Claude stops at every gate and waits for approval before continuing.

| Gate | Claude delivers | You check |
|---|---|---|
| **0. Setup** | Environment check (Node, FFmpeg, Poppler, Remotion render test), folder structure, `tokens.ts`, `facts.ts` | Brand yellow confirmed, facts match the briefs |
| **1. Assets** | Page renders, cut-out contact sheet, footage inventory, cleaned voiceover samples, gaps list | Crops are right and legible, nothing missing |
| **2. Design** | Still of every component in both aspect ratios, plus a 10-second motion test of the key animations | Look, type sizes, motion feel |
| **3. Animatic / rough cut** | Full video at 720p with the voiceover and temporary music | Timing, story, pacing |
| **4. Fine cut** | Notes applied, full-resolution render, captions, mix to spec | Final look and sound |
| **5. Delivery** | Final files, SRT, thumbnails, QA report | Sign-off |

**Suggested order:** the comparison video first, since it needs no filming and builds most of the shared components. Then the Reel, then the explainer once the footage is filmed.

---

## 8. Quality checks (run at Gate 4 and recorded in `out/final/QA.md`)

**Technical**
- [ ] FFprobe confirms resolution, 25 fps, duration within the brief's range, and the H.264 High profile
- [ ] Loudness -14 LUFS integrated (±1), true peak at or below -1 dBTP
- [ ] No dropped or duplicated frames (frame count matches duration x 25)
- [ ] Audio and video in sync at the start, midpoint and end

**Visual**
- [ ] Contact sheet of one frame every 2 seconds, reviewed for overlaps, cut-off text and alignment
- [ ] Reels: safe-zone overlay check on every caption and text frame
- [ ] No text under 20 px at 1080p, and every finished graphic held for at least 1.5 seconds
- [ ] At most one yellow highlight per shot. Edition colours appear only inside cut-outs and covers

**Editorial**
- [ ] Every on-screen number matches `facts.ts`, and `facts.ts` matches the fact sheets
- [ ] No em dashes in on-screen text or captions, and British spelling throughout
- [ ] Captions match the voiceover word for word, within 2 frames of timing

**Legal and brand**
- [ ] No HYROX, ATHX or adidas logos, colour schemes or event imagery
- [ ] No HYROX content coloured yellow
- [ ] Official HybridX logo used unmodified
- [ ] Disclaimer present and legible on every end card
- [ ] Music licence file present for every track used

---

## 9. Deliverables and file names

```
out/final/
  HybridX_ATHX-Explainer_16x9_1080p.mp4
  HybridX_ATHX-Explainer_16x9_4K_ProRes.mov      (master, if 4K footage)
  HybridX_ATHX-Explainer.srt
  HybridX_ATHX-Explainer_thumbnail.png
  HybridX_ATHX-Reel_9x16.mp4
  HybridX_ATHX-Reel_cover.png
  HybridX_HYROX-vs-ATHX_16x9_1080p.mp4
  HybridX_HYROX-vs-ATHX.srt
  HybridX_HYROX-vs-ATHX_thumbnail.png
  HybridX_HYROX-vs-ATHX_9x16.mp4                 (optional cut-down)
  QA.md
```

Remotion project source, `crops.json` and `facts.ts` are kept so any video can be updated and re-rendered later, for example for ATHX 2028.

---

## 10. Out of scope

- Writing or changing the scripts beyond small timing trims (the scripts are in the briefs)
- AI-generated imagery, voices or music
- Stock footage, stock icons or template packs
- Any use of HYROX, ATHX or adidas branding
- Publishing or uploading to platforms

---

## 11. Kick-off prompt for Claude Code

Put this file, both briefs and the assets folder in place, then paste:

```text
You are working as a senior motion graphic designer and video editor for
HybridX Club. Read VIDEO-PRODUCTION-SCOPE.md in full, then VIDEO-BRIEF.md and
VIDEO-BRIEF-HYROX-ATHX.md.

Build the videos with Remotion (React), FFmpeg and Poppler exactly as the
scope sets out: the project structure in Section 3, the design system in
Section 4, the shared component library in Section 5, and the asset
pipeline in Section 6. All figures must come from src/data/facts.ts, which
you write from the briefs' fact sheets.

Work through the gates in Section 7 and stop at each one for my review.
Start with Gate 0 for the HYROX or ATHX? comparison video:
- check the environment (Node 22, FFmpeg, Poppler, a Remotion test render),
- create the folder structure,
- write tokens.ts and facts.ts,
- confirm the brand yellow from the logo files in assets/brand,
- list anything you need from me.

Keep EDIT-LOG.md up to date with decisions and open questions. Do not
invent facts, do not use AI-generated imagery, and do not use any HYROX,
ATHX or adidas branding.
```

---

**Sources:** [Remotion licence](https://cdn.jsdelivr.net/npm/remotion@4.0.529/LICENSE.md) · [Remotion licence FAQ](https://www.remotion.dev/docs/license/faq) · [HyperFrames on GitHub](https://github.com/heygen-com/hyperframes)
