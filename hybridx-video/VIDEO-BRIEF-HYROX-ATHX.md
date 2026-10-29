# HYROX to ATHX: Animated Comparison Video Brief

**For use in a Claude Code session.** This brief is the companion to `ATHX-2027-Video-Brief-and-Storyboards.md` and follows the same brand and editing standards (Part 1 of that file). Read both before starting.

This video uses **no filmed footage**. It is built entirely from animated graphics, cut-outs from the HybridX books and documents, and new diagrams made in the same visual style. A recorded voiceover carries it.

The brief has six parts:

1. Purpose, audience and message
2. The visual system for an animation-only video
3. The storyboard for the main video (landscape, about 5:30)
4. An optional portrait cut-down (about 60 seconds)
5. Assets, page index and the Claude Code prompt
6. The fact sheet for both events. Everything on screen must match it.

---

## Part 1: Purpose, audience and message

**Working title:** HYROX or ATHX? How the two events compare, and why HYROX athletes should try ATHX

**Audience:** athletes who already train for or race HYROX. They know the SkiErg, sleds, wall balls and compromised running well. Most know ATHX by name only, if at all.

**What they should understand by the end:**
1. How the two events are built: one continuous race against three separate scored zones.
2. How each is scored: total time against placings added together.
3. How much of their HYROX fitness carries straight over.
4. What is genuinely new in ATHX: maximal barbell strength, DB bench, the sandbag squat into a carry, and a pacing decision in the Endurance Zone.
5. Why it is worth a go, and how to prepare.

**Balance across the whole event.** The video gives each ATHX zone a fair share of time. The run and ski are one part of the story, not the headline. The Strength Zone and MetCon X get at least as much screen time as the Endurance Zone, because they hold the biggest differences for a HYROX athlete.

**Tone towards HYROX.** Respectful and factual. HYROX is presented as a format the viewer knows and values, and ATHX as a different test that uses much of the same fitness. Never suggest HYROX is worse, easier or "just running". The message is "you are already well prepared for most of this, and here is what is different", not "switch events".

**Legal and brand care**
- Name both events in plain text only. Do not use, recreate or imitate the HYROX, ATHX or adidas logos, typefaces, colour schemes, station graphics or venue imagery.
- Do not use either event's photos or video.
- HYROX's own brand colours are yellow and black, which sit close to HybridX yellow. Do not colour-code HYROX in yellow. Use a neutral grey for HYROX content and keep HybridX yellow for HybridX's own highlights (see 2.2).
- End card disclaimer: *"HybridX Club is independent. Not affiliated with or endorsed by HYROX, ATHX Games or adidas. HYROX and ATHX are trademarks of their respective owners."*

---

## Part 2: The visual system for an animation-only video

### 2.1 The look

The look is a calm, typographic motion piece that feels like the book come to life: black and near-black plates, white type, ruled tables, thin rules and one accent. Picture a well-made sports documentary infographic sequence or a premium data explainer, not a kinetic-text template.

### 2.2 Colour roles

| Role | Colour | Use |
|---|---|---|
| Background | Near-black `#1C1117`, full black `#000000` for title cards | Every plate |
| Primary text | White `#FFFFFF` | Headings, key numbers |
| Secondary text | 60% white | Labels, sources, small print |
| HYROX content | Neutral cool grey `#A3A3A3` lines and fills, white text | Race map, HYROX column of tables |
| ATHX content | White lines and fills on near-black, with HybridX yellow used only for the single highlighted item in a shot | ATHX zones, ATHX column of tables |
| Highlight | HybridX yellow (`#C8FF00`, confirm against the official logo files) | One thing per shot at most: the active row, the total, the connecting line being drawn |
| Book edition accents | Men's orange `#EA580C`, Women's purple `#7C3AED` | Only inside cut-outs of book pages and covers, as printed |

### 2.3 Type

Space Grotesk 700 and 500 for headings and labels (all caps, tight tracking). Inter 400 and 600 for sentences and data, with tabular figures. On-screen sentences are short, eight words maximum outside tables.

### 2.4 Document cut-outs ("paper on black")

This is the main way the books appear in the video.

- Render the source pages from the **colour** PDFs at 300 dpi (see Part 5.2), then crop to the exact element: a table, a callout box, a day page header, a split jerk drill table.
- Place each cut-out on the near-black plate as a flat card. Use a very soft shadow (0 12 px 32 px, black at 35%) and no border, rounded corners or tilt above 2 degrees.
- **Reveal** with a clean rectangular mask that wipes in the reading direction over 12 to 16 frames, eased. Or fade and rise 24 px over 12 frames.
- **Emphasis:** while the voiceover talks about a line, a yellow 3 px rule draws under that line, or a 10% white highlight band sits behind it. Never use arrows, circles, scribbles or zoom-and-spin.
- **Movement:** a slow push-in from 100% to 104% over the shot. Layered cut-outs can use gentle parallax (the back layer moves at 60% of the front layer's speed).
- Keep text in the cut-out legible. Never show a whole page so small that it reads as texture, unless it is deliberately in the background at 30% opacity behind a headline.

### 2.5 New diagrams to build

Build these as vector graphics (in Remotion or as SVG), in the book's style: thin lines, white and grey, one accent.

| Diagram | Description |
|---|---|
| **HYROX race map** | A horizontal chain of 8 run segments (thin grey bars labelled 1 km) alternating with 8 station nodes (small circles with station names below). It draws itself left to right along a single line, with a running time counter. |
| **ATHX day timeline** | One horizontal 2.5-hour bar with three solid blocks (STRENGTH 15 min, ENDURANCE 24 min, METCON X 25 min cap) separated by lighter "recovery" gaps. Note in small text that the zone order and gap lengths are set by each event. |
| **Scoring diagram** | Left: a single stopwatch figure labelled "TOTAL TIME". Right: three small placing boxes (e.g. 12th, 14th, 15th) summing to a total. Followed by the specialist and all-rounder table from the book. |
| **Carry-over map** | HYROX stations as a column on the left (grey), ATHX elements as a column on the right (white). Lines draw between matching items one at a time (see Scene 5). |
| **New skills cards** | A simple card for each new element: title, one line and a small cut-out from the book. |
| **12-week phase bar** | BASE 1-4, DEVELOPMENT 5-8, SPECIFIC 9-11, TAPER 12, with deloads marked by a thin rule. |
| **Equipment pictograms (optional)** | A consistent custom monoline set (2 px stroke, white, square end caps, on a 48 px grid): SkiErg, rower, barbell, dumbbell, sandbag, sled, kettlebell, wall ball, bench. Draw them as simple geometric shapes. No clip art, stock icons or AI-generated images. Use them only in the carry-over map and the format comparison. |

### 2.6 Motion rules (same as the first brief)

- Eased motion only (cubic or quint in-out). Text fades and rises 20 to 30 px over 10 to 16 frames in and 8 to 12 out.
- Tables build row by row, 6 frames apart. Numbers count up over 18 to 24 frames and land exactly.
- Lines draw over 12 to 24 frames at a constant speed.
- Straight cuts between shots within a scene. 10-frame dissolves between scenes.
- No bounce, overshoot, per-letter animation, typewriter, glitch, shake, RGB split, particles, light leaks, 3D flips or camera spins.
- One idea per screen. Hold each finished graphic still for at least 1.5 seconds before moving on, so viewers can read it.

### 2.7 Specifications

| | Main video | Optional cut-down |
|---|---|---|
| Aspect | 16:9 | 9:16 |
| Resolution | 1920 x 1080 (render graphics at 3840 x 2160 for a 4K master if practical) | 1080 x 1920 |
| Frame rate | 25 fps | 25 fps |
| Length | 5:15 to 5:45 | 55 to 65 s |
| Audio | Voiceover -14 LUFS integrated, -1 dBTP. Music ducked to about -22 LUFS under speech | Same |
| Captions | SRT file, plus an optional burned-in version | Burned in, inside the Reels safe zone (x 60-960, y 250-1480) |

**Voiceover:** recorded by Jon (preferred) in a quiet room with a lav or dynamic mic, using the processing chain from the first brief. Record scene by scene with two seconds of silence between paragraphs, so the edit can breathe.

**Music:** one licensed minimal, modern, pulse-led track, 95 to 115 BPM, with no vocals. Add subtle sound design only where it helps: a soft tick as each table row lands, at very low level and not on every row. No whooshes.

---

## Part 3: Main video storyboard (landscape, about 5:30)

**Key:** VO = voiceover. "Cut-out" means a crop from the colour book PDF, with page numbers from Part 5.2.

---

### SCENE 1: OPENING (0:00 to 0:20)

| Time | Visual | On-screen text | Motion |
|---|---|---|---|
| 0:00 to 0:08 | The HYROX race map draws itself across the upper half of the frame in grey: run, station, run, station. A small counter beneath ticks through 8 km. | HYROX | Line draws left to right over 6 s |
| 0:08 to 0:16 | Beneath it, the ATHX day timeline draws in white: three solid blocks with gaps between them. | ATHX | Blocks fade and rise one at a time |
| 0:16 to 0:20 | Both diagrams hold. A thin yellow rule draws between them. | none | Hold |

> **VO:** "If you race HYROX, you already have a lot of what ATHX asks for. But the two events are built very differently. This video compares them side by side: how they work, how they're scored, what carries over, and what's new."

---

### SCENE 2: TITLE (0:20 to 0:26)

Black plate. **HYROX OR ATHX?** (Space Grotesk 700, white), with **HOW THE TWO EVENTS COMPARE** (500, 60% white) beneath it and a 4 px yellow rule under that. Hold for 3 seconds, then a 10-frame dissolve.

---

### SCENE 3: TWO DIFFERENT FORMATS (0:26 to 1:15)

| Time | Visual | On-screen text | VO |
|---|---|---|---|
| 0:26 to 0:45 | Full-width HYROX race map with station names appearing under each node in order: SkiErg 1,000 m, Sled Push 50 m, Sled Pull 50 m, Burpee Broad Jumps 80 m, Row 1,000 m, Farmers Carry 200 m, Sandbag Lunges 100 m, Wall Balls 100 | **ONE CONTINUOUS RACE** / 8 x 1 KM RUN + 8 STATIONS | VO 3a |
| 0:45 to 1:05 | The ATHX timeline expands. Each block opens into a small card listing its content | **STRENGTH**: 1RM shoulder to overhead, 2RM back squat, 3RM deadlift. **ENDURANCE**: 3 km run, then max ski. **METCON X**: row, DB work, sandbag, burpees, row | VO 3b |
| 1:05 to 1:15 | Split screen: a HYROX summary card on the left (grey) and an ATHX summary card on the right (white) | HYROX: about 60 to 100 min for most age-group athletes, start to finish / ATHX: about 69 min of work across about 2.5 hours | VO 3c |

> **VO 3a:** "HYROX is one continuous race. You run a kilometre, do a station, and repeat that eight times. The clock doesn't stop until you finish."
>
> **VO 3b:** "ATHX is three separate tests in one afternoon. There's a strength zone with three heavy lifts, an endurance zone with a run and a ski, and a timed workout called MetCon X."
>
> **VO 3c:** "So instead of one long effort, you get three shorter ones with a break between each."

**Edit note:** the HYROX duration line is a range for typical age-group athletes, not a claim about every finisher. Do not show world record times.

---

### SCENE 4: HOW EACH IS SCORED (1:15 to 1:50)

| Time | Visual | On-screen text | VO |
|---|---|---|---|
| 1:15 to 1:25 | Scoring diagram, left side: a single "TOTAL TIME" figure | **HYROX: FASTEST TOTAL TIME** | VO 4a |
| 1:25 to 1:35 | Right side: three placing boxes count up and sum | **ATHX: PLACINGS ADDED TOGETHER** | VO 4b |
| 1:35 to 1:50 | Cut-out of the specialist and all-rounder table (Chapter 2, p9). It builds row by row and the total column highlights yellow | none (the table carries it) | VO 4c |

> **VO 4a:** "HYROX is scored on your total time."
>
> **VO 4b:** "In ATHX, each zone is ranked on its own, and your three placings are added together. The lowest total wins."
>
> **VO 4c:** "That means balance matters. An athlete who wins two zones but finishes fortieth in the third scores forty-two. Someone who places twelfth, fourteenth and fifteenth scores forty-one and finishes ahead."

---

### SCENE 5: WHAT CARRIES OVER FROM HYROX (1:50 to 2:45)

The carry-over map. Two columns, with the HYROX station on the left and the ATHX element on the right. Each line draws as the VO reaches it and holds. The finished map stays on screen for 3 seconds.

| Order | HYROX (left, grey) | ATHX (right, white) | Line style |
|---|---|---|---|
| 1 | SkiErg 1,000 m | Endurance Zone ski (scored on metres) | Yellow while active, then white |
| 2 | Rowing 1,000 m | MetCon X rows (start and finish, by calories) | Same |
| 3 | Burpee Broad Jumps 80 m | 30 burpees over a bench | Same |
| 4 | Sandbag Lunges 100 m + Farmers Carry 200 m | 30 sandbag squats into a 30 m sandbag carry | Same |
| 5 | Wall Balls 100 | DB ground to overhead (partly: the same leg drive and overhead finish) | Dashed line, meaning partial carry-over |
| 6 | Sled Push and Sled Pull | Leg and back strength for the squat and deadlift (a base, not the same test) | Dashed line |
| 7 | 8 km of compromised running | A 3 km run when you're already working hard | Same |

| Time | On-screen text | VO |
|---|---|---|
| 1:50 to 2:35 | Header: **WHAT YOU ALREADY HAVE** | VO 5a |
| 2:35 to 2:45 | Small caption under the finished map: **A STRONG ENGINE TRANSFERS DIRECTLY** | VO 5b |

> **VO 5a:** "A lot of your HYROX training transfers straight across. The SkiErg and the rower are both in ATHX. Burpees are there, over a bench instead of a broad jump. The sandbag is there too, as squats straight into a carry. Wall balls and sleds don't appear, but the leg drive and strength they build is a good base for the dumbbell work and the heavy lifts. And you're used to running when you're already tired."
>
> **VO 5b:** "If you're fit enough for HYROX, the engine side of ATHX will feel familiar."

---

### SCENE 6: WHAT'S NEW, PART 1, THE STRENGTH ZONE (2:45 to 3:35)

This is the longest single section, because it holds the biggest difference for a HYROX athlete.

| Time | Visual | On-screen text | VO |
|---|---|---|---|
| 2:45 to 2:57 | New skills card #1. A 15-minute timeline with three windows builds | **0-5 1RM SHOULDER TO OVERHEAD / 5-10 2RM BACK SQUAT / 10-15 3RM DEADLIFT** | VO 6a |
| 2:57 to 3:10 | Cut-out: the Chapter 3 worked example box (p12), with a highlight band on the expected averages | **DEADLIFT = AVERAGE OF TWO WINDOWS** | VO 6b |
| 3:10 to 3:25 | Cut-outs layered with gentle parallax: the split jerk focus table (p14) and the drills table (p15) | **SPLIT JERK, PRACTISED 3 TIMES A WEEK** | VO 6c |
| 3:25 to 3:35 | Cut-out: the Chapter 14 "Inside each window" table (p144), with the overhead rows highlighting one after another | **A PLAN FOR EVERY ATTEMPT** | VO 6d |

> **VO 6a:** "The biggest difference is the Strength Zone. HYROX tests strength endurance with sleds and lunges. ATHX tests maximal strength: a one-rep max overhead, a two-rep max back squat and a three-rep max deadlift, with five minutes for each, warm-up included."
>
> **VO 6b:** "The deadlift score is the average of two one-minute windows, and a miss counts as zero. So choosing a safe first weight matters more than chasing a best."
>
> **VO 6c:** "On the overhead you can use a split jerk, which usually lets you lift the most. Our plan builds it with short, frequent practice three times a week, alongside push press, strict press and shoulder stability work."
>
> **VO 6d:** "And because the clock includes your warm-up, you plan every ramp-up single and attempt in advance."

---

### SCENE 7: WHAT'S NEW, PART 2, METCON X (3:35 to 4:10)

| Time | Visual | On-screen text | VO |
|---|---|---|---|
| 3:35 to 3:50 | Cut-out: the MetCon X table from Chapter 1 (p6), building row by row. Then the "Where the time goes" table from Chapter 5 (p20) slides in beside it | **25 MIN CAP, FOR TIME** | VO 7a |
| 3:50 to 4:10 | New skills cards #2 and #3 side by side: **DB BENCH PRESS** (30 reps, new for most HYROX athletes) and **SANDBAG SQUATS INTO THE CARRY** (the same grip and trunk for both, with no break) | as shown | VO 7b |

> **VO 7a:** "MetCon X is the zone that will feel most like HYROX: a for-time workout with a row at each end and loaded work in the middle."
>
> **VO 7b:** "Two parts are new for most HYROX athletes. Thirty dumbbell bench presses, which nothing in HYROX trains. And thirty sandbag squats straight into a carry, where the same grip and trunk do both jobs with no break."

---

### SCENE 8: WHAT'S NEW, PART 3, THE ENDURANCE ZONE (4:10 to 4:35)

Keep this short. It is one part of the story, not the headline.

| Time | Visual | On-screen text | VO |
|---|---|---|---|
| 4:10 to 4:25 | A 24-minute bar: as the RUN segment shortens, the SKI segment grows and "ski metres" counts up | **3 KM RUN, THEN SKI. ONLY SKI METRES SCORE** | VO 8a |
| 4:25 to 4:35 | Cut-out: three rows of the run pace table (p16 to p17) | none | VO 8b |

> **VO 8a:** "In the Endurance Zone you run three kilometres, then ski until twenty-four minutes are up. Only the ski metres score."
>
> **VO 8b:** "So it's a pacing decision. A faster run gives you more time on the ski, but you arrive more tired. The book shows how to find the right balance for you."

---

### SCENE 9: WHY GIVE IT A GO (4:35 to 5:05)

Four short cards, appearing one at a time down the left side of the frame, each with a thin yellow rule as it lands. A soft background layer behind them shows a cut-out of a Week 2 day page (p53) at 25% opacity.

| Card | On-screen text |
|---|---|
| 1 | **YOUR ENGINE TRANSFERS** |
| 2 | **A NEW TEST: MAXIMAL STRENGTH** |
| 3 | **THREE EFFORTS, WITH RECOVERY BETWEEN** |
| 4 | **LESS RUNNING ON THE DAY: 3 KM, NOT 8** |

> **VO:** "So why try it? Your fitness carries over. It gives the strength you've built a test of its own. You get three separate efforts with recovery in between, so you can give your best in each. And there's less running on the day. If you've been racing HYROX for a while, it's a different challenge that uses most of what you've already built."

---

### SCENE 10: HOW TO PREPARE (5:05 to 5:30)

| Time | Visual | On-screen text | VO |
|---|---|---|---|
| 5:05 to 5:13 | The 12-week phase bar builds | **12 WEEKS, 4 PHASES** | VO 10a |
| 5:13 to 5:22 | Three cut-outs in sequence, each held for about 3 s: the Week 5 Wednesday day page (p79, heavy lower), the Week 2 Tuesday ATHX Triangle page (p54), the Week 6 Saturday "Ski the remainder" page (p90) | small labels: **HEAVY STRENGTH**, **ATHX TRIANGLE**, **RUN AND SKI** | VO 10b |
| 5:22 to 5:30 | Both covers side by side (front cover PDFs), with a slow push-in | **ATHX 2027: THE COMPLETE TRAINING SYSTEM** / MEN'S EDITION · WOMEN'S EDITION | VO 10c |

> **VO 10a:** "If you want to try it, the plan runs for twelve weeks."
>
> **VO 10b:** "It adds the heavy lifting and the new MetCon movements to the kind of engine work you already do, with every day set out: the session, what to eat and drink, and how to recover."
>
> **VO 10c:** "It's in the ATHX 2027 books, in a men's and a women's edition, and in the HybridX app."

---

### SCENE 11: END CARD (5:30 to 5:40)

Black plate with the HybridX logo (official file), **hybridx.club** and the disclaimer from Part 1 in 60% white at a legible size. The music resolves.

### YouTube chapters

```
0:00 Introduction
0:26 Two different formats
1:15 How each event is scored
1:50 What carries over from HYROX
2:45 What's new: the Strength Zone
3:35 What's new: MetCon X
4:10 What's new: the Endurance Zone
4:35 Why give it a go
5:05 How to prepare
```

---

## Part 4: Optional portrait cut-down (about 60 seconds)

Build this from the same graphics, re-laid out natively for 9:16 rather than cropped. Captions are burned in.

| Time | Visual | Caption | VO |
|---|---|---|---|
| 0:00 to 0:04 | The HYROX race map (vertical, top half) and the ATHX timeline (bottom half) draw together | **HYROX vs ATHX** | "HYROX athletes: here's how ATHX compares." |
| 0:04 to 0:12 | The top half collapses, leaving the ATHX timeline with its three blocks labelled | **3 zones, not 1 race** | "Instead of one continuous race, ATHX is three separate tests in an afternoon." |
| 0:12 to 0:20 | Placing boxes sum to a total | **Placings added together** | "Each zone is ranked, and your placings are added together." |
| 0:20 to 0:32 | A short carry-over map (SkiErg, rower, burpees, sandbag) | **Your engine carries over** | "Your ski, row, burpees and sandbag work all carry over." |
| 0:32 to 0:46 | Strength timeline, then the split jerk table cut-out | **New: max strength** | "What's new is a strength zone: a heavy overhead lift, squat and deadlift." |
| 0:46 to 0:54 | DB bench and sandbag squat cards | **New: DB bench, squats into a carry** | "Plus dumbbell bench and sandbag squats straight into a carry." |
| 0:54 to 1:02 | Both covers, then the end card | **12-week plan. Link in bio.** | "The full twelve-week plan is in the ATHX 2027 books. Link in bio." |

---

## Part 5: Assets, page index and the Claude Code prompt

### 5.1 Files to supply

| File | Use |
|---|---|
| `ATHX-2027-Mens.pdf`, `ATHX-2027-Womens.pdf` (colour editions) | Page cut-outs |
| `ATHX-2027-Mens-FRONT.pdf`, `ATHX-2027-Womens-FRONT.pdf` | Covers |
| `ATHX-2027-Mens-Volume-Progression.pdf` | Optional background texture in Scene 10 |
| Official HybridX logo files | End card |
| Space Grotesk and Inter font files | All type |
| App screenshots or screen recording of the ATHX programme (optional) | Scene 10 |
| Voiceover WAV files, one per scene | Narration |
| Licensed music track and licence | Score |
| This brief and `ATHX-2027-Video-Brief-and-Storyboards.md` | Standards and facts |

### 5.2 Page index (men's colour edition, 158 pages)

Render with `pdftoppm -r 300 -f N -l N -png ATHX-2027-Mens.pdf out` and crop to the element. The women's edition has the same structure and two more pages, so confirm its page numbers before using it.

| Page | Content | Used in |
|---|---|---|
| 5 | Chapter 1 opener, Strength Zone window table | Scene 6 (optional) |
| 6 | MetCon X element table | Scene 7 |
| 9 | Scoring: specialist against all-rounder table | Scene 4 |
| 11 | Chapter 3 opener | Scene 6 (optional) |
| 12 | "A worked example" deadlift box | Scene 6 |
| 13 | "Why the plan uses the split jerk", "How much difference it makes" box | Scene 6 (optional) |
| 14 | "Earn the load" box, split jerk focus by week table | Scene 6 |
| 15 | Drills table | Scene 6 |
| 16 to 17 | Run pace and ski distance tables | Scene 8 |
| 20 | "Where the time goes" MetCon X table | Scene 7 |
| 21 | Sandbag squats into the carry | Scene 7 (optional) |
| 28 to 29 | Weekly shape table, four phases table | Scene 10 (optional) |
| 30 | Tuesdays and Saturdays table | Scene 10 (optional) |
| 31 | The twelve Fridays table | Scene 10 (optional) |
| 53 | Week 2 Monday day page (split jerk session) | Scene 9 background |
| 54 | Week 2 Tuesday, ATHX Triangle benchmark | Scene 10 |
| 79 | Week 5 Wednesday, heavy lower and jerk skill | Scene 10 |
| 90 | Week 6 Saturday, Ski the remainder | Scene 10 |
| 144 | Chapter 14 "Inside each window" table | Scene 6 |
| 152 to 153 | Division loads appendix | Optional |

### 5.3 Prompt to paste into Claude Code

Save this brief as `VIDEO-BRIEF-HYROX-ATHX.md` and the first brief as `VIDEO-BRIEF.md` in the project folder with the assets, then paste this:

```text
You are a professional motion designer and video editor. Build an
animation-only comparison video, "HYROX or ATHX?", following
VIDEO-BRIEF-HYROX-ATHX.md exactly, with the brand, motion, audio and
language standards from Part 1 of VIDEO-BRIEF.md. There is no filmed
footage. Read both briefs fully before doing anything.

Deliverables
1. Main video, 16:9, 1920x1080 (4K master if practical), 25 fps, about 5:30,
   per Part 3 of the brief, plus an SRT caption file and a thumbnail PNG.
2. Optional 9:16 cut-down, 1080x1920, about 60 s, per Part 4, with
   burned-in captions inside the Reels safe zone.

Tooling
- Remotion (React) for all graphics and composition; ffmpeg for audio
  mixing, loudness normalisation, encoding and checks. Fall back to Python
  (Pillow + MoviePy) + ffmpeg only if Remotion cannot run.
- Render book pages from the colour PDFs with pdftoppm at 300 dpi, then
  crop to the elements listed in Part 5.2. Do not redraw or retype book
  content; use the real page renders.
- Build the new diagrams in Part 2.5 as vector components with shared
  style tokens (colours, type, stroke widths, easing), so both aspect
  ratios use the same components.

Non-negotiables
- No HYROX, ATHX or adidas logos, typefaces, colour schemes or event
  imagery. HYROX content uses neutral grey, never yellow.
- No AI-generated images, stock icons or clip art. Equipment pictograms,
  if used, are drawn as a consistent monoline set per Part 2.5.
- Motion: eased fade and rise, row-by-row table builds, constant-speed
  line draws, straight cuts within scenes, 10-frame dissolves between
  scenes. No bounce, overshoot, per-letter, typewriter, glitch, shake,
  particles, light leaks, 3D flips or zoom punches.
- At most one yellow highlight per shot. Eight words maximum on screen
  outside tables. Hold every finished graphic for at least 1.5 s.
- No em dashes in on-screen text or captions. British spelling.
- Respectful, factual tone towards HYROX throughout.
- Every number and rule must match Part 6 of the brief. If anything is
  unclear, ask rather than invent.

Working method (stop for my approval at each gate)
Gate 1: Inventory the assets. Render and crop every cut-out in Part 5.2 and
        show me a contact sheet. Confirm the brand yellow from the logo
        files. List anything missing.
Gate 2: Build the design system and diagram components. Render a still of
        each diagram and a 10 s motion test of the race map, the ATHX
        timeline, the carry-over map and a table build. Wait for approval.
Gate 3: Animatic: the full main video at 720p with the voiceover laid in
        (or a temporary read if the VO is not ready), correct timings and
        no final polish. Wait for notes.
Gate 4: Final main video: polish, music mix to spec, captions (SRT),
        thumbnail. Run checks: ffprobe (resolution, fps, duration),
        loudnorm measurement (-14 LUFS integrated, -1 dBTP), and a contact
        sheet of one frame every 2 s to confirm legibility and that no
        text collides.
Gate 5 (if requested): Build the 9:16 cut-down natively from the same
        components, with burned-in captions, and run the same checks plus a
        safe-zone overlay check.

Keep EDIT-LOG.md with decisions, component names and anything that needs
my input.
```

---

## Part 6: Fact sheet (everything on screen must match this)

### HYROX (2026/27 Singles rulebook)

- **Format:** a 1 km run followed by one station, repeated 8 times: 8 km of running and 8 stations in a fixed order.
- **Stations, in order:** SkiErg 1,000 m. Sled Push 50 m. Sled Pull 50 m. Burpee Broad Jumps 80 m. Rowing 1,000 m. Kettlebell Farmers Carry 200 m. Sandbag Lunges 100 m. Wall Balls 100 reps.
- **Scoring:** total time, including the runs, stations and Roxzone transitions, plus any time penalties. Ranked by fastest time within each division, with age-group rankings.
- **Divisions:** Open and Pro (singles), Doubles and Relay.
- **Loads (if shown):**

| Station | Women Open | Women Pro / Men Open | Men Pro |
|---|---|---|---|
| Sled Push (incl. sled) | 102 kg | 152 kg | 202 kg |
| Sled Pull (incl. sled) | 78 kg | 103 kg | 153 kg |
| Farmers Carry | 2 x 16 kg | 2 x 24 kg | 2 x 32 kg |
| Sandbag Lunges | 10 kg | 20 kg | 30 kg |
| Wall Balls | 4 kg | 6 kg | 9 kg |

  Wall ball target: 2.70 m (women), 3.00 m (men).
- **Typical duration:** about 60 to 100 minutes for most age-group athletes (HybridX knowledge base). The video uses this range only, with no record times.

### ATHX 2027 (published workout specifications and movement standards)

- **Format:** three separately scored zones in about 2.5 hours, with recovery between them. The zone order and gap lengths are set by each event.
- **Strength (15 min individual, 20 min pairs):** 0 to 5 min 1RM Shoulder to Overhead (press, push press, push jerk or split jerk; feet must finish in line). 5 to 10 min 2RM Back Squat. 10 to 15 min 3RM Deadlift: two 1-minute windows, averaged, with a missed window scoring zero. Score: total kilograms.
- **Endurance (24 min cap):** 3 km run (Lite 2.4 km for pairs), then max SkiErg distance. Score: ski metres only.
- **MetCon X (25 min cap, for time):** Row (45 cal men / 35 cal women, individual ATHX), 30 DB ground to overhead, 30 DB bench press, 30 sandbag squats, 30 m sandbag carry, 30 burpees over a bench, then the row again. ATHX loads: DB 20 kg / 12.5 kg, sandbag 50 kg / 30 kg.
- **Scoring across zones:** placings added together, lowest total wins. Example: 1st, 1st, 40th = 42 against 12th, 14th, 15th = 41.
- **Divisions:** Lite, ATHX and Pro. Individuals and pairs.
- **Working time:** about 69 minutes of work across the three zones.

### The HybridX plan

- *ATHX 2027: The Complete Training System*, Men's Edition and Women's Edition (the women's edition adds cycle-aligned blocks). Also in the HybridX app.
- 12 weeks: Base 1-4, Development 5-8, Specific 9-11, Taper 12. Deloads in Weeks 4 and 8.
- A split jerk practised three times a week. The ATHX Triangle benchmark in Weeks 2 and 10. Benchmarks in Weeks 1 and 9.
- Every day sets out the session, fuel, hydration, recovery, a teaching note and a log.

### Do not state

Event dates, venues, prices, prize money, participant numbers, world records, or any endorsement by either event.

**Sources:** [HYROX 26/27 Singles Rulebook](https://hyroxbenelux.com/wp-content/uploads/2026/06/26_27_HYROX_RulebookSingles_EN_FINAL.pdf) · [ATHX 2027 Workouts](https://athxgames.com/workouts/2027) · [ATHX 2027 Movement Standards](https://athxgames.com/movement-standards/2027)
