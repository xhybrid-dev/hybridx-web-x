# Hand-off: the content engine, 11 November 2026

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
| 8 | Strength and engine test `/calculators/strength-engine-test` | **In PR #38** |
| 9 | HYROX pacer `/calculators/hyrox-pacer` | **In PR #38** |
| 10 | Keyword Planner volumes | **In PR #38**, off until Jon's setup |
| 11 | App hand-off | **Next: needs hybridx-app** |
| 12 | 90-day review | Around early February 2027 |

Work branch in this repo: `claude/strategy-proposal-review-plan-gbkqya`. If PR #38
is merged, restart the branch from `master` before new work.

## Waiting on Jon

- **Merge PR #38.** Then check the strength test's three worked examples give the
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

## Step 11: what to do next

Plan sections 7.3 and 7.4. Today no app trial can be credited to an article.

1. Read hybridx-app's sign-up flow: what it records about where a user came from
   (UTM, referrer, `src`), how a programme is chosen, and the marketing bridge
   contract (`src/lib/__tests__/cross-repo-agreement.test.ts` here pins its
   field names).
2. Agree D11 with Jon before building: how the app receives a reader's context
   ("came from article X", "built this week in the planner"). The plan's option
   is a signed seed (`/signup?seed=…`) or the lead's `extra`, mapped to a programme.
   Any new field crossing the two projects goes in the cross-repo test.
3. The site already sends `src=guide-<slug>` on article call-to-action and tool
   links (`/api/guides/out`), and records `src` on free-plan, planner and
   strength-test leads. The app CTA (`/app`) does not yet pass anything on.

## Things that bit us (keep them)

- **The build's TypeScript check needs a 3 GB heap.** `apphosting.yaml` sets it for
  the build; locally `NODE_OPTIONS=--max-old-space-size=3072 npm run build`.
- **Nothing may read Firestore during a build.** Built-ahead pages that list
  articles use `listPublishedGuidesOutsideBuild`.
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
