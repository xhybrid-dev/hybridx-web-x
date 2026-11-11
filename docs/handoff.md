# Hand-off: the content engine, 11 November 2026 (updated after step 11)

For the next session, which has this repo (`xhybrid-dev/hybridx-web-x`) and the app
(`xhybrid-dev/hybridx-app`). Read this, then `CLAUDE.md` and
`docs/content-engine-plan.md` (the plan of record: steps, decisions D1–D11,
designs). Jon Lee is the owner and HybridX trainer; he reviews and merges every PR.

## Where things stand

| Step | What | State |
|---|---|---|
| 1 | Facts registry (`src/lib/facts/`) | Live |
| 2–3 | Guides in Firestore, review pages, Mon/Wed/Fri 07:00 slots | Live |
| 4 | Drafting engine (Gemini writes, Claude reviews, hourly job) | Live, `CONTENT_ENGINE_MODE` on since 10 Nov |
| 4b | Links between articles: related, back-links Jon approves, pillar lists | Live |
| 5 | Week planner `/calculators/week-planner` | Live |
| 6 | Search Console weekly harvest, `/admin/guides/search` | Live, access confirmed |
| 7 | Performance page `/admin/guides/performance`, click counter `/api/guides/out` | Live |
| 8 | Strength and engine test `/calculators/strength-engine-test` | Live (PR #38) |
| 9 | HYROX pacer `/calculators/hyrox-pacer` | Live (PR #38) |
| 10 | Keyword Planner volumes | Live (PR #38), off until Jon's setup |
| 11 | App hand-off, both repos | **Built on `claude/pensive-meitner-rpv3pp` in both repos, waiting to merge** |
| 12 | 90-day review | Around early February 2027 |

Work branch in both repos: `claude/pensive-meitner-rpv3pp`. Once merged,
restart it from the default branch before new work.

## Waiting on Jon

- **Merge step 11 in both repos** (either order: each side tolerates the other
  being older). Then the two live checks in the plan's step 11.
- **Step 11 decisions to confirm:**
  - the tool-to-programme mapping (plan section 7.3);
  - that the app's ATHX 2027 plan is the book's plan (the ATHX page now says so);
  - ATHX plans are set up as written, never condensed to fewer days.
- **ATHX dates in the plan text.** The app lines an ATHX plan up to the
  athlete's own event date, but the programme's notes say "Starts Monday 2
  November 2026" and "week commencing 2026-11-02". For Glasgow, Dublin,
  Birmingham or Liverpool those dates are wrong. Fix in
  `src/data/athx-2027/source` in the app and re-import, or leave for London only.
- **Check PR #38's results:** the strength test's three worked examples give the
  verdicts he would (they are in `strength-engine.test.ts`), and read the planner's
  and the test's session wording (written by Claude on his rules).
- **Keyword Planner setup** (plan, step 10): developer token at Basic access; an
  OAuth Desktop client with the consent screen **In production**; run
  `npx tsx scripts/google-ads-auth.ts`; create and grant the three secrets; send the
  client id and customer id. Then add the bindings to `apphosting.yaml` in one
  change, never before the secrets exist (CLAUDE.md, "Deploy gotchas").
- **Optional:** 14-day admin sign-in (IAM grant, plan step 3), a Gemini budget
  alert, `ANTHROPIC_API_KEY` for the second review.
- **Pacer:** the strongest/weakest-station adjustment needs his numbers.

## Step 11: what was built

Plan step 11 and section 7.3 have the detail. In short:

- **A.** Every link into the app carries `src`, and the app records it on the
  user.
- **B.** Leads carry `src` over the bridge (contract 1.3.0), so a sign-up that
  came by email is credited too.
- **C.** Tools open the app's sign-up already filled in, and ATHX is part of
  sign-up.
- **The report:** `/admin/guides/performance` shows app sign-ups, trials and
  paying users per article, and per page.

## Next

- **Step 12, the 90-day review,** around early February 2027. App sign-ups per
  article are now part of it.
- **At store launch,** plan section 7.4.
- **A pacer app link** once the Pacing Pack is off sale (D9).

## Things that bit us (keep them)

- **The build's TypeScript check needs a 3 GB heap.** `apphosting.yaml` sets it for
  the build; locally `NODE_OPTIONS=--max-old-space-size=3072 npm run build`.
- **Nothing may read Firestore during a build.** Built-ahead pages that list
  articles use `listPublishedGuidesOutsideBuild`.
- **This clone is shallow.** `sitemap.test.ts` compares page dates with git
  history and fails on a shallow clone; `git fetch --unshallow origin master`
  first.
- **`next dev` in the app writes a block into its CLAUDE.md.** Revert it
  before committing.
- **Edit a hand-built page, bump its date** in `src/lib/page-dates.ts` the same
  commit (sitemap lastmod; a test enforces it).
- **Tests with times use a fixed clock.** One used the real clock and broke the
  day its date passed.
- **Don't edit files on GitHub while a branch is open**: a direct edit to
  `sitemap.ts` on master once conflicted with a branch that had moved it.
- **developers.google.com is not reachable** from these sessions; cite secondary
  sources and verify through the live check routes.
- **Writing style for anything Jon reads:** plain UK English, no em dashes, short.
  The coaching bible (`src/lib/guides/bible.ts`) is the house style for articles.
