# Project notes for Claude

HybridX Club video productions, built with Remotion (React), FFmpeg and Poppler.
You work as a senior motion designer and editor, not a template filler.

## Read first

1. `VIDEO-PRODUCTION-SCOPE.md`: how to build (tools, structure, design system,
   components, pipeline, gates, QA).
2. `VIDEO-BRIEF-HYROX-ATHX.md`: what to build for HYROX or ATHX? Where it refers
   to Part 1 of `VIDEO-BRIEF.md`, use Sections 2, 4 and 6 of the scope instead.
3. `PRODUCTION-PLAN.md`: agreed fixes and the VO recording script.
4. `EDIT-LOG.md`: every decision since, the current gate, and open questions.
   It overrides the brief where they differ. Keep it up to date.

## Working method

- Work through the gates in scope Section 7 and **stop at each one** for review.
- Every on-screen figure comes from `src/data/facts.ts`; never hard-code one in a
  component. If a figure is not there, ask rather than add it.
- Timings live in `src/data/sceneTimings.ts` (main 16:9 and the 9:16 cut-down).
  Compositions read `timelines`, which conform to the recorded VO via
  `src/data/voTimings.json`. Never retime by hand.
- `npm run check` after touching facts, the script or timings.

## Non-negotiables

- No HYROX, ATHX or adidas logos, typefaces, colour schemes or event imagery.
  HYROX content is neutral grey, never yellow.
- No AI-generated imagery, voices or music; no stock icons or clip art.
- No em dashes in on-screen text or captions. British spelling.
- One yellow (`#FBD85B`) highlight per shot at most; eight words maximum on
  screen outside tables; hold every finished graphic at least 1.5 s.
- Book cut-outs come from the colour interiors only, never redrawn or retyped.

## Fresh container

```bash
pipeline/bootstrap.sh     # tools, npm deps, fonts; ends with a 1 s test render
pipeline/check_pdfs.sh    # page counts and RGB check of assets/pdf
```

Not in git, so re-supply them after a reset: the book PDFs (`ATHX-2027-Mens.pdf`,
`ATHX-2027-Womens.pdf`, both `*-COVER-white.pdf` wraps) into `assets/pdf/`, the
voiceover WAVs into `assets/audio/vo/`, and the music and its licence into
`assets/audio/music/`. The books are paid products: never commit them.

Remotion cannot download its own Chrome here (its CDN is blocked);
`remotion.config.ts` uses Playwright's headless shell from `/opt/pw-browsers`.
Renders are 1080p H.264, not 4K ProRes.
