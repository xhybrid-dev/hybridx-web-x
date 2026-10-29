# HYROX or ATHX? Animated Video Production Plan

Oct 29, 2026 · @Jon lee

## Overview

The video is **HYROX or ATHX?**, a 5:15 to 5:45 landscape animation (plus an optional 60-second portrait cut) that shows HYROX athletes how ATHX compares, then points them to the ATHX 2027 books and the HybridX app. There is no filmed footage: animated diagrams, cut-outs from the book pages and Jon's voiceover carry it.

Three documents work together:

| Document | Answers | Holds |
| --- | --- | --- |
| ATHX-vs-HYROX-Animated-Video-Brief.md | What goes on screen | Storyboard, visual system, page index, fact sheet |
| HybridX-Video-Production-Scope.md | How it gets built | Tools, folder structure, design tokens, component library, Gates 0 to 5, QA |
| This plan | In what order, and who does what | Fixes to make first, Jon's prep list, phased tasks, VO script, kick-off prompt |

**Build route:** Claude Code with Remotion (React) for all graphics and composition, FFmpeg for audio and encoding, and Poppler for the book page renders. This is the right video to make first of the three HybridX videos, because it needs no filming and builds most of the shared components.

## Fix before production starts

The brief is close to ready: every page reference but one matches the men's book, and the fact sheet matches both books and ATHX's published 2027 workouts. Nine things need settling first, three of them before Jon records the voiceover.

| # | Issue | Where | Fix | Settle by |
| --- | --- | --- | --- | --- |
| 1 | The project holds the `-print.pdf` editions. The brief needs the colour editions, both FRONT cover PDFs and the Volume-Progression PDF | Brief 5.1 | Confirm the print PDFs are the colour interiors and rename them `ATHX-2027-Mens.pdf` / `ATHX-2027-Womens.pdf`; add the three missing PDFs | Gate 1 |
| 2 | `ATHX-2027-Video-Brief-and-Storyboards.md` is cited for the Part 1 brand, motion and audio standards but is not in the project | Brief header and 5.3 prompt | Add it to the folder, or use the kick-off prompt in this plan, which points to the scope instead | Gate 0 |
| 3 | Brand yellow is "expected" as `#C8FF00`, which is a lime rather than a yellow, and is not yet confirmed | Brief 2.2, scope 4.1 | Sample it from the official logo files before `tokens.ts` is written | Gate 0 |
| 4 | The drills table is on p14, not p15. Page 15 holds "If your split jerk is not ready" and the competition rules | Brief 5.2, Scene 6 | Crop both the split jerk focus table and the drills table from p14 | Gate 1 |
| 5 | The women's edition is 161 pages, three more than the men's, not two. The new Chapter 13 ("Aligning the Block") shifts everything from p43 | Brief 5.2 | Women's page = men's page up to p42, then men's + 3 (Inside each window p147, Week 2 Monday p56, Week 6 Saturday p93) | Gate 1 |
| 6 | "About 69 min of work" overstates an individual's work. 69 is the sum of the zone slots (Strength 20 + Endurance 24 + MetCon X 25), and individuals lift for 15 of the 20 | Scene 3c on-screen text | Use "3 ZONES, 69 MIN ON THE CLOCK" or "UP TO 64 MIN OF WORK" | Before recording |
| 7 | "Three separate tests in one afternoon": start times and zone order are set by each event | VO 3b | Say "three separate tests in about two and a half hours" | Before recording |
| 8 | Three VO lines run longer than their shots at a natural 150 words a minute: 6a (16 s in a 12 s shot), 8b (12 s in 10 s) and 10b (14 s in 9 s) | Scenes 6, 8, 10 | Keep the words and move the cuts inside each scene (see the build sheet). Scene 10 needs one extra second | Before recording |
| 9 | The p6 MetCon X cut-out shows men's loads only, in a video for all HYROX athletes | Scene 7 | Place the women's p6 table beside it, or crop to the element names and reps | Gate 1 |

The books carry the same 69-minute line (men's p33, p87 and p138), so it is worth correcting in the next print revision too. The 20/24/25-minute zone slots are confirmed in [BLK BOX's 2027 workouts summary](https://www.blkboxfitness.com/blogs/education/athx-2027-workouts-everything-you-need-to-know); BLK BOX is ATHX's equipment partner.

## What Jon needs to supply

Only the logo files and fonts are needed to start. The voiceover and music are not needed until the animatic at Gate 3, so they can be recorded and sourced while the components are built.

**Before Gate 0 (setup)**

- [ ] Official HybridX logo files, SVG plus a PNG, into `assets/brand/`
- [ ] Space Grotesk (500, 700) and Inter (400, 600) font files into `assets/fonts/` (both free from Google Fonts)
- [ ] Decide whether Claude Code runs on your own machine (needs Node 22, FFmpeg and Poppler) or in a cloud session
- [ ] Add the companion brief, or accept the scope as the standard (issue 2)

**Before Gate 1 (assets)**

- [ ] Colour interior PDFs for both editions (issue 1)
- [ ] Front cover PDFs for both editions
- [ ] Volume-Progression PDF, if you want it as the Scene 10 background
- [ ] Optional: a short screen recording of the ATHX programme in the HybridX app, for Scene 10
- [ ] Decide whether the 60-second portrait cut-down is in scope

**Before recording the voiceover**

- [ ] Approve the script changes in issues 6 to 8
- [ ] Record one WAV per scene (nine files: Scenes 1, 3 to 10), 48 kHz, 24-bit, in a quiet room with a lav or dynamic mic, two seconds of silence between paragraphs

**Before Gate 3 (animatic)**

- [ ] One licensed music track, 95 to 115 BPM, no vocals, at least 6 minutes or cleanly loopable, plus its licence file

## Production phases and review gates

Claude Code builds the video in six gated steps and stops at each one until Jon signs it off. Jon's inputs only have to arrive in step with the gate that needs them.

&#91;embedded content: production gates · 6 steps, from the scope's Section 7\]

The voiceover and music are not needed until Gate 3, so they can be recorded and sourced while Gates 1 and 2 run. A rough guide to effort: one Claude Code session each for Gates 0, 1 and 5, one or two each for Gates 3 and 4, and two or three for Gate 2, where most of the components are built.

## Scene-by-scene build sheet

Eleven scenes use 15 of the scope's components plus 13 book cut-outs and both covers. One component is missing from the scope's library: the new skills cards in Scenes 6 and 7, so add a `SkillCard` (title, one line, small cut-out) at Gate 2.

| Scene | Time | Components | Cut-outs (men's page) |
| --- | --- | --- | --- |
| 1 Opening | 0:00-0:20 | `RaceMap`, `ZoneTimeline` | none |
| 2 Title | 0:20-0:26 | `TitleCard` | none |
| 3 Two formats | 0:26-1:15 | `RaceMap` with station labels, `ZoneTimeline` opening into cards, `Callout` | none |
| 4 Scoring | 1:15-1:50 | `ScoringDiagram`, `CountUp`, `CutOut` | p9 specialist and all-rounder table |
| 5 Carry-over | 1:50-2:45 | `CarryOverMap`, `SectionLabel`, `Pictogram` (optional) | none |
| 6 Strength Zone | 2:45-3:35 | `WindowTimeline`, `SkillCard`, `CutOut` with highlight band and parallax | p12 worked example; p14 focus and drills tables; p144 inside each window |
| 7 MetCon X | 3:35-4:10 | `CutOut` row build, `SkillCard` x2 | p6 MetCon X table (plus women's p6); p20 where the time goes |
| 8 Endurance Zone | 4:10-4:35 | `SplitBar`, `CountUp` | p16 run pace table, three rows |
| 9 Why give it a go | 4:35-5:05 | `Callout` x4, `Plate` with page texture | p53 Week 2 Monday at 25% |
| 10 How to prepare | 5:05-5:30 | `PhaseBar`, `CutOut` sequence, `CoverPair` | p79, p54, p90; both covers |
| 11 End card | 5:30-5:40 | `EndCard` | none |

**Retiming to fit the voiceover.** Keep every word and move the cuts inside three scenes. Final cuts follow Jon's real read at Gate 3.

| Scene | Shot | Brief | New | VO at 150 wpm |
| --- | --- | --- | --- | --- |
| 6 | 6a windows | 2:45-2:57 | 2:45-3:01 | 16 s |
| 6 | 6b deadlift | 2:57-3:10 | 3:01-3:13 | 11 s |
| 6 | 6c split jerk | 3:10-3:25 | 3:13-3:28 | 15 s |
| 6 | 6d attempts | 3:25-3:35 | 3:28-3:35 | 6 s |
| 8 | 8a format | 4:10-4:25 | 4:10-4:21 | 8 s |
| 8 | 8b pacing | 4:25-4:35 | 4:21-4:35 | 12 s |
| 10 | 10a phases | 5:05-5:13 | 5:05-5:11 | 5 s |
| 10 | 10b day pages | 5:13-5:22 | 5:11-5:25 | 14 s |
| 10 | 10c covers | 5:22-5:30 | 5:25-5:32 | 7 s |

The end card then runs 5:32 to 5:42, still inside the 5:15 to 5:45 target. If Jon reads slower than 150 words a minute, Scene 6 is the one to watch: dropping "HYROX tests strength endurance with sleds and lunges" from 6a saves about 3 seconds.

**One motion note.** Scene 9 asks for a yellow rule under each of the four cards, which breaks the one-yellow-per-shot rule once all four are up. Draw each rule yellow as it lands, then settle it to white, as the carry-over lines do.

&#91;embedded content: word counts from the brief's script with fix 7 applied, read at 150 words a minute\]

At scene level the script fits, so the three long lines are fixed by moving cuts inside their scenes rather than cutting words. Scene 6 is the tightest at 48 of 50 seconds, and Scene 10 borrows two seconds from the runtime.

## Voiceover recording script

The script is 625 words, about 4 minutes 10 seconds of speech at a natural 150 words a minute, which leaves room to breathe inside the 5:40 runtime. It is the brief's script with the issue 7 fix applied to 3b.

**Recording notes**

- Save one file per scene in `assets/audio/vo/`: `vo-s01.wav`, `vo-s03.wav` and so on to `vo-s10.wav` (Scenes 2 and 11 have no voice).
- Leave two seconds of silence between paragraphs, and record two takes of any line you stumble on rather than patching words.
- Pick one way of saying ATHX and keep it for the whole read. Times in brackets are targets, not limits.

**Scene 1 · Opening** (16 s)

1: If you race HYROX, you already have a lot of what ATHX asks for. But the two events are built very differently. This video compares them side by side: how they work, how they're scored, what carries over, and what's new.

**Scene 3 · Two different formats** (30 s)

3a: HYROX is one continuous race. You run a kilometre, do a station, and repeat that eight times. The clock doesn't stop until you finish.

3b: ATHX is three separate tests in about two and a half hours. There's a strength zone with three heavy lifts, an endurance zone with a run and a ski, and a timed workout called MetCon X.

3c: So instead of one long effort, you get three shorter ones with a break between each.

**Scene 4 · How each is scored** (23 s)

4a: HYROX is scored on your total time.

4b: In ATHX, each zone is ranked on its own, and your three placings are added together. The lowest total wins.

4c: That means balance matters. An athlete who wins two zones but finishes fortieth in the third scores forty-two. Someone who places twelfth, fourteenth and fifteenth scores forty-one and finishes ahead.

**Scene 5 · What carries over** (36 s)

5a: A lot of your HYROX training transfers straight across. The SkiErg and the rower are both in ATHX. Burpees are there, over a bench instead of a broad jump. The sandbag is there too, as squats straight into a carry. Wall balls and sleds don't appear, but the leg drive and strength they build is a good base for the dumbbell work and the heavy lifts. And you're used to running when you're already tired.

5b: If you're fit enough for HYROX, the engine side of ATHX will feel familiar.

**Scene 6 · The Strength Zone** (48 s)

6a: The biggest difference is the Strength Zone. HYROX tests strength endurance with sleds and lunges. ATHX tests maximal strength: a one-rep max overhead, a two-rep max back squat and a three-rep max deadlift, with five minutes for each, warm-up included.

6b: The deadlift score is the average of two one-minute windows, and a miss counts as zero. So choosing a safe first weight matters more than chasing a best.

6c: On the overhead you can use a split jerk, which usually lets you lift the most. Our plan builds it with short, frequent practice three times a week, alongside push press, strict press and shoulder stability work.

6d: And because the clock includes your warm-up, you plan every ramp-up single and attempt in advance.

**Scene 7 · MetCon X** (25 s)

7a: MetCon X is the zone that will feel most like HYROX: a for-time workout with a row at each end and loaded work in the middle.

7b: Two parts are new for most HYROX athletes. Thirty dumbbell bench presses, which nothing in HYROX trains. And thirty sandbag squats straight into a carry, where the same grip and trunk do both jobs with no break.

**Scene 8 · The Endurance Zone** (20 s)

8a: In the Endurance Zone you run three kilometres, then ski until twenty-four minutes are up. Only the ski metres score.

8b: So it's a pacing decision. A faster run gives you more time on the ski, but you arrive more tired. The book shows how to find the right balance for you.

**Scene 9 · Why give it a go** (25 s)

9: So why try it? Your fitness carries over. It gives the strength you've built a test of its own. You get three separate efforts with recovery in between, so you can give your best in each. And there's less running on the day. If you've been racing HYROX for a while, it's a different challenge that uses most of what you've already built.

**Scene 10 · How to prepare** (26 s)

10a: If you want to try it, the plan runs for twelve weeks.

10b: It adds the heavy lifting and the new MetCon movements to the kind of engine work you already do, with every day set out: the session, what to eat and drink, and how to recover.

10c: It's in the ATHX 2027 books, in a men's and a women's edition, and in the HybridX app.

## Risks and mitigations

The biggest risk is the source PDFs: every cut-out depends on them, and the project only holds the print editions so far.

| Risk | Effect | Mitigation |
| --- | --- | --- |
| The print PDFs are greyscale or CMYK print interiors | Cut-outs lose the edition colours and look muddy on near-black | Export RGB colour PDFs from the book pipeline; check the Gate 1 contact sheet before any animation |
| Table text in cut-outs is too small on a phone | Viewers cannot read the evidence the VO points to | Crop to single elements at 300 dpi, never scale below 100%, and check the 20 px minimum on the Gate 4 contact sheet |
| ATHX revises a standard before publication | An on-screen number goes out of date | Every figure lives in `facts.ts`; recheck the published workouts and standards the week the video goes live, then re-render |
| The VO is recorded in an echoey room | The clean-up chain cannot rescue it | Record a 30-second test first and run it through the scope's VO chain at Gate 1 before recording the rest |
| The music triggers a YouTube Content ID claim | Monetisation or blocking on upload | Keep the licence file and register the channel with the music provider before publishing |
| HybridX grows past three people | Remotion's free licence no longer applies | Buy a Remotion company licence or port the components to HyperFrames; the design tokens and data do not change |
| HybridX yellow sits close to HYROX yellow | Viewers read a HYROX association | Keep HYROX content grey throughout, and yellow on HybridX's own highlights only, as the brief already requires |

The Remotion terms were confirmed on the [Remotion licence FAQ](https://www.remotion.dev/docs/license/faq): free for for-profit organisations of up to three employees.

## Kick-off prompt for Claude Code

This prompt replaces the ones in brief Part 5.3 and scope Section 11, and carries the corrections from this plan so the brief does not need editing first. Save the scope as `VIDEO-PRODUCTION-SCOPE.md` and the brief as `VIDEO-BRIEF-HYROX-ATHX.md` in the project folder with the assets, then paste it in.

```text
You are working as a senior motion graphic designer and video editor for
HybridX Club. Read VIDEO-PRODUCTION-SCOPE.md in full, then
VIDEO-BRIEF-HYROX-ATHX.md. The scope says how to build; the brief says
what to build. Where the brief refers to Part 1 of VIDEO-BRIEF.md, use
Sections 2, 4 and 6 of the scope instead.

Build the HYROX or ATHX? comparison video with Remotion (React), FFmpeg
and Poppler exactly as the scope sets out: the project structure in
Section 3, the design system in Section 4, the component library in
Section 5 and the asset pipeline in Section 6. Every figure comes from
src/data/facts.ts, which you write from Part 6 of the brief.

Apply these corrections to the brief:
1. Crop the split jerk drills table from men's p14, not p15.
2. Women's page numbers equal the men's up to p42, then men's + 3.
3. Scene 3c, ATHX summary card: "3 ZONES, 69 MIN ON THE CLOCK".
4. VO 3b says "in about two and a half hours", not "in one afternoon".
5. Retimed shots: 6a 2:45-3:01, 6b 3:01-3:13, 6c 3:13-3:28,
   6d 3:28-3:35; 8a 4:10-4:21, 8b 4:21-4:35; 10a 5:05-5:11,
   10b 5:11-5:25, 10c 5:25-5:32; end card 5:32-5:42. Final cuts
   follow the recorded voiceover at Gate 3.
6. Add a SkillCard component (title, one line, small cut-out) for
   Scenes 6 and 7.
7. Scene 7: place the women's p6 MetCon X table beside the men's.
8. Scene 9: each card's rule lands yellow, then settles to white.

Work through the gates in Section 7 of the scope and stop at each one
for my review. Start with Gate 0:
- check the environment (Node 22, FFmpeg, Poppler, a Remotion test
  render),
- create the folder structure,
- write tokens.ts and facts.ts,
- sample the brand yellow from the logo files in assets/brand and
  report the hex,
- check the PDFs in assets/pdf: RGB colour or not, and page counts of
  158 (men's) and 161 (women's),
- list anything you need from me.

Keep EDIT-LOG.md up to date with decisions and open questions. Do not
invent facts, use AI-generated imagery, or use any HYROX, ATHX or adidas
branding. No em dashes in on-screen text or captions. British spelling.
```

## Next steps

- [ ] Settle issues 1 to 3, then put the logo files and fonts in the project folder
- [ ] Paste the kick-off prompt into Claude Code to run Gate 0
- [ ] Approve the script changes and record a 30-second voiceover test

## Sources

- Project files: ATHX-vs-HYROX-Animated-Video-Brief.md, HybridX-Video-Production-Scope.md, ATHX-2027-Mens-print.pdf, ATHX-2027-Womens-print.pdf
- [ATHX 2027 Workouts: Everything You Need to Know](https://www.blkboxfitness.com/blogs/education/athx-2027-workouts-everything-you-need-to-know), BLK BOX
- [Remotion licence FAQ](https://www.remotion.dev/docs/license/faq)
