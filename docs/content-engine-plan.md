# The content engine: review of the strategy, and a plan to build it

**Status:** plan only. Nothing here has been built.
**Written:** 10 November 2026, against `master` at `4b70c7f` and a read-only look at
`xhybrid-dev/hybridx-app` (the app behind app.hybridx.club and the store apps).
**Revised:** the same day, with your decisions and a source-level look at `gum`
(`github.com/ehmo/gum`, v2.3.1, 23 September 2026).
**Reviewing:** "HybridX mega strategy" (.docx), called *the proposal* below.

## What changed in this revision

- **Cadence decided:** three short articles a week, one point each. That changes
  the article format (section 4.5) and the topic list (section 9).
- **Review loop decided:** you get an email when an article is ready, and you
  approve it or comment. A comment triggers a revision and another email
  (section 4.7). Nothing publishes without your approval.
- **gum is in the plan, in the two roles it fits** (sections 3.6 and 4.11):
  1. a research desk for you and Claude Code, on your computer;
  2. a weekly harvest on your computer that sends Search Console and Keyword
     Planner data to the site.

  Reading its source settled one thing. In gum, Search Console and Google Ads
  work only through a personal Google sign-in whose token sits in your
  computer's keychain. So gum runs on your computer, not on the web server.
- **Two setup traps found:**
  - Google OAuth apps left in "Testing" issue sign-in tokens that expire after
    seven days, which would break a weekly job every week.
  - Admin sign-in on this site lasts 55 minutes, which makes acting on an email
    from a phone a chore. The fixes are in sections 12 and 4.7.

---

## 1. The short version

**The goal is right.** Searchers who arrive with a specific training problem,
solve it with a tool, and get a plan to fix it are HybridX's best customers. The
site's strongest pages are already of that kind: the ATHX endurance calculator,
the Glasgow pacing preview, VDOT, and the nerdy-bits maths.

**As written, the mechanics would do harm:**

1. **A new AI article every day, published without anyone reading it, is the
   pattern Google's scaled content abuse policy describes.** The damage can
   reach the pages that already earn your traffic.
2. **It was written for a different site:** `hybridx.app`, a static host, MDX,
   Python, PostHog and a teal palette. Most of what it asks for already exists
   here in some form (section 2).
3. **The topic picker would create pages that compete with your own.** It never
   asks which of your URLs already ranks for a query.
4. **The calculator CTAs promise things the app cannot do yet**, and point at app
   stores where the app deliberately sells nothing (section 6).

**The plan:**

- **Tools first.** Short, single-point articles bring people to the tools, and
  the tools convert.
- **Three a week, AI-drafted.** You get an email for each and approve or
  comment. Never auto-published.
- **The server side is built inside this repo's stack:** Next.js, Firestore,
  `/admin`, the magnet machinery, the hourly maintenance job, the existing
  analytics and the existing Gemini key.
- **gum works from your computer:** research with Claude Code whenever you like,
  plus a weekly harvest that feeds the topic list with real Search Console and
  Keyword Planner numbers. The web server never holds a Google search
  credential.
- **A phased build, each phase shippable on its own** (section 11). The first
  useful step (gum as a research desk) needs no code at all.

---

## 2. What the proposal assumes, and what is actually here

| The proposal assumes | What exists | Consequence |
|---|---|---|
| Domain `hybridx.app`, GSC property `sc-domain:hybridx.app` | `hybridx.club`, plus `race.`, `streak.` and `trail.` subdomains with their own canonicals | Use `sc-domain:hybridx.club`. A domain property already covers the subdomains. |
| A static host that rebuilds on commit | Firebase App Hosting, backend `hybridx-web-x`. Every push to `master` is a full production build, and one bad `secret:` binding fails the whole build (CLAUDE.md) | Keep articles out of the build (section 4.2). |
| MDX guides in `src/content/guides` | No MDX. Guides are hand-built TSX pages (`/how-to-train-for-hyrox`, `/hyrox-training-plan`, `/hybrid-training-program`, `/hyrox-rule-changes-2026`) | An article renderer is needed. It should not be MDX (section 3.5). |
| A Python engine | A TypeScript repo. Genkit and `@genkit-ai/google-genai` are installed, `GEMINI_API_KEY` is bound, and the Anthropic SDK runs the monthly analytics review | Write it in TypeScript. That includes the harvest script that calls gum (section 4.11). |
| gum in a daily headless runner (GitHub Actions or cron) | In gum's catalog, all ten Search Console operations and all three Keyword Planner operations accept only `byo_oauth`, a personal Google sign-in with the token in the OS keychain. There is no fallback to ADC. This repo has no CI | gum runs on **your computer**, weekly (section 4.11). It cannot run on App Hosting, in CI, or in Claude Code's cloud sessions. |
| Three new calculators | 12 calculators, `/race`, the ATHX endurance calculator, and the Glasgow pacing model with tests pinned to the paid Pacing Pack | HyroxPacer overlaps the **£5 Pacing Pack on sale until 14 March 2027** (section 5.3). |
| PostHog, "no cookie banner needed" | Consent-gated GA4, a first-party tracker, a collector, rollups, admin pages and a monthly Claude review | A third analytics system, and the cookie claim is unsafe (section 3.8). |
| Palette `#1E1E1E`, teal `#00AAAA`, `#005555`, yellow `#fbd85b` | Black, white and yellow `#FADB5C` (`hx` tokens) | Use the `hx` tokens. |
| "Load this target into HybridX" | The app has no target finish time. Programmes are fixed, with a `daysPerWeek`, condensed to fit | Change the CTA copy, or add the feature to the app (section 6). |
| Send people to the iOS and Android apps | The apps are Capacitor shells of app.hybridx.club and **never sell**. There are no universal links or app links | A visitor sent to a store meets a login screen with no way to subscribe. |
| FAQ JSON-LD for rich snippets | Already used | Since August 2023, FAQ rich results show only for authoritative government and health sites. Harmless, but expect no snippet. |
| Sitemap "pinged" daily, and URL inspection to get pages indexed | `sitemap.ts`, with a test | The ping endpoint was retired in 2023. URL Inspection *reports* index status; it does not request indexing. Submit the sitemap once. |
| Lead capture | `src/lib/magnets.ts`, `useMagnetCapture`, double opt-in, and the bridge to the app's journeys | This is the right conversion path. Use it. |

---

## 3. Problems and risks, most serious first

### 3.1 Search quality policy

- **The policy.** Google's spam policies define scaled content abuse as producing
  many pages mainly to manipulate rankings rather than to help people, and they
  name generative AI as one way it happens. Secondary sources describe spam
  updates in June and August 2026.
- **The risk is asymmetric.** A good article adds a little traffic. A site-wide
  quality demotion takes away the traffic you already have.
- **Three a week, each read and approved by you, is a defensible cadence.**
  Daily and unreviewed was not.

**What keeps it defensible:**

- every article carries something a model cannot supply: a working tool, real
  numbers from the facts registry, a specific scaled workout, or your coach's
  note (section 4.5);
- a real author byline;
- articles grouped under pillar pages;
- a retire-and-merge path;
- stop rules (section 7.4).

### 3.2 Cannibalisation

The proposal only checks for duplicates against the guides it wrote itself.

- **A striking-distance query** means one of *your* pages already ranks for it.
  Usually the right move is to improve that page.
- **Short single-point articles raise this risk.** Many narrow pages on adjacent
  questions can compete with each other.

The harvest asks for `query × page`. Each topic is sent either to a *refresh* of
the page already ranking or to a *new article*, and no two articles may target
the same query group (section 4.4).

### 3.3 Accuracy, safety and staleness

- **HYROX standards change by season.** The proposal's bible lists only the
  Men's and Women's Open weights, and it contains corrupted text ("programme,
  kilometre,门槛/kettlebell").
- **ATHX zone names should come from `src/lib/athx-content.ts`.**
- **Some topics need real data.** "Good HYROX time by age" is one; a model would
  invent the numbers.
- **Fitness advice is health-adjacent.**

**Mitigation:** facts live in typed registries, and code checks every number in a
draft against them (section 4.3).

### 3.4 Review capacity

- Three short articles take about 10–15 minutes each: under an hour a week.
- Comments that would apply to every article become amendments to the bible, so
  you make each correction once (section 4.7).

### 3.5 Security

- **MDX is code,** and the inputs include text anyone can influence: a Search
  Console query is whatever somebody typed into Google.
- The model returns typed JSON blocks. The site renders them with its own
  components, with no raw HTML, no MDX, and links checked against an allowlist.

### 3.6 gum: what it is good for, and its limits

I read the source (`github.com/ehmo/gum`, v2.3.1, MIT licence, Wraxle LLC).
Your description is accurate, and the strengths are real:

- **Catalog first.** Claude Code sees a small set of meta-tools and looks up only
  the operation it needs, so Google's large schemas don't flood its context.
- **Credentials are kept out of reach.** Sign-in tokens sit in the OS keychain,
  and the OAuth client secret goes in through stdin. Neither the agent nor a
  `.env` file ever holds them.
- **Read, write and destructive calls are separated.** `gum read` refuses a
  mutating operation, `gum write` needs `--allow-write`, and `gum destructive`
  needs a single-use confirmation token.
- **Keyword Planner:** `googleads.keywordPlanIdeas.generateKeywordIdeas` and
  `generateKeywordHistoricalMetrics` give search volumes for topics you don't
  rank for yet. Search Console cannot do that, so this is the proper answer to
  the cold-start problem, better than a fixed seed list.

**The limits that shape the plan:**

- **Where it can run.** For Search Console and Google Ads, the catalog allows
  only `byo_oauth`, and the resolver does no fallback to ADC. gum supports ADC
  and service accounts in general, but not for these operations. The token
  lives in the OS keychain:
  - on a headless Linux host, a container or CI, keychain calls fail with
    `AUTH_KEYCHAIN_UNAVAILABLE` (gum's own `docs/paths.md`);
  - that rules out App Hosting, GitHub Actions and Claude Code's cloud sessions,
    including this one;
  - it works on your own computer, signed in, and a weekly schedule there is
    forgiving (section 4.11).
- **`trends.daily`** returns a region's daily and real-time trending searches:
  news and football, no signal for training questions. Leave it out.
- **`indexing.urlNotifications.publish`** is in gum's catalog, but Google's
  Indexing API is only for job-posting and livestream pages. Using it to push
  articles breaks its terms. Keep it out of anything automated.
- **The OAuth "Testing" trap.** The proposal tells you to add yourself as a test
  user, which leaves the OAuth app in Testing. Google expires refresh tokens for
  such apps after seven days, so a weekly harvest would fail every week until
  you signed in again. Set the app to "In production" (section 12).
- **Project-scoped setup is loaded by every session.** `gum setup --scope
  project` writes MCP config and skills into the repo. Once committed, every
  Claude Code session loads them, including cloud sessions where gum can't run.
  Use the user scope on your computer instead.
- **Install a pinned release** through the qualified Homebrew tap (`ehmo/tap`).
  Read `install.sh` before piping it to a shell. Sign in only to the services you
  need (`searchconsole`, later `googleads`), not Gmail or Drive.

### 3.7 Deploy coupling

Committing generated files would mean a production deploy per article, and a
malformed file failing the whole site's build. Firestore removes both (section
4.2).

### 3.8 Analytics and privacy

PostHog would be a third analytics system and another data processor. "No
cookie banner needed" is not safe to assume under PECR, and the site's privacy
sign-off is still outstanding. Everything wanted can be measured with what
exists (section 7).

### 3.9 Conflict with the shop

The £5 Glasgow 2027 Pacing Pack is on sale until 14 March 2027. A free tool
giving station-by-station targets undercuts it (section 5.3).

### 3.10 The apps

- **The store apps never sell memberships.** A CTA that sends someone to a store
  loses them at the login screen.
- **There are no universal links or app links.**
- **The app has no target finish time,** and programmes are picked from a fixed
  library.
- **App signup records no source,** so no trial can be traced back to an
  article.
- **Apple may still insist on in-app purchase.** The app repo's own notes
  expect it.

### 3.11 AI answers absorb informational clicks

This bears hardest on short articles. A question answerable in two sentences
gets answered on the results page. That is why every article needs its proof
element, and why answers that small become an FAQ on a pillar page instead
(section 4.4).

### 3.12 Brand and claim consistency

- `/app` says "14-day free trial"; `public/llms.txt` says "first month free".
- `llms.txt` claims "over 2,000 athletes".

Fix the source facts before an engine repeats them three times a week. Use
"HYROX" and "ATHX" descriptively only.

---

## 4. The design

### 4.1 Shape

```
 YOUR COMPUTER (gum, signed in)                          HYBRIDX.CLUB (App Hosting)
 ┌───────────────────────────────┐                       ┌────────────────────────────────────────────┐
 │ Claude Code + gum MCP         │  research, ad hoc     │                                            │
 │  "which pages rank 8–20?"     │                       │  topics  ◀── seed list (fallback)          │
 │                               │  weekly POST          │    │                                       │
 │ weekly harvest (launchd):     │ ────────────────────▶ │    ▼  weekly quota: 3                      │
 │  • GSC query × page, 28 days  │  /api/content/harvest │  BRIEF ─▶ DRAFT ─▶ CHECKS ─▶ MODEL REVIEW  │
 │  • URL inspection, new pages  │  (bearer secret)      │           (Gemini)  (code)   (2nd model)   │
 │  • Keyword Planner volumes    │                       │                                │           │
 └───────────────────────────────┘                       │                                ▼           │
                                                         │       email to you: "Ready: <title>"       │
               YOU (phone or laptop) ◀────────────────── │                                │           │
                  │  approve / comment / reject          │  comment ─▶ REVISE ─▶ checks ─▶ email again│
                  └────────────────────────────────────▶ │  approve ─▶ next publishing slot           │
                                                         │            ─▶ /guides/<slug>, sitemap,     │
                                                         │               pillar links                 │
                                                         └────────────────────────────────────────────┘
```

**Two lanes.**

- **Your computer** holds the Google search credentials, through gum, and does
  research and the weekly harvest.
- **The server** holds no Google search credential. It drafts, checks, emails,
  revises and publishes.

If your computer misses a week, the server carries on from the last harvest or
the seed list.

### 4.2 Where articles live: Firestore, behind an admin review queue

| | Firestore + `/admin/guides` | Generated files committed to git |
|---|---|---|
| Preview before publishing | Rendered exactly as it will appear | None: App Hosting has no per-PR previews |
| Review on a phone | A page built for it, linked from the email | GitHub's diff view of prose |
| Effect of a bad draft | That article fails to render | The build fails and the site stops deploying |
| Time to publish | Seconds | One full App Hosting build |
| History | A revision subcollection per article | git history |

**Collections** (all server-only: the client has no access):

- **`guides/{slug}`:**
  - lifecycle: `status` (`drafting`, `awaiting_review`, `revising`,
    `approved`, `scheduled`, `published` or `retired`), `publishAt` and
    `redirectTo`;
  - content: `point` (the one point, in one sentence), `blocks`, and `meta`
    (title, description, primary query group, pillar, proof element, tool,
    CTA variant);
  - provenance: `factsUsed`, `sources`, `author`, `reviewedAt`, `publishedAt`,
    `updatedAt`, `revision`;
  - subcollections: `revisions/{n}` and `comments/{id}` (your comments, the
    blocks they refer to, and how each was resolved).
- **`guideRuns/{id}`:** stage, inputs, model, token counts, check results, error.
- **`guideTopics/{id}`:** candidate questions, with the query group, Search
  Console numbers, Keyword Planner volume, a kind (`new`, `refresh` or
  `faq-on-pillar`), the page that currently ranks, a score, and a status.
- **`guideHarvests/{date}`:** each weekly harvest as received, plus a summary.
- **`guideMetrics/{slug}__{week}`:** clicks, impressions, position, inspection
  verdict, tool uses, leads.
- **`contentSettings/engine`:** `paused`, publishing slots, notification hours
  and the review address. You change these in admin, with no redeploy.

**Rendering and backups.** Articles are rendered on the server through the Admin
SDK, cached by tag, and revalidated on publish. Nothing reads Firestore at build
time. Backups come from a scheduled Firestore export, plus "Export as Markdown"
in admin.

### 4.3 What the engine reads

- **Facts registry, `src/lib/facts/`.** Each fact has an id, a value, a source
  and a `checkedAt` date. It covers:
  - HYROX standards by season and division;
  - the 2026/27 rules (re-exported from `hyrox-rules-2026.ts`);
  - ATHX zones (from `athx-content.ts`);
  - product facts and a "Not claimed" list (in the style of `una-family.ts`).

  When a fact changes, a query lists every article that used it.
- **Topic map, `src/lib/guides/topics.ts`.** Every indexable page, with its
  pillar and the query groups it owns, plus each published article.
- **Coaching bible, `src/lib/guides/bible.ts`.** A TypeScript string, so it is
  bundled (section 8).

### 4.4 Choosing topics

Weekly, after the harvest arrives:

1. **Group** the Search Console queries (`query × page`, 28 days ending three
   days ago) into near-duplicate groups.
2. **Route** each group:
   - **refresh:** a relevant page of yours already gets the impressions. The
     task is to improve that page, and it goes on a separate list in admin;
   - **faq-on-pillar:** the honest answer is under about 150 words and needs no
     tool, workout or table. It becomes an FAQ entry on the pillar page, not a
     page of its own;
   - **new:** no page owns the group, and the answer needs a proof element. It
     becomes an article candidate.
3. **Merge in** the candidate list (section 9). The harvest attaches Keyword
   Planner volume (UK, English) to each.
4. **Score:** UK volume or Search Console impressions × position opportunity ×
   business fit (a tool or product matches) × not already owned.
5. **Queue.** The top candidates feed the drafting queue. You see the queue in
   admin and can reorder it, veto an item (with a reason, so it is not offered
   again), or type in your own question at any time.

### 4.5 The article format: short, one point

| Part | Rule |
|---|---|
| Title | The question, or a direct claim. ≤ 60 characters |
| The answer | 2–3 sentences, with the concrete number, placed first |
| Why | 1–3 short paragraphs. Cut anything that doesn't serve the point |
| **Proof element** | **Required, exactly one main one:** a tool embed with presets, *or* one workout (beginner and race-pace options, RPE and rest), *or* a table from the facts registry. Plus your coach's note whenever you add one |
| Mistake to avoid | Optional, one paragraph |
| FAQ | 0–3 entries |
| Links | Up to its pillar page, one sideways link to a related article, and the CTA |
| Length | 350–800 words, aiming for about 600 (3–4 minutes' reading) |

"One point" is stated as a sentence in the brief (`point`). The reviewer model
checks that every section serves it, and the checker allows one H1 and at most
four H2s.

### 4.6 The drafting pipeline

Each stage is saved and resumable, and one stage runs per tick of the hourly
maintenance job.

**The quota.** A new draft starts when:

- fewer than two drafts are awaiting your review;
- fewer than three articles are approved, scheduled or published this week;
- the engine is not paused.

**The stages:**

1. **Brief** (code, then the model). It sets:
   - the point and the search intent;
   - the proof element, and which tool to embed if any;
   - the CTA variant;
   - the pillar link and the sideways link, both from the topic map;
   - the relevant facts.
2. **Draft** (Gemini, structured output against the block schema, low
   temperature). The model is named in one constant.
3. **Checks** (code, deterministic). Any failure loops back to the model once,
   then flags the draft for you:
   - **structure:** the schema and the length band, one H1 and at most four H2s;
   - **content rules:** the answer comes first and contains a number; the proof
     element is present; every workout has both options with RPE and rest;
   - **accuracy:** numbers next to station names match the facts registry;
     product claims are product facts;
   - **links:** only allowlisted routes and domains;
   - **wording:** no banned phrases, no US spellings, no medical claims;
   - **originality:** not too similar to any existing article.
4. **Model review** (a second model, ideally from another family: Claude,
   through the SDK the monthly review uses). It lists problems with quotes and
   does not rewrite. Problems it rates serious go back for one fix before you
   are notified.
5. **Notify you** (section 4.7).

### 4.7 Notify, approve, comment

**The email.** Sent to the review address through the existing `sendEmail` and
Brevo transport, within your chosen hours (for example 07:00–20:00).

- **Subject:** "Ready to review: <title>".
- **Body:**
  - the one point and the target question;
  - **the full article text**, so you can read it anywhere;
  - a one-line check summary (for example "All checks passed. Reviewer: 1 minor
    note") and the reviewer's notes.
- **Two buttons:**
  - **Approve:** opens the review page with the approve confirmation ready;
  - **Comment:** opens the review page with the comment box ready.

**Neither button acts when clicked.** CLAUDE.md records why: Outlook Safe Links
and Gmail prefetch every link in an email, so a link that approved on a GET
would let a scanner publish articles. The page does the action on one tap, after
sign-in.

**Admin sign-in has to last.** It currently expires after 55 minutes
(`src/lib/admin-auth.ts`), because minting a longer Firebase session cookie needs
the "Service Account Token Creator" role on the backend's service account. Grant
that and move to 14-day session cookies, so an email tap lands you straight on
the page. This is in Phase 1.

**The review page, `/admin/guides/<slug>`:**

- the article rendered exactly as it will publish, with the check results and
  reviewer notes beside it;
- **Approve:** it goes into the next publishing slot (for example Monday,
  Wednesday or Friday at 07:00), or "Publish now". A confirmation email follows
  with the live link;
- **Comment:** on the whole article, or on a paragraph (tap it first);
- **Reject**, with a reason. The topic is retired and the reason is kept;
- **Edit:** optional, for a typo you would rather fix than describe.

**What a comment does:**

1. The draft moves to `revising`. The model gets the article, your comments and
   the bible, and returns only the blocks that change.
2. Checks and the reviewer model run again.
3. You get a "Revised: <title>" email listing what changed, with the changed
   paragraphs marked, and the same two buttons.
4. After three rounds without your approval, it stops and asks you to edit or
   reject, rather than looping.

**Comments that apply to every article** ("never say X", "we always do Y") are
spotted. Monthly, the engine proposes them as amendments to the bible for you to
accept or decline, so the same comment is not needed twice.

**Never automatic:**

- nothing publishes without your approval;
- a draft waiting three days gets one reminder;
- a draft waiting 14 days is archived, because facts may have moved on. You can
  revive it.

**Pausing.** "Pause the engine" is a switch in admin, for holidays. The
`CONTENT_ENGINE_MODE` environment variable (`off` or `on`) remains the hard stop
and ships as `off`.

### 4.8 Block format

| Block | Fields |
|---|---|
| `heading` | level (2 or 3), text |
| `paragraph` | inline text with bold, italic, and links to allowlisted routes or domains |
| `list` | ordered or not, items |
| `callout` | kind (`tip`, `warning`, `coach-note`), text |
| `workout` | title, goal, `beginner {…}`, `racePace {…}`, rest, RPE, notes. Both options are required by the schema |
| `table` | header and rows, filled from the facts registry |
| `calculator` | `id` (an enum of existing and new tools), preset inputs |
| `cta` | variant id from the CTA registry (section 6.2) |
| `faq` | up to three question and answer pairs, shown on the page |
| `sources` | references checked to exist, as on `/una/nerdy-bits` |

Blocks are rendered by the site's own components, with no
`dangerouslySetInnerHTML`.

### 4.9 Pages and SEO plumbing

- **Routes:** `/guides` (a hub grouped by pillar) and `/guides/[slug]`. Use
  `createMetadata({ type: 'article' })`.
- **Structured data:** JSON-LD `Article` (author as a `Person`, dates,
  publisher) and `BreadcrumbList`.
- **Trust signals:** an author box, and "Reviewed by … on …".
- **Images:** a per-article OG image from `next/og`, kept out of `public/`
  (commit `b982d11`).
- **`sitemap.ts`:** add published articles with their real `lastModified`, and
  teach `sitemap.test.ts` about the dynamic route. Stop stamping static pages
  with `new Date()`.
- **Elsewhere:** add the guides hub to `public/llms.txt`, and "Guides" to the
  header and footer.
- **Retiring an article:** set `retired`. With a `redirectTo`, the route issues a
  permanent redirect; otherwise it returns 410.

### 4.10 Clusters and internal links

**Short articles only work in clusters.** Each one links up to a pillar page,
and the pillar lists its articles ("Questions answered"), chosen at render time
by a `RelatedGuides` component. No published page is ever rewritten.

| Pillar | Page | Typical articles |
|---|---|---|
| HYROX stations and race | `/how-to-train-for-hyrox` | station technique, pacing, simulations |
| Running and lifting together | `/hybrid-training-program` | interference, weekly structure, strength while running |
| Starting out | `/free-hyrox-plan` | baselines, divisions, first race |
| ATHX | `/athx-2027` | zones and peaking |
| Tools | `/calculators` | the tool-led articles |

For contextual links inside older articles, the engine proposes a sentence and
link for two or three of them. They come to you in the same email-and-approve
flow, and each becomes a new revision.

### 4.11 gum: the two roles

#### Role 1: the research desk (interactive, available now)

This needs no code in this repo.

- **Install** a pinned release on your computer:
  `brew tap ehmo/tap https://github.com/ehmo/homebrew-tap && brew install ehmo/tap/gum`.
- **Sign in** to `searchconsole` only for now. Add `googleads` once a developer
  token is approved.
- **Connect it to Claude Code on your computer** with
  `gum setup --target claude --scope user --features skills,mcp`. The user
  scope keeps it out of the repo, so cloud sessions don't try to start a server
  they can't run.
- **Then ask in plain English**, for example:
  - "Which hybridx.club pages rank 8–20 with low CTR over the last 28 days?"
  - "Which queries land on the homepage that a specific page should own?"
  - "What's the UK monthly volume for these ten questions?"

This is the right tool for the refresh list and for checking demand before an
article is written.

#### Role 2: the weekly harvest (scheduled on your computer)

**`scripts/content-harvest.ts`,** in this repo, run with `npx tsx`. It shells out
to gum, reads JSON from stdout, and makes only `gum read` calls:

1. `searchconsole.searchanalytics.query`: `query × page`, 28 days ending three
   days ago, up to 25,000 rows.
2. `searchconsole.urlInspection.index.inspect`, for each article published in
   the last 30 days (a dozen or so calls; the limit is 2,000 a day).
3. `googleads.keywordPlanIdeas.generateKeywordHistoricalMetrics`, for the next
   30 or so candidates (UK geo, English). Optionally `generateKeywordIdeas`,
   seeded from pillar terms, to discover new questions.
4. A POST of the result to `https://hybridx.club/api/content/harvest`.

**The endpoint:**

- It takes a bearer secret, `CONTENT_HARVEST_SECRET`. That is a new secret,
  deliberately separate from `CRON_SECRET` and `LEAD_BRIDGE_SECRET`, per the
  repo's rule that one credential shouldn't carry another's authority.
- The script reads the secret from your keychain (`security
  find-generic-password`), not from a file.
- The endpoint validates the payload with zod, caps its size, and treats every
  query string as untrusted text.

**Scheduling.**

- A `launchd` user agent runs it every Sunday evening. If the Mac was asleep,
  launchd runs it at next wake, so a weekly job tolerates a laptop.
- It logs to a file. Admin shows "last harvest: <date>", and review emails add a
  line when the harvest is more than 14 days old.

**Which computers work:**

- **Yes:** a Mac you sign in to; a Linux desktop with an unlocked keyring.
- **Untested here:** Windows and WSL.
- **No:** Firebase Studio or any cloud workstation, and Claude Code cloud
  sessions, because a headless keyring can't answer.

**If no suitable computer is available:** the server calls the Search Console API
directly with a service account added to Search Console as a Restricted user.
Keyword Planner volumes are then dropped (or come only from your interactive
sessions). Everything else in the plan is unchanged.

### 4.12 Scheduling and operations

- **The server lane** runs as a step of the existing hourly
  `/api/cron/marketing-maintenance` job (the `monthly-review.ts` pattern), one
  stage per tick.
- **Timeouts:** each stage must finish well inside the platform's request
  timeout. Check the current App Hosting limit.
- **Cost:** pennies per article at three a week. Set a budget alert on the
  Gemini key anyway, and cap tokens per stage.
- **Status:** `/admin/guides` shows the queue, the last run and its stage, any
  error, and the last harvest. Failures never publish anything.

---

## 5. The three calculators

Rules common to all three:

- The arithmetic lives in `src/lib/`, pinned by tests to worked examples you
  write.
- Styling uses the `hx` tokens, with a contrast check.
- Defaults are server-rendered.
- Each tool gets its own indexable page under `/calculators/…`, and can be
  embedded in an article with presets.

### 5.1 Week planner ("SplitBuilder"). Build first

- **Inputs:**
  - training days (3, 4 or 5);
  - goal (first HYROX, faster HYROX, ATHX, or 10k plus strength);
  - kit (full gym, basic gym, home, no sled);
  - preferred long-run day.
- **Model:** a rule engine over a session library, with templates per goal and
  day count, and constraints from the bible:
  - minimum gaps between heavy lower-body work and hard running;
  - strength first when sharing a day;
  - no stacked hard days in a 3-day week;
  - kit substitutions.
- **Tests:** every input combination against every constraint.
- **Output:** a 7-day grid, `.ics` export (`src/lib/ical-generator.ts`), and
  "Email me this week and the next three" (a magnet, with the inputs in `extra`).
- **Honest CTA:** "HybridX has 3-, 4- and 5-day programmes built on these
  rules." Map each goal and day count to an app programme id.
- **Decision:** standalone, or the plan finder's result screen.

### 5.2 Strength and engine test ("StrengthRatio")

- **A coach's heuristic, not a validated model.**
- **Inputs:** **bodyweight** (missing from the proposal); division; squat,
  deadlift and press (estimated 1RM, using the one-rep-max formula); and a 5k
  time (VDOT logic).
- **Output:** one of three verdicts, each with an eight-week focus.
- **You set the thresholds,** with worked examples that become tests.
- **No true 1RM testing for beginners.**

### 5.3 HYROX pacer

- **Reuse** the run-fade model in `src/lib/shop/glasgow-2027-pacing.ts`. Move it
  to a shared `src/lib/hyrox-pacing.ts`, keeping the Glasgow tests green.
- **Missing:**
  - a station-time model (its source is a decision);
  - a rule for "strongest and weakest station".
- **The Pacing Pack conflict.** Recommended: the free tool shows run splits, the
  Roxzone budget and the total station budget. The station-by-station table is
  emailed, or comes in the pack while it is on sale.

---

## 6. Conversion path and the apps

### 6.1 The ladder

1. An article answers the question.
2. A tool gives a personal result.
3. **"Email me my result"** (a magnet, with `placement` set to the article or
   tool slug).
4. A nurture journey built in `/admin/marketing/studio`.
5. Web signup, with the trial.
6. After signup, "get the app".

### 6.2 `ContextualCTA`

A registry, `src/lib/guides/ctas.ts`, holds the variants. The model proposes one
per article; you see it in review. Copy may only state product facts. One switch
controls whether store badges show, for when the apps are live.

### 6.3 Handing a result to the app (work in hybridx-app)

- **Same device:** link to `app.hybridx.club/signup?seed=<signed token>`, signed
  with HMAC using a new secret shared by the two projects.
- **Different device:** the inputs ride in the lead's `extra` through the
  bridge, and the app applies them at signup by email.
- **Also needed in the app:**
  - verify the seed and map it to a programme;
  - **record the signup source** on the user document;
  - store a target finish time on the profile, if the pacer's CTA is to promise
    one.

### 6.4 When the apps are published

- **Links:**
  - serve `apple-app-site-association` and `assetlinks.json` from
    app.hybridx.club;
  - add the Associated Domains entitlement on iOS, and `autoVerify` intent
    filters on Android;
  - add an `appUrlOpen` handler that routes the WebView.
- **No deferred deep linking service.** Firebase Dynamic Links shut down in
  August 2025, and none is needed.
- **Store badges** go after signup, never as an article's main CTA while the
  apps can't sell.
- **Campaign links per placement:** `pt` and `ct` in App Store Connect, and Play
  referrer UTMs.
- **If Apple requires in-app purchase:** store billing granting the same
  entitlement Stripe grants. Then decide pricing, and only then send CTAs
  straight to the stores.

---

## 7. Measurement

### 7.1 Conversions of record (server-side: complete, and no consent needed)

- Leads by `source` and `placement`.
- App signups by source (needs the app work in section 6.3).

### 7.2 Behaviour (a consented sample)

- **GA4,** through the existing `trackEvent`: `guide_engaged`, `calculator_used`
  and `cta_click`.
- **Optionally,** the first-party tracker v2 on article and tool pages, so the
  monthly Claude review covers articles too.

### 7.3 Search (from the weekly harvest)

- **Per article, per week:** clicks, impressions, CTR and position, plus the
  inspection verdict for the first 30 days.
- **`/admin/guides/performance`** flags:
  - articles still not indexed after 30 days;
  - articles with too few impressions after 90 days (candidates to merge into
    their pillar).

### 7.4 Targets and stop rules

**Before launch:** export three months of baseline data for the existing pages.
gum can do this from your computer today.

| When | Measure | Healthy | Stop and reassess |
|---|---|---|---|
| 30 days after each article | Indexed? | ≥ 80% indexed | < 50% indexed, or "Crawled – currently not indexed" rising |
| Monthly | Clicks to existing pages | No fall beyond the seasonal pattern | A > 15% fall after a Google update, while articles are live |
| 90 days | Captures per 1,000 article clicks | Rising. Set the bar after month one | Flat at zero across all articles |
| Continuous | CTA copy changes | Judged after ≥ 300 visits per variant | — |

---

## 8. The coaching bible, rewritten

1. **Voice and editorial.**
   - Who HybridX is for.
   - Tone, from the app's brand briefing: specific, intelligent and
     performance-focused.
   - UK English, with a word list.
   - Banned openers and phrases.
   - **Short-format rules:**
     - one point per article;
     - the answer first, with its number;
     - cut anything that doesn't serve the point;
     - no recap paragraph and no "In conclusion".
   - **No invented first-person experience.** First-hand material comes only
     from your coach's notes.
2. **Training rules.**
   - Interference gaps, with your numbers for each pairing.
   - Strength first when combined with running.
   - Every workout scaled two ways, with RPE and rest.
   - Progression limits.
   - Safety lines.
   - What is never prescribed.
3. **Facts.** None in prose. They are injected from the registry.
4. **Sourcing.** Only references checked to exist. No "research shows" without a
   citation.
5. **Claims.** Product facts only, plus the "Not claimed" list.

**Agree with the app's programmes** (`PROGRAM_COACHING_REVIEW.md` and its
companions in hybridx-app), confirmed by you. **Amendments come from your
comments** (section 4.7) and are always accepted by you.

---

## 9. The first twelve weeks: single-point candidates

These are the 30 seeds rewritten as one-point questions. Broad seeds such as #17
(interference) and #24 (strength and endurance) become several articles, and a
few answers too small for a page become pillar FAQs. **Each one is a candidate
until gum's Keyword Planner and Search Console data confirm demand and a check
against existing pages confirms no overlap.** At three a week, this is about
twelve weeks of work, by which time the weekly harvest will be producing
candidates of its own.

| # | Question (working title) | Pillar | Proof element | From seed |
|---|---|---|---|---|
| 1 | How do I train the sled push without a sled? | HYROX | Workout (kit swaps) | 1 |
| 2 | How do I stop my grip failing on the sled pull? | HYROX | Workout | 5 |
| 3 | How should I pace burpee broad jumps? | HYROX | Table (pace bands) | 6 |
| 4 | How do I train wall balls for when I'm already tired? | HYROX | Workout | 2 |
| 5 | How should I break up 100 wall balls? | HYROX | Table (set schemes) | 2 |
| 6 | How do I train the farmers carry when my grip goes first? | HYROX | Workout | 7 |
| 7 | How do I stop sandbag lunges wrecking my last run? | HYROX | Workout | 8 |
| 8 | What does a HYROX simulation look like in a normal gym? | HYROX | Workout | 10 |
| 9 | What is a compromised-running session, and how often should I do one? | HYROX | Workout | 3 |
| 10 | How fast should my first 1km be? | HYROX | Tool (HYROX pacer) | 4 |
| 11 | How long should Roxzone take me? | HYROX | Tool (HYROX pacer) | 4 |
| 12 | How hard should I go on the SkiErg? | HYROX | Table (pace vs finish time) | 4 |
| 13 | HYROX weights by division, 2026/27 | HYROX | Table (facts registry) | — |
| 14 | Should I lift or run first on the same day? | Running + lifting | Coach's note + table | 17 |
| 15 | How long between heavy squats and a hard run? | Running + lifting | Tool (week planner) | 12 |
| 16 | Can I do legs the day before a long run? | Running + lifting | Tool (week planner) | 14, 19 |
| 17 | How should I set up a 3-day running and lifting week? | Running + lifting | Tool (week planner, 3 days) | 11 |
| 18 | What does a 4-day hybrid week look like? | Running + lifting | Tool (week planner, 4 days) | 13, 20 |
| 19 | Does running kill strength gains? | Running + lifting | Coach's note + sources | 17, 24 |
| 20 | How do I keep my strength while training for a marathon? | Running + lifting | Workout | 16 |
| 21 | Zone 2 or intervals: which helps a lifter more? | Running + lifting | Table | 15 |
| 22 | How much should a lifter run to get a faster 5k? | Running + lifting | Tool (VDOT) | 18 |
| 23 | Which gym exercises make you a faster runner? | Running + lifting | Workout | 28 |
| 24 | Should beginner runners lift, and what first? | Starting out | Workout | 23 |
| 25 | How do I test my hybrid fitness baseline? | Starting out | Tool (strength and engine test) | 30 |
| 26 | Am I strong enough for HYROX Open? | Starting out | Tool (strength and engine test) + facts | — |
| 27 | Open or Pro: which division should I enter? | Starting out | Table (facts registry) | — |
| 28 | Singles or doubles for a first HYROX? | Starting out | Table (facts registry) | — |
| 29 | How should I taper in HYROX race week? | Starting out | Table (week plan) | — |
| 30 | How do I peak for three ATHX zones on one day? | ATHX | Workout | 26 |
| 31 | One session for kettlebells and running | Starting out | Workout | 29 |
| 32 | Functional fitness or hybrid training: what's the difference? | Starting out | Table. Low priority (AI answers will take most clicks) | 27 |

**Not on the list:**

- **Seed 9** ("good time by age"): held until real results data exists.
- **Seeds 21, 22 and 25:** expansions of `/hybrid-training-program`,
  `/athx-2027` and `/hyrox-training-plan`. They are refresh tasks, not new pages.
- **"How many weeks for a first HYROX?":** already answered on
  `/how-to-train-for-hyrox`. A pillar FAQ at most.

**Order:**

- Start with the 23 articles that need no new tool (1–9, 13, 14, 19–24 and
  27–32), about eight weeks of work.
- Bring in the week-planner articles (15–18) and the strength and engine test
  articles (25, 26) as those tools ship in Phase 2.
- Bring in the pacing articles (10–12) once decision 2 is made. Article 12's
  table is a station-level target, so it touches the Pacing Pack too.

---

## 10. Decisions

**Decided:**

- **Cadence:** three a week, short, one point each.
- **Review:** an email per article; you approve or comment, and never publish
  without approval.
- **gum:** used as the research desk and for the weekly harvest from your
  computer.

**Still open** (my recommendation follows each):

1. **Byline.** Your real name, and the experience and credentials you are happy
   to state.
2. **Pacing Pack versus the free HYROX pacer.** Option (b) in section 5.3.
3. **Strength and engine test thresholds.** Yours to set, with worked examples.
4. **Where articles live.** Firestore plus admin review. I'm proceeding on this
   unless you say otherwise.
5. **Writer and reviewer models.** Gemini writes and Claude reviews.
6. **Week planner: standalone, or the plan finder's result?** Standalone first.
7. **PostHog.** No.
8. **Trial length.** `/app` says 14 days and `llms.txt` says a month. Pick one.
9. **"Over 2,000 athletes".** Verify it or drop it.
10. **App work in hybridx-app.** Signup source and seed hand-off now; links at
    store launch.
11. **Athlete questions as a topic source.** Later, after a privacy review.
12. **The computer that runs gum weekly.** A Mac you sign in to most weeks. If
    there isn't one, use the server-side fallback in section 4.11.
13. **A Google Ads account and developer token for Keyword Planner.** Apply now:
    approval takes time, and the harvest works without it meanwhile.
14. **Publishing days and notification hours.** Monday, Wednesday and Friday at
    07:00, with emails between 07:00 and 20:00.
15. **Review address.** Your admin address, unless you want a separate inbox.

---

## 11. Phased build plan

Sizes: **S** is about one focused session or PR, **M** two or three, **L** four or
more.

### Phase 0: research desk and facts (S, plus your time). Start now

- **gum on your computer** (section 4.11, role 1; setup in section 12). Then use
  it with Claude Code to:
  - export the Search Console baseline;
  - list striking-distance queries for refresh;
  - check UK volume for the section 9 list once Keyword Planner is available.
- **Decisions** 1, 4, 8 and 9.
- **Confirm the 2026/27 HYROX standards** for every division against the
  official rulebook.
- **Build** `src/lib/facts/` and its tests.
- **Fix** the trial-length and claims inconsistencies.
- **Done when:** facts have tests, the site states one trial length, and you have
  a baseline and a first refresh list.

### Phase 1a: articles on the site, written by hand (M)

- **Build:**
  - the block schema;
  - the Firestore store with revisions and comments;
  - `/guides` and `/guides/[slug]`, the block components, `RelatedGuides` and
    the author box;
  - the sitemap and its test;
  - Firestore rules and indexes (deployed by hand to `hybridx-hub`).
- **The review page** in `/admin/guides`: preview, approve with publishing
  slots, comment, edit and reject.
- **14-day admin sign-in** (the IAM grant plus session cookies).
- **Done when:** an article you write in admin publishes into a slot in seconds,
  with no build.

### Phase 1b: AI drafts on request, with the email loop (M)

- **Build:**
  - the brief, draft, checks and model-review stages;
  - "Draft this question" in admin, where you type a question;
  - the quota scheduler;
  - the review email;
  - the revision loop driven by comments;
  - the pause switch and `CONTENT_ENGINE_MODE`.
- **Tests:** the checker against bad drafts (wrong weights, a missing proof
  element, unknown links, banned phrases, over-length).
- **Done when:** you type a question and get a checked draft by email; a comment
  produces a revised draft and a second email; approval schedules it.
- **Run it for 2–3 weeks on the section 9 list** before automating topic choice.

### Phase 2: tools (M per tool)

- **The week planner first.** Then the strength and engine test (after decision
  3), then the HYROX pacer (after decision 2).
- **Done when:** each tool has its own indexable page, can be embedded with
  presets, and captures leads with a correct `placement`.

### Phase 3: automatic topic choice via the weekly harvest (M)

- **Build:**
  - `scripts/content-harvest.ts`;
  - the `launchd` agent and instructions for it;
  - `/api/content/harvest` with `CONTENT_HARVEST_SECRET` (create and grant it
    before the `apphosting.yaml` entry merges);
  - grouping and routing into new, refresh and FAQ-on-pillar;
  - scoring, and the queue in admin;
  - the refresh list.
- **Done when:** a Sunday harvest from your computer reorders Monday's queue, and
  a missed week changes nothing but the "last harvest" date.

### Phase 4: measurement (M)

- **Build:**
  - GA4 events and their custom definitions;
  - `guideMetrics` from the harvest;
  - `/admin/guides/performance`;
  - link suggestions through the review flow.
- **Optional:** the first-party tracker v2.

### Phase 5: the app hand-off (M, mostly in hybridx-app)

- Signup source capture and the signed seed token.
- The CTA registry.
- At store launch: universal links and app links, store badges after signup, and
  campaign links.

### Phase 6: the 90-day review

Check the stop rules. Only if they hold, consider more than three a week.

---

## 12. Setup outside the repo

**gum, on your computer:**

- [ ] Install a pinned release from the qualified tap (`brew install
  ehmo/tap/gum`, not `brew install gum`). Read `install.sh` before using the
  script route.
- [ ] Google Cloud: create a **Desktop app** OAuth client and enable the Search
  Console API (later the Google Ads API). Use the `hybridx-hub` project or a
  separate personal one.
- [ ] **OAuth consent screen: set the publishing status to "In production".**
  Left in "Testing", Google expires the refresh token after seven days and the
  weekly harvest fails. As the only user, you'll see an "unverified app" warning
  once, at sign-in. If hybridx.club runs on Google Workspace, an *Internal* app
  avoids that.
- [ ] `printf '%s' "$SECRET" | gum auth use-oauth-client --client-id … --secret-stdin`,
  then `gum login --service searchconsole`, then `gum doctor`.
- [ ] `gum setup --target claude --scope user --features skills,mcp`. Use the
  user scope, not project.
- [ ] Later: a Google Ads account, a developer token application, `gum auth
  use-ads-developer-token`, and `gum login --service googleads`. Keyword
  Planner may return coarse volume ranges for an account with no ad spend; check
  what yours returns.

**Search Console:**

- [ ] `sc-domain:hybridx.club` exists and is verified, and the sitemap has been
  submitted once.

**The site (`hybridx-hub`):**

- [ ] Grant the App Hosting backend's service account "Service Account Token
  Creator" on itself, for 14-day admin sessions.
- [ ] `CONTENT_HARVEST_SECRET`: create it **and** grant it to backend
  `hybridx-web-x` before the `apphosting.yaml` entry merges (CLAUDE.md, "Deploy
  gotchas"). Store the same value in your computer's keychain for the harvest
  script.
- [ ] Firestore rules and indexes deployed by hand, plus a TTL policy where
  documents carry `expiresAt`.
- [ ] A budget alert on the Gemini key.
- [ ] GA4 custom definitions for the new events.

**Elsewhere:**

- [ ] hybridx-app: section 6.3, and later 6.4.
- [ ] CLAUDE.md: a "Guides" section once Phase 1a ships, and a note on the gum
  harvest.

---

## 13. Errors in the proposal, for whoever builds this

- **OAuth "Testing" status** (its step 1, "add your Google account as a test
  user"): refresh tokens expire in seven days, which breaks any scheduled
  harvest.
- **`gum setup --scope project`** writes config every Claude Code session loads,
  including cloud sessions without gum. Use the user scope.
- **A daily headless runner** (GitHub Actions or cron on a server) cannot use
  gum's Search Console operations: they are `byo_oauth` only, with the token in
  the keychain.
- **`response_mime_type="application/schema+json"`:** Gemini structured output
  expects `"application/json"` with `response_schema`.
- **`model="gemini-2.5-pro"` is hard-coded.** Pin whatever is current in one
  constant.
- **`recommended_calculator` is hard-coded** to `"SplitBuilder"` for every
  Search Console topic.
- **Deduplication is by exact string,** and only against the engine's own
  output. The `page` dimension is never requested.
- **The ranking is weak.** A 15-impression threshold and impression-only sorting
  ignore position and click-through opportunity.
- **The whole registry is pasted into every prompt.**
- **The model chooses the slug.**
- **Errors are caught and `print`ed,** so failures go unnoticed.
- **Daily sitemap resubmission** is unnecessary, and URL inspection does not
  request indexing.
- **`linker.py` appends to published files.**
- **`trends.daily`** is news trends, not topic research.
- **The palette is teal, and the domain is `hybridx.app`.**
- **The "Master Build Tracker" is empty in the .docx.**

---

## 14. What I could not verify, and sources

**Not verified:**

- **gumcli.dev itself.** This session's network blocks it. The GitHub repository
  was readable, and the gum statements above come from its v2.3.1 source and
  docs.
- **gum on Windows or WSL.**
- **The official HYROX 2026/27 rulebook.** Secondary sources only.
- **App Hosting's request timeout.**
- **What Keyword Planner returns for an account with no ad spend.**
- **The source of the "2,000 athletes" figure.**

**Sources:**

- gum: [github.com/ehmo/gum](https://github.com/ehmo/gum). See `README.md`,
  `docs/auth.md`, `docs/paths.md` (keychain bounds),
  `docs/auth-guides/search-console.md`, `docs/auth-guides/google-ads.md`,
  `docs/services/trends.md`, and `apps/gum/internal/auth/composite.go` and
  `apps/gum/internal/embedded/catalog.json` (auth strategy per operation).
- Google: [FAQ structured data](https://developers.google.com/search/docs/appearance/structured-data/faqpage);
  [Changes to HowTo and FAQ rich results (Aug 2023)](https://developers.google.com/search/blog/2023/08/howto-faq-changes).
- On 2026 spam enforcement (secondary):
  [PPC Land: spam policies cover AI Overviews and AI Mode](https://ppc.land/google-spam-policies-now-officially-cover-ai-overviews-and-ai-mode-in-search);
  [PPC Land: scaled content abuse](https://ppc.land/scaled-content-abuse/);
  [SEO Sherpa: June 2026 spam update](https://seosherpa.com/googles-june-2026-spam-update-has-finished-rolling-out/).
- HYROX weights (secondary; confirm against hyrox.com):
  [Red Bull: HYROX weights overview](https://www.redbull.com/gb-en/hyrox-weights-overview);
  [RunDida: HYROX weights by division](https://rundida.com/tools/hyrox-weights/).
- The repos: this repo at `4b70c7f`; `xhybrid-dev/hybridx-app` (`capacitor.config.ts`,
  `docs/MOBILE_RELEASE.md`, `src/hooks/use-native-app.ts`,
  `HYBRIDX_BRAND_BRIEFING.md`).
