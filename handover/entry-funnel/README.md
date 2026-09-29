# HybridX entry funnel: handover package

A guided plan finder for hybridx.club that sits **in front of the existing homepage** and can be **skipped** in one click, with every response kept
(anonymously) and analysed in the admin: how people visit, what attracts them, what puts them off, and how to improve.

This package is for Claude Code. Give it the whole folder.

## Start in 60 seconds

1. Open `dist/entry-demo.html` in a browser. The funnel is on top, a stand-in for the existing homepage is below it, and "Skip to the homepage" is top right.
   Try the questions, the result, the feedback question and the skip. (Tracking is off in this demo, so the feedback question and the "why did you skip" row are hidden. `dist/index.html` is the same funnel as a stand-alone page.)
2. Run `node scripts/demo-report.js` to see what the admin analytics will show, from synthetic traffic.
3. Read `CLAUDE_CODE_BRIEF.md`.

## How to hand it to Claude Code

Unzip the package into the website repo (for example as `handover/entry-funnel/`), open Claude Code in the repo, and say:

> Read `handover/entry-funnel/CLAUDE_CODE_BRIEF.md` and follow it. Start with step 0 (explore the repo and write your findings), show me a short plan, and ask me the questions in section 5 that block phase 1. Do not change the existing homepage content.

## Before Claude Code starts, the owner should have answers to

1. **Consent.** Does the site have a cookie banner, and should the tracking wait for it? (Default: yes, wait.)
2. **The two unconfirmed products.** The real links for the ATHX 2027 book and ULTRA STRENGTH.
3. **Launch as a 50/50 experiment** (entry vs plain homepage) for four weeks? (Default: yes.)
4. **Keep the free-text note** from question 5, scrubbed? (Default: yes.)

Everything else has a default in the brief and can be settled while the work is under way.

## What is in the box

| Path | What it is |
| --- | --- |
| `CLAUDE_CODE_BRIEF.md` | The master brief: rules, phases, gates, decisions, commands |
| `docs/` | 01 business plan (original) · 02 funnel spec · 03 entry integration · 04 tracking and data model · 05 admin analytics · 06 privacy and retention · 07 brand and design · 08 acceptance checklist |
| `data/` | `funnel.json` (all content and the product catalog), `routing.js` (rules), `events.schema.json` (tracking contract), tests |
| `server/` | `collect-core.js`: validates and scrubs tracked batches, with tests |
| `admin/` | `rollup.js`, `report.js`, `insights.js`: daily rollup, merging, derived numbers, "how to improve" rules; `seed.js`: fake traffic; tests |
| `src/`, `build.js`, `dist/` | Reference implementation (plain HTML, CSS, JS) and its build output |
| `test.js`, `scripts/` | Browser tests, brand and layout audit for any URL, demo report |
| `examples/` | Sketches for the Next.js collector route, rollup job, Firestore rules, environment and the monthly Claude review prompt. **Not executed** |
| `screenshots/` | The reference at each state, at desktop and phone widths |
| `assets/`, `sources/` | Logos and test fonts; the designer brief and the original strategy summary |

## Status, honestly

- **Verified here:** routing over every answer combination; the collector and rollup logic (74 unit tests); the reference page in a real browser at 1440, 820 and 390 wide, including brand and layout audits, the skip behaviours, tracking on and off, and that everything the tracker sends passes the collector.
- **Not verified:** anything against the real repo, real Firestore, the real admin, or real traffic. The `.ts` files in `examples/` have never been run.
- **Unconfirmed content:** two catalog rows (ATHX 2027 and ULTRA STRENGTH links). Product choices in the routing come from the owner's notes, not sales data.
- **Not legal advice:** `docs/06-privacy-and-retention.md` is a checklist and draft wording.

## Commands

```bash
npm install                                            # playwright-core only
npm run build                                          # dist/*.html
npm run test:unit                                      # 74 tests, no browser
CHROMIUM_PATH=/path/to/chrome npm run test:browser     # browser checks (needs a Chromium)
node scripts/demo-report.js [--json] [--healthy]       # what the admin will show
CHROMIUM_PATH=/path/to/chrome node scripts/audit-url.js http://localhost:3000/
```
