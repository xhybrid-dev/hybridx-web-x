# The content engine: the plan we're working to

**Status:** plan only. Nothing here has been built.
**Last revised:** 10 November 2026.
**Built from:**
- a review of "HybridX mega strategy" (.docx), called *the proposal* below;
- this repo at `4b70c7f`;
- a read-only look at `xhybrid-dev/hybridx-app`;
- the source of `gum` (`github.com/ehmo/gum`, v2.3.1).

**How to use this document:**
- Section 3 is the build, step by step, and what each of us does at each step.
- Sections 4 to 9 are the design those steps implement.
- Sections 10 to 12 record why the proposal was changed, and the setup outside
  the repo.

---

## 1. The short version

**What we're building:**

- Three short articles a week, each making one point.
- Drafted by AI from real search data and checked by code against the facts.
- Emailed to you; you approve or comment.
- Published on hybridx.club in a set slot.
- Each article leads into a free tool, and the tool leads into an email signup
  and then the app.

**Already decided:**

- **Three a week, short, one point each.**
- **An email when each is ready.** You approve or comment, and a comment
  produces a revision. Nothing publishes without your approval.
- **Articles live in Firestore** behind an admin review page, not in git, so
  publishing takes seconds and a bad draft can't break the site's build.
- **No PostHog.** The existing GA4, server-side lead records and first-party
  analytics cover it.
- **Google data is fetched by the server, not by gum** (section 10.3). Nothing
  depends on a computer at home being switched on.
- **The facts the engine starts from** (owner, 10 November 2026):
  - **The trial is 14 days.** It was a free first month until it was cut to
    improve retention.
  - **"Over 2,000 athletes" is true and usable,** worded as athletes who *have
    trained with HybridX plans*. Most are buyers of the paperback plans, so it
    is never an app or subscriber count.
  - **Articles are by "HybridX".**

---

## 2. Decisions still needed, and when

Each decision is listed against the step it blocks. My recommendation is in
italics.

| # | Decision | Needed before |
|---|---|---|
| D1 | ~~Byline~~ **Decided:** "HybridX" | Step 2 |
| D2 | ~~Trial length~~ **Decided:** 14 days | Step 1 |
| D3 | ~~"Over 2,000 athletes"~~ **Decided:** true, worded as athletes who have trained with HybridX plans | Step 1 |
| D4 | ~~Publishing slots~~ **Decided:** Monday, Wednesday and Friday at 07:00; emails 07:00–20:00 | Step 3 |
| D5 | ~~Review address~~ **Decided:** the admin address (editable in settings) | Step 4 |
| D6 | ~~The reviewer model~~ **Decided:** Claude reviews Gemini's drafts. Needs `ANTHROPIC_API_KEY` (step 4), which also switches on the dormant monthly analytics review | Step 4 |
| D7 | Week planner: standalone, or the plan finder's result screen. *Standalone first* | Step 5 |
| D8 | Strength and engine test: your thresholds and three worked examples | Step 8 |
| D9 | The HYROX pacer versus the £5 Pacing Pack. *A free tool for run splits and budgets; the station-by-station table emailed or in the pack until 14 March 2027* | Step 9 |
| D10 | A Google Ads account and developer token for Keyword Planner volumes. *Apply early; nothing waits on it* | Step 10 |
| D11 | The app-side work in hybridx-app (section 7.3) | Step 11 |

---

## 3. The build, step by step

**How each step runs:**

1. I build it on a branch, with tests, `npm run typecheck` and a local production
   build, and tell you what the step needs from you.
2. Anything that has to happen *before* merging (a secret, an IAM grant,
   Firestore rules) is listed under **You, before merge**. CLAUDE.md explains
   why order matters: a `secret:` entry for a secret that doesn't exist yet
   fails the entire build.
3. You merge, and App Hosting deploys.
4. You run the **Check on the live site** items, and we move to the next step.

Steps 1–4 get articles flowing. The rest add tools, automation and measurement,
and their order can change.

### Step 1: facts registry and claims fix (S). Built

- **Builds:**
  - `src/lib/facts/hyrox-standards.ts`:
    - station work, and loads for the four singles divisions;
    - `LOADS_CHECK`: confirmation status and sources;
    - `UNCOVERED_FORMATS`: doubles and relay, left out because secondary
      sources disagree on mixed doubles, so the engine won't state their loads;
  - `src/lib/facts/product.ts`:
    - price, a 14-day trial, what the app does, and store availability (not yet
      published);
    - the athlete count with its wording, and the article author;
    - a `NOT_CLAIMED` list;
  - `src/lib/facts/index.ts`: re-exports the 2026/27 rules and the ATHX zones
    from their existing files;
  - fixes: "first month free" in `public/llms.txt` (three places), and the
    athlete line in `llms.txt` and the homepage hero ("currently using" became
    "have trained with HybridX plans").
- **Tests:** `facts.test.ts`:
  - station order and work match both `hyrox-rules-2026.ts` and the watch's
    `race-content.ts`;
  - the load ladder holds: Women Pro equals Men Open, and Pro is heavier than
    Open;
  - a scan of all site copy for any trial length, monthly price or athlete
    count that disagrees with `product.ts`. It caught the three stale lines
    before the fix.
- **You, before merge:** compare the four rows in `DIVISIONS` with the official
  2026/27 Singles rulebook (hyrox.com is blocked from my session). If they match,
  I set `LOADS_CHECK.confirmedOn`; if not, I correct them. Until then the engine
  treats them as unconfirmed.
- **Check on the live site:** `/llms.txt` says 14 days, and the homepage badge
  reads "Over 2,000 athletes have trained with HybridX plans".

### Step 2: articles on the site (M). Built

- **Builds:**
  - `src/lib/guides/types.ts`: the block schema (zod, section 6.4). It refuses a
    workout without both options and their RPE and rest, more than three FAQs,
    table rows that don't match the header, an unknown tool or CTA, and any link
    outside the topic map;
  - `src/lib/guides/inline.ts`: the only formatting text may carry (bold,
    italic, links), parsed into tokens so article text is never HTML;
  - `src/lib/guides/store.ts`: Firestore reads and writes. Each save is
    numbered in a transaction and copied to `guideRevisions`. A five-minute
    in-memory cache serves the public list, and a malformed document is skipped
    and logged, never served;
  - `src/lib/guides/topics.ts`: the pillars, every page an article may link to,
    and the tools it may point to. Owned queries per page come at step 6;
  - `src/lib/guides/related.ts`, `ctas.ts` (the two calls to action, worded
    from the facts registry) and `schema.ts`. The JSON-LD has the Article by
    HybridX, a breadcrumb, and a WebPage with Jon Lee as `reviewedBy`. ATHX
    articles never mention HYROX in their structured data;
  - `src/lib/guides/fixtures.ts`: two sample articles in the short format.
    `GUIDES_FIXTURES=1 npm run dev` previews the pages with them (ignored in
    production), and step 4 will show them to the model as the worked example;
  - `src/components/guides/`: the block components, the byline ("By HybridX ·
    Reviewed by Jon Lee, HybridX trainer · Updated <date>"), and the
    `guide_engaged` event;
  - **pages:**
    - `/guides`, the hub: each pillar's hand-built guides, then its
      articles;
    - `/guides/[slug]` and its OG image;
    - `/guides/how-we-write`: who reviews the articles, that they are drafted
      with AI from the HybridX method, how facts are checked, and how to report
      a correction;
  - **`sitemap.ts`:** published articles with their real dates. The static pages
    no longer carry a fake "now", and the route is now `force-dynamic` so the
    build never reaches for Firestore;
  - **navigation:** "All Guides" in the header's Guides menu and in the footer,
    and the hub in `llms.txt`;
  - **GA4 events:** `guide_engaged` (half the article read), `guide_tool_click`
    and `guide_cta_click`.
- **Changed from the original plan:**
  - **Revisions** live in a top-level `guideRevisions` collection, not a
    subcollection: same data, and testable with the existing in-memory
    Firestore.
  - **No Firestore rules change** was needed. The existing rule already denies
    all client access to every collection.
  - **A retired article** without a redirect returns 404, not 410.
  - **The tool block** renders as a link card to the tool until step 5 makes
    tools embeddable.
  - **The pillar pages don't list their articles yet**; the hub does. Adding
    "Questions answered" to `/how-to-train-for-hyrox` and the others would turn
    those static pages dynamic. To decide at step 4, once articles exist.
- **Tests:** `guides.test.ts` (23) and four new sitemap tests:
  - inline parsing, HTML treated as text, and the link allowlist (including
    `javascript:` and protocol-relative links);
  - every schema rule above;
  - revision numbering;
  - drafts never served;
  - a malformed document skipped;
  - related-article order;
  - the structured data;
  - every linkable page present in the sitemap;
  - the sitemap still answering, without articles, when Firestore fails.
- **Checked by hand:**
  - screenshots at phone and desktop widths, with no horizontal scroll;
  - a three-column table that fits a phone;
  - one title suffix per page;
  - no hydration errors in a production build;
  - no Google credential lookups during the build.
- **You, before merge:** nothing.
- **Check on the live site:**
  - `/guides` lists the hand-built guides under five headings;
  - `/guides/how-we-write` reads as you want it to;
  - "All Guides" appears in the header and footer;
  - `/sitemap.xml` still lists every page.

  Real articles arrive from step 3, when you can write one in admin, and from
  step 4 by email.

### Step 3: the review page, publishing slots and longer sign-in (M). Built

- **Builds:**
  - **`/admin/guides`, the queue:** waiting for you, scheduled (with each
    slot), published, and turned down or retired, plus the next free slot. It is
    linked from the leads admin.
  - **`/admin/guides/<slug>`, the review page:**
    - the article rendered exactly as it will appear, block by block and
      numbered;
    - the point and the search description;
    - **Approve for <next slot>**, or **Publish now**;
    - take it out of its slot;
    - **Comment** on the whole article or one block;
    - **Turn down** (a reason is required);
    - **Retire** a published article, optionally sending its readers to
      another page on the site;
    - its revision history.

    `?action=approve` and `?action=comment` (the review email's buttons, step
    4) highlight and focus that part. Neither acts by itself.
  - **`/admin/guides/<slug>/edit`, the editor:**
    - a small form per block; lists, workout steps and table rows are one per
      line;
    - move, delete and add blocks;
    - saving runs the article schema and lists problems in plain words by block
      number ("Block 4 (workout) racePace.rest: is empty").
  - **`/admin/guides/new`:** a title and a topic make a draft with placeholder
    text, which cannot be approved until it is replaced. This is how you write
    one yourself.
  - **`/admin/guides/settings`:** publishing days and time (UK), email hours,
    the review address, and Pause. Pause stops new drafts and emails; articles
    already approved still go live, which is how a week away is covered.
  - **`src/lib/guides/slots.ts`:** Monday, Wednesday and Friday at 07:00 UK
    time, one article per slot. Tests cover both clock changes: Monday 29 March
    2027 publishes at 06:00 UTC.
  - **Going live exactly at the slot:** a scheduled article is public from its
    slot when the page is read, so it goes live at 07:00 however late the hourly
    job runs. The hourly job (`publishDueGuides`) then records it as published.
  - **Review rules** in `src/lib/guides/review.ts`, and server actions in
    `src/app/admin/guides/actions.ts`. Every action is a POST and re-checks the
    admin session; a status change never counts as a content revision.
  - **14-day admin sign-in:**
    - Firebase session cookies, falling back to the old one-hour sign-in until
      the IAM grant below exists, so admin never breaks;
    - cookies issued before the change still work;
    - sign-in returns to the page that asked for it (`?next=`, admin pages
      only);
    - the Guides header says which kind of sign-in you have.
- **Tests:** `guides-admin.test.ts` (slots, state, comments, settings),
  `guides-review.test.ts` (review rules and actions) and `admin-auth.test.ts`
  (sign-in and return path). The whole suite has 562 tests.
- **Checked by hand:**
  - the full flow in a browser, against an in-memory Firestore: comment on a
    block, approve into Wednesday 07:00, the article not public before its
    slot, edit to revision 2, a broken edit refused by block number, a new
    article's placeholders blocking approval, and the settings;
  - no page errors.
- **You, after merge** (admin works without it; it only turns the one-hour
  sign-in into 14 days):

  ```bash
  gcloud services enable iamcredentials.googleapis.com --project=hybridx-hub
  SA=$(gcloud run services describe hybridx-web-x --region=europe-west4 --project=hybridx-hub \
    --format='value(spec.template.spec.serviceAccountName)')
  echo "$SA"   # usually firebase-app-hosting-compute@hybridx-hub.iam.gserviceaccount.com
  gcloud iam service-accounts add-iam-policy-binding "$SA" \
    --member="serviceAccount:$SA" --role="roles/iam.serviceAccountTokenCreator" --project=hybridx-hub
  ```

  Then sign out and in again. The Guides header should say "stays signed in
  for 14 days".
- **Check on the live site:**
  - `/admin/guides` shows an empty queue and the next free slot;
  - New article, then edit it, approve it, and see it go live at the slot, or
    Publish now and see it at `/guides/<slug>`.

### Step 4: AI drafting and the email loop (L). Built, switched on 10 November 2026

- **Builds** (`src/lib/guides/`):
  - **`bible.ts`:** the coaching bible, drawn from your published method (three
    weekly pillars, 12-week phases, 6–8 hours between strength and hard
    running, 80/20, the 10% rule, deloads, a 40–50% taper, fuelling) and the
    brand voice (UK English, no em dashes). It also lists the banned phrases,
    US spellings and medical words the checks catch. **Yours to correct:** it
    is the standing instruction for every draft.
  - **`candidates.ts` and `queue.ts`:** the 32 starting questions, seeded once
    into `guideTopics`. Nine wait for a tool that isn't built yet (week planner,
    strength and engine test, HYROX pacer) and are passed over until it is.
  - **`checks.ts`:** the deterministic checks (section 6.3):
    - **errors:** the answer is not first or has no number; no proof element; a
      coach's note written by the model; out of length; banned phrases; medical
      claims; a race load, wall ball weight or target that disagrees with the
      registry (training loads are left alone); relay loads; product claims
      (price, trial, store apps, partnership, guarantees, user counts, "most
      affordable"); em dashes and spaced en dashes; a duplicate title;
    - **warnings for you:** US spelling (including -ize endings, "program" and
      "fiber"), more than four sections, a long title, no link to the topic
      page, no CTA, heavy overlap with a published article;
    - **how words are matched** (Jon's review, 10 November 2026): banned
      phrases, medical words and spellings match as whole words, with curly
      apostrophes read as straight, so "secure" is not "cure" and "it’s not
      just about" is caught. Two deliberate gaps: "tire" is correct British
      English for getting tired, and "meter" is only wrong after a number
      ("400 meters"), since a power meter is a meter in Britain too.
  - **`engine/`:**
    - `prompts.ts`: each brief carries only that topic's facts (no HYROX facts
      for ATHX), the allowed links, tools and CTAs, the published titles, and
      the sample article as the worked example of the format;
    - `shape.ts`: the model's loose JSON becomes strict typed blocks, then must
      pass the article schema;
    - `models.ts`: Gemini writes, through the existing Genkit setup; Claude
      reviews, through the same model and call pattern as the monthly analytics
      review, with refusal fallback;
    - `run.ts`: the state machine;
    - `live.ts`: the real dependencies.
  - **`email.ts`:** the Ready, Revised, Still waiting and Needs you emails:
    - the whole article, escaped, with blocks numbered;
    - the findings first;
    - Approve and Comment buttons that only open the review page.
- **How a tick goes (hourly, within the maintenance job):**
  1. Advance a draft under way: checks, with one fix if they fail. Then, on a
     tick of its own, the review, with one fix for serious notes.
  2. Otherwise, revise an article you commented on (at most three rounds, then
     "Needs you").
  3. Otherwise, draft the next topic if the pipeline has room: fewer than two
     waiting for you, and fewer than three waiting or scheduled ahead.
  4. Send due emails, within your email hours.

  At most two model calls per tick, and a lease lock. Pause stops all of it.
  An email is dropped if you have already dealt with the article.
- **Admin:**
  - **`/admin/guides/topics`:** the queue. Move up and down, skip with a reason,
    put back, or add your own question to the front.
  - **The review page** shows what the checks and the reviewer found.
  - **A comment, with the engine on,** sets the article to "being revised" for
    the next tick.
  - **Settings** say whether the engine and the reviewer key are on.
- **Tests:** `guides-checks.test.ts` (24), `guides-engine.test.ts` (23,
  stand-in models) and `guides-queue.test.ts` (6). The whole suite has 609.
- **Checked by hand:** the Topics page (load, add, reorder, skip) and the
  findings panel in a browser, against an in-memory Firestore.
- **Safe to cut off** (added when switching on): App Hosting's request time
  limit could not be confirmed, so the engine assumes a tick can be killed at
  any moment:
  - every model call is counted before it starts, so three cut-off reviews
    mean "review skipped" rather than a retry every hour;
  - no new call starts more than 25 seconds into a tick;
  - the next tick puts a topic stuck "drafting" back in the queue, and gives a
    draft saved without its run a new one;
  - without the reviewer key, a draft is emailed in the same tick rather than
    waiting an hour for a review that cannot happen.
- **Not yet run against the real models.** There are no API keys in my session,
  and a real run spends money, so the first live draft is the real test. It is
  safe to try, because nothing publishes without you.
- **You, to switch it on** (in this order):
  1. Optional but recommended, the second reviewer:

     ```bash
     echo -n "<key>" | firebase apphosting:secrets:set ANTHROPIC_API_KEY --project hybridx-hub
     firebase apphosting:secrets:grantaccess ANTHROPIC_API_KEY --project hybridx-hub --backend hybridx-web-x
     ```

     Then tell me, and I add its binding to `apphosting.yaml`. The binding
     must never land before the secret exists (CLAUDE.md). Without the key,
     drafts arrive saying the second review was skipped. This key also
     switches on the dormant monthly analytics review.
  2. A budget alert on the Gemini key's billing account.
  3. `CONTENT_ENGINE_MODE` from `"off"` to `"on"` in `apphosting.yaml` (a
     deploy).

  The first draft arrives an hour or two later. Watch the first few closely.
- **Changed from the original plan:**
  - The brief is assembled by code, not by a separate model call.
  - The review waits for a tick of its own.
  - The pipeline rule ("two waiting, three in hand") replaces "three this
    week", so drafts keep pace with slots rather than calendar weeks.

### Step 4b: links between articles (S–M). Built

Added after step 4, at your request (10 November 2026): a new article should be
linked *from* the older ones, not only link back to them.

- **Relatedness** (`src/lib/guides/related.ts`): the content words two articles
  share in their title, point and description, plus a bonus for the same
  pillar. Words every article uses ("hyrox", "training", "race") count for
  nothing. Deterministic; a pillar in common is not enough on its own.
- **New → older:**
  - the brief lists the published articles most related to the question and
    asks for a link to one or two, in the body text, with link words that say
    where they go;
  - the bible says the same, and caps an article at five links, once each;
  - the checks warn when a related article exists and none is linked, when a
    link points to an article that is not published (it would show as plain
    text), and on repeated or too many links.
- **Older → new** (`src/lib/guides/backlinks.ts`):
  - when you approve an article, the next tick picks up to three related
    published articles that do not already link to it, and asks the drafting
    model for one paragraph in each where the link reads naturally;
  - a suggestion may only turn existing words into the link, or add one
    sentence of at most 30 words at the end of the paragraph. Code refuses
    anything else: changed words, a lost link or format, a second link,
    "click here", or new problems for the draft checks;
  - you get one email per new article with the suggestions, the link marked,
    and accept or skip each on its review page (`#links`);
  - an accepted link goes in only once the new article is live, applied by the
    hourly job whether the engine is on or not, as a new revision of the older
    article. That moves its date in the sitemap when the link appears. If the
    paragraph has changed since, the suggestion is marked stale, never forced;
  - one model call per new article, counted before it starts, three tries at
    most; nothing to ask about means no call at all;
  - only approved articles, and ones published in the last 14 days, are
    offered links, so no backlog is proposed at once.
- **Pillars → articles:** the five pillar pages list their newest eight
  articles under "Questions answered", with a link to the rest on `/guides`.
  The pages are built ahead of time and refreshed hourly (`revalidate`), and
  `listPublishedGuidesOutsideBuild` returns nothing while the site is built,
  so no Firestore read happens in a build. A fresh deploy shows the list from
  its first refresh, within the hour.
- **The related box** under each article ranks by relatedness, not by date.
- **Firestore:** `guideLinkProposals/{target}__{source}`, one per suggestion,
  and `guideBacklinks/{target}`, where the engine is with each new article.
  Both are covered by the existing deny-all rule.
- **Tests:** `guides-links.test.ts` (relatedness, the brief, the checks, every
  rule a suggestion must pass) and the engine tests (asking once, refusing,
  cut-off calls, applying only when live, stale paragraphs, the email).
- **You:** nothing before merge. The first suggestions arrive after the first
  article you approve, once a related one is published.
- **Value, honestly:** links from older, already-indexed pages help Google find
  a new page sooner, and contextual links in the text count for more than a
  box at the foot of the page. It is ordinary good internal linking, worth
  more as the library grows past about thirty articles; overdone, it reads as
  spam, which is why every link is yours to approve.

### Step 5: the week planner (M)

- **Builds:**
  - `src/lib/calculators/week-planner.ts`, the rule engine;
  - its page under `/calculators/`, its embed block, and `.ics` export;
  - a magnet entry in `src/lib/magnets.ts` ("Email me this week and the next
    three");
  - a mapping of goal and day count to app programmes.
- **Tests:** every input combination against every rule (section 5.1); the
  magnet tests that already exist.
- **You, before merge:** D7, and confirm the session rules (minimum gaps between
  heavy legs and hard runs) in your own numbers.
- **Then:** candidates 15–18 enter the queue.

### Step 6: Search Console data, read by the server (M). Built, waiting for access

This is the loop the proposal's "circular" engine described: what people
actually search for decides what gets written next.

- **Built:**
  - `src/lib/google/search-console.ts`: search analytics (query × page, the 28
    days ending three days ago, paged), URL inspection and the property list,
    over REST with a read-only token from the runtime's own identity. Google's
    errors are translated into what to do (API disabled, no access, wrong
    property);
  - `/api/admin/search-console-check`: the identity in use, the properties it
    can see, whether ours is among them, and whether a query works;
  - `src/lib/guides/harvest/analyse.ts`: grouping (same content words, so
    "hyrox sled push weight" and "sled push weights hyrox" are one group; brand
    searches are left out), routing and scoring, as in section 4.5;
  - `src/lib/guides/harvest/run.ts`: a step of the hourly job, one stage per
    tick, that does real work once a week:
    1. harvest: groups, routes and scores the rows; puts the numbers on the
       topics they match; adds up to five new topics that nothing answers
       (at least 10 impressions, and only our subject: a search with no
       training word is never added); never re-adds a topic you skipped;
       reorders the queue; records each article's clicks, impressions,
       position and top searches;
    2. checks whether articles published in the last 60 days are indexed,
       eight per tick;
    3. emails you the weekly summary, within the email hours: clicks and
       impressions, what was published, what was added to the queue, the next
       three topics, pages to improve, and anything not indexed after a week;
  - the queue in four bands: your own questions and anything you moved up,
    then search demand by score, then the rest, then anything you moved down.
    So search decides the order only where you have not;
  - `/admin/guides/search`: the last harvest, pages to improve (ranking 4–20),
    articles that answer a search but searchers land elsewhere, searches
    nothing answers yet with "Add to the front", what already ranks top three,
    and each article's numbers and indexing; plus a CSV export;
  - a failed harvest (no access yet) is recorded with its reason and retried a
    day later, not every hour. Off when `CONTENT_ENGINE_MODE` is off; Pause
    stops the summary email.
- **Routing, in order:**
  - an article already answers it: top three is **owned**; 4–20 is
    **refresh** that article; otherwise **covered**, noting where searchers
    land instead;
  - a topic in the queue (or drafted, or skipped) answers it: **covered**, and
    the topic gets its numbers;
  - otherwise top three is **owned**; a page ranking 4–20 is **refresh** for
    that page, unless the search is a question landing on a broad page (home,
    hub, calculators), which wants an article; anything else is **new**.
- **Score:** impressions × room to climb (most for positions 4–10) × our
  subject (a training word in the search, or 0.2).
- **Not built from the original step:** pillar FAQ routing. Deciding that an
  answer fits in 150 words needs judgement; a search that wants it shows on
  the search page for you to decide.
- **Tests:** `guides-harvest.test.ts`: the client's paging and errors,
  grouping, scoring, routing, the bands, and the weekly cycle tick by tick
  against a fake Search Console.
- **You (the site works without it; the harvest just records "no access"):**
  1. `gcloud services enable searchconsole.googleapis.com --project=hybridx-hub`;
  2. add the App Hosting service account (section 4.4; the command in step 3
     prints it) to the Search Console property as a **Restricted** user;
  3. if the property is a URL-prefix property rather than a Domain property,
     say so: `SEARCH_CONSOLE_SITE` is then set to `https://hybridx.club/` in
     `apphosting.yaml` (a plain value, not a secret).
- **Check on the live site:**
  - `/api/admin/search-console-check` shows `property.found: true` and
    `query.ok: true`;
  - within the hour, `/admin/guides/search` shows the first harvest; the
    summary email follows a couple of ticks later.

### Step 7: performance page (S)

- **Builds:** `/admin/guides/performance`, one row per article (indexed, clicks,
  impressions, position, tool uses, CTA clicks, leads), with flags for "not
  indexed after 30 days" and "too few impressions after 90 days".
- **Tests:** the flag rules.
- **Before it ships:** the three-month baseline export for existing pages. It
  comes from step 6's data, or a manual export from Search Console beforehand.

### Step 8: strength and engine test (M)

- **Builds:**
  - `src/lib/calculators/strength-engine.ts`;
  - its page, embed and magnet.
- **Tests:** your worked examples, to the number.
- **You, before merge:** D8.
- **Then:** candidates 25–26 enter the queue.

### Step 9: HYROX pacer (M)

- **Builds:**
  - `src/lib/shop/glasgow-2027-pacing.ts` moved to a shared
    `src/lib/hyrox-pacing.ts`, with the Glasgow tests unchanged and green;
  - the station-time model and the strongest/weakest-station rule;
  - its page, embed and gating.
- **You, before merge:** D9, and the source for station times.
- **Then:** candidates 10–12 enter the queue.

### Step 10: Keyword Planner volumes (S–M). Optional, when D10 is ready

- **Builds:**
  - `src/lib/google/keyword-planner.ts`:
    `generateKeywordHistoricalMetrics` for queued candidates, UK and English,
    monthly, with the API version in one constant;
  - volumes feed scoring.
- **You, before merge:**
  - D10;
  - a one-time Google sign-in to produce a refresh token (the OAuth app must be
    "In production", section 11);
  - create and grant the secrets. The names are set in step 10.
- **Ongoing:** Google retires Ads API versions roughly yearly, so the constant
  needs a bump about once a year. A failing call shows in the summary email.

### Step 11: app hand-off (M, mostly in hybridx-app)

- **This repo:** the CTA registry `src/lib/guides/ctas.ts` and signed seed links.
- **hybridx-app:** section 7.3. At store launch, section 7.4.

### Step 12: the 90-day review

Check the stop rules (section 9.4). Change the cadence only if they hold.

---

## 4. Design: the system

### 4.1 Shape

```
                                      HYBRIDX.CLUB (App Hosting, hourly maintenance job)
 Search Console API ──┐   weekly
 Keyword Planner ─────┤ ───────▶  topics: group ▶ route (new / refresh / pillar FAQ) ▶ score ▶ queue
 (step 10, optional)  │                                                                   │
 Candidate list ──────┘                                    quota: 3 a week, ≤ 2 awaiting review
                                                                                          ▼
 Facts registry ─┐                     BRIEF ─▶ DRAFT ─▶ CHECKS ─▶ MODEL REVIEW ─▶ email to you
 Coaching bible ─┘                             (Gemini)  (code)    (Claude)             │
                                                                                         ▼
                          comment ─▶ REVISE ─▶ checks ─▶ review ─▶ email again    YOU: approve /
                          approve ─▶ next slot ─▶ /guides/<slug>, sitemap,        comment / reject
                                                  pillar links
```

Every stage is saved before the next begins, and one stage runs per hourly tick.
A failure stops that article and nothing else, and never publishes anything.

### 4.2 Firestore collections

All are server-only: the client has no access.

| Collection | Holds |
|---|---|
| `guides/{slug}` | Lifecycle: `status` (`drafting`, `awaiting_review`, `revising`, `approved`, `scheduled`, `published`, `retired`), `publishAt`, `redirectTo`. Content: `point`, `blocks`, `meta` (title, description, query group, pillar, proof element, tool, CTA). Provenance: `factsUsed`, `sources`, `author`, `reviewedAt`, `publishedAt`, `revision` |
| `guideRevisions/{slug}__{n}` | Every saved revision of every article (step 2). Comments go in `guideComments` (step 3) |
| `guideRuns/{id}` | Stage, inputs, model, tokens, check results, error |
| `guideTopics/{id}` | Candidate, query group, Search Console numbers, volume, kind, the page currently ranking, score, status, rejection reason |
| `guideHarvests/{date}` | Each weekly harvest |
| `guideMetrics/{slug}__{week}` | Clicks, impressions, position, indexing, tool uses, leads |
| `guideLinkProposals/{target}__{source}` | A suggested link from an older article to a new one: the paragraph before and after, and whether you accepted it and it went in (step 4b) |
| `guideBacklinks/{target}` | Whether links to a new article have been suggested yet, the tries, and when you were emailed (step 4b) |
| `contentSettings/engine` | Slots, email hours, review address, pause |

**Rendering:** the Admin SDK on the server, cached by tag, revalidated on
publish. Nothing reads Firestore at build time.

**Backups:** a scheduled Firestore export, plus "Export as Markdown" in admin.

### 4.3 What the engine reads

- **Facts registry, `src/lib/facts/`** (step 1). Every number in a draft is
  checked against it, and a changed fact lists the articles that used it.
- **Topic map, `src/lib/guides/topics.ts`** (step 2). This is how the engine
  knows which page owns which question.
- **Coaching bible, `src/lib/guides/bible.ts`** (step 4, section 8). A
  TypeScript string, so it is bundled. A runtime `.md` read would need
  `outputFileTracingIncludes`, the trap the race card's PDF already hit.

### 4.4 Google data, read by the server

**Search Console (step 6):**

- **Library:** `@googleapis/searchconsole`.
- **Scope:** `webmasters.readonly`. The account is added to the property as a
  **Restricted** user, so the credential *cannot* change anything in Search
  Console: read-only is enforced by Google's permissions, not by our code.
- **Identity, in order of preference:**
  1. The App Hosting backend's own service account, through Application Default
     Credentials. No key exists anywhere.
  2. If the diagnostic shows the runtime can't mint a token with that scope, a
     dedicated service account (not the Sheets one) whose key is in a secret,
     created and granted before the binding merges.
- **Quotas:** URL Inspection allows 2,000 calls a day per property; we use a
  dozen or so a week.
- **Limits:** inspection *reports* indexing and does not request it. The sitemap
  is submitted once, by hand.

**Keyword Planner (step 10):**

- **Calls:** Google Ads API `generateKeywordHistoricalMetrics` over REST.
- **Credentials:** a developer token, a customer ID, and a refresh token from a
  one-time sign-in, kept in secrets.
- **Narrowing what the token can do:** use an Ads account with no campaigns or
  billing, and give the signing-in user read-only access if Keyword Planner
  works at that level. We'll test that at step 10.

**Not used:**

- Google Trends: daily trending searches are news, not training questions.
- The Indexing API: Google allows it only for job-posting and livestream pages.

### 4.5 Topic selection (step 6 onwards)

1. Group the queries into near-duplicate groups.
2. Route each group:
   - **refresh:** one of your pages already gets the impressions. It goes on
     the refresh list, as a change to *that* page;
   - **pillar FAQ:** the honest answer is under about 150 words and needs no
     tool, workout or table. It becomes an FAQ entry on a pillar page;
   - **new:** no page owns the group, and the answer needs a proof element. It
     becomes an article candidate.
3. Score: Search Console impressions (or Keyword Planner volume) × position
   opportunity × business fit × not already owned.
4. Queue. You can reorder, veto with a reason (it is not offered again), or type
   in your own question.

Until step 6, the queue is the candidate list in section 9.

### 4.6 Operations

- **Kill switch:** `CONTENT_ENGINE_MODE` (`off` or `on`). The pause switch in
  admin is for holidays.
- **Timeouts:** each stage must finish well inside App Hosting's request
  timeout. Step 4 measures it.
- **Cost:** pennies per article at three a week. There is a budget alert, and
  tokens are capped per stage.
- **Status:** admin shows the queue, the last run, its stage, any error, and the
  last harvest.

---

## 5. Design: the tools

Rules common to all tools:

- The arithmetic lives in `src/lib/`, pinned by tests to worked examples.
- Styling uses the `hx` tokens, with a contrast check like `magnets.test.ts`.
- Defaults are server-rendered.
- Each tool gets its own indexable page under `/calculators/`, and an embed
  block with presets for articles.
- "Email me my result" is a magnet with `placement` set to the article or tool
  slug.

### 5.1 Week planner (step 5)

- **Inputs:**
  - days (3, 4 or 5);
  - goal (first HYROX, faster HYROX, ATHX, or 10k plus strength);
  - kit (full gym, basic gym, home, no sled);
  - long-run day.
- **Rules:**
  - minimum gaps between heavy lower-body work and hard running. The site
    already states HybridX's rule as at least 6–8 hours (`llms.txt`); that is
    the default unless you set numbers per pairing;
  - strength first when sharing a day;
  - no stacked hard days in a 3-day week;
  - kit substitutions.
- **Output:** a 7-day grid, `.ics` (`src/lib/ical-generator.ts`), and the
  magnet.
- **Honest CTA:** "HybridX has 3-, 4- and 5-day programmes built on these
  rules." Not "this exact schedule": the app picks from fixed programmes.

### 5.2 Strength and engine test (step 8)

- **A coach's heuristic,** not a validated model.
- **Inputs:** bodyweight; division; estimated 1RM for squat, deadlift and press
  (the one-rep-max formula); and a 5k time (the VDOT logic).
- **Output:** force-limited, engine-limited or balanced, each with an eight-week
  focus.
- **No true 1RM testing for beginners.**

### 5.3 HYROX pacer (step 9)

- **Reuse** the run-fade model behind the Glasgow preview.
- **Under D9:** run splits, the Roxzone budget and the total station budget are
  free. The station-by-station table is emailed, or in the Pacing Pack while it
  is on sale.
- **The CTA** is about training for the time. The app has no target finish time
  (section 7.3).

---

## 6. Design: articles and the review loop

### 6.1 Format: short, one point

| Part | Rule |
|---|---|
| Title | The question, or a direct claim. ≤ 60 characters |
| The answer | 2–3 sentences, with the concrete number, placed first |
| Why | 1–3 short paragraphs. Anything that doesn't serve the point is cut |
| **Proof element** | **Required:** a tool embed with presets, *or* one workout (beginner and race-pace options, RPE and rest), *or* a table from the facts registry. Plus your coach's note whenever you add one |
| Mistake to avoid | Optional, one paragraph |
| FAQ | 0–3 entries |
| Links | Up to its pillar page, one sideways link, and the CTA |
| Length | 350–800 words, aiming for about 600 |

The proof element is what keeps short articles from being thin, and from being
fully answered by Google's AI summaries.

### 6.2 Clusters

Each article links up to its pillar, and across to one or two related
articles. Each pillar page lists its articles ("Questions answered"),
refreshed hourly. When an article is approved, the engine suggests links to it
from up to three related older articles, and each goes in only if you accept
it (step 4b). Nothing else in a published page is rewritten.

| Pillar | Page |
|---|---|
| HYROX stations and race | `/how-to-train-for-hyrox` |
| Running and lifting together | `/hybrid-training-program` |
| Starting out | `/free-hyrox-plan` |
| ATHX | `/athx-2027` |
| Tools | `/calculators` |

### 6.3 The pipeline

**Quota.** A draft starts only when:

- fewer than two drafts await your review;
- fewer than three articles are approved, scheduled or published this week;
- the engine isn't paused.

**The stages:**

1. **Brief:** the point, the intent, the proof element, any tool, the CTA, the
   pillar and sideways links (from the topic map, so they are real URLs), and the
   relevant facts.
2. **Draft:** Gemini, structured output against the block schema, low
   temperature. The model is named in one constant.
3. **Checks** (code). A failure loops back to the model once, then is flagged
   for you:
   - **structure:** the schema and length band, one H1 and at most four H2s;
   - **content rules:** the answer comes first and contains a number; the proof
     element is present; every workout has both options with RPE and rest;
   - **accuracy:** numbers next to station names match the facts registry;
     product claims are product facts;
   - **links:** only allowlisted routes and domains;
   - **wording:** no banned phrases, no US spellings, no medical claims;
   - **originality:** not too similar to any existing article.
4. **Model review:** Claude scores the draft against the bible and lists
   problems with quotes. It does not rewrite. Serious problems go back for one
   fix before you see it.
5. **Email to you.**

### 6.4 Block format

| Block | Fields |
|---|---|
| `heading` | level (2 or 3), text |
| `paragraph` | inline bold, italic, and links to allowlisted routes or domains |
| `list` | ordered or not, items |
| `callout` | `tip`, `warning` or `coach-note`, text |
| `workout` | title, goal, `beginner {…}`, `racePace {…}`, rest, RPE, notes. Both options are required |
| `table` | header and rows, from the facts registry |
| `calculator` | tool id (an enum), presets |
| `cta` | variant id from the CTA registry |
| `faq` | up to three pairs, shown on the page |
| `sources` | references checked to exist |

There is no MDX and no raw HTML, because a Search Console query is text anyone
can influence and must never become code.

### 6.5 The email, and approve or comment

**The email** goes to the review address, within your email hours.

- **Subject:** "Ready to review: <title>".
- **Body:** the point, **the full article**, a one-line check summary, and the
  reviewer's notes.
- **Buttons:** **Approve** and **Comment** each open the review page with that
  action ready. **Neither acts when clicked.** Outlook Safe Links and Gmail
  prefetch every link in an email (CLAUDE.md), so a link that acted on a GET
  would let a scanner publish.

**On the review page:**

- **Approve:** the article goes into the next slot, or "publish now". A
  confirmation email follows with the live link.
- **Comment:** on the whole article or one paragraph.
  1. The model revises only the affected blocks.
  2. Checks and review run again.
  3. A "Revised: <title>" email lists what changed.
  4. After three rounds without approval, it stops and asks you to edit or
     reject.
- **Reject**, with a reason: the topic is retired.
- **Edit:** for a typo you'd rather fix than describe.

**Comments that apply to every article** are proposed monthly as changes to the
bible, for you to accept or decline.

**Nothing publishes without approval.** A draft waiting three days gets one
reminder; after 14 days it is archived, and you can revive it.

### 6.6 Pages and SEO

- **Metadata:** `createMetadata({ type: 'article' })` and a canonical URL.
- **Structured data:** JSON-LD `Article` (author as a `Person`, dates) and
  `BreadcrumbList`. FAQ JSON-LD is optional: FAQ rich results have been limited
  to government and health sites since 2023.
- **Trust signals:** "By HybridX · Updated <date>", linked to "How our guides
  are written".
- **OG image:** per article, kept out of `public/` (commit `b982d11`).
- **Retiring an article:** a permanent redirect to `redirectTo`, otherwise 404.

---

## 7. Design: conversion and the apps

### 7.1 The ladder

1. An article answers the question.
2. A tool gives a personal result.
3. "Email me my result" (a magnet).
4. A nurture journey built in `/admin/marketing/studio` (nothing to do in the
   app repo for a new slug).
5. Web signup, with the trial.
6. After signup, "get the app".

### 7.2 The CTA registry (step 11)

`src/lib/guides/ctas.ts` holds the variants. The model proposes one per article,
and you see it in review. Copy may only state product facts. One switch controls
store badges.

### 7.3 Work in hybridx-app (D11)

- **Signup source:** record it (UTM, seed, referrer) on the user document.
  Nothing is recorded today, so no trial can be credited to an article.
- **Seeds:** accept a signed seed (`/signup?seed=…`) or a lead's `extra`, and map
  it to a programme.
- **Target finish time:** only if the pacer's CTA is to promise "load this
  target".

### 7.4 When the store apps are published

- **Universal links and app links:**
  - `apple-app-site-association` and `assetlinks.json` on app.hybridx.club;
  - Associated Domains on iOS, and `autoVerify` intent filters on Android;
  - an `appUrlOpen` handler in the app.
- **Store badges** go after signup only. The apps never sell, so a cold visitor
  sent to a store meets a login screen.
- **Campaign links per placement:** `pt` and `ct` in App Store Connect, and Play
  referrer UTMs.
- **If Apple requires in-app purchase** (the app repo expects this may happen):
  store billing granting the same entitlement as Stripe. Only then send CTAs
  straight to the stores.

---

## 8. The coaching bible (step 4)

1. **Voice.**
   - Who HybridX is for.
   - Tone, from the app's brand briefing: specific, intelligent and
     performance-focused.
   - UK English, with a word list.
   - Banned openers and phrases.
   - **Short format:** one point; the answer first; cut what doesn't serve it;
     no recap, no "In conclusion".
   - **No invented first-person experience.** That comes only from your coach's
     notes.
2. **Training rules.**
   - Interference gaps: at least 6–8 hours, as the site already says,
     refined per pairing if you want.
   - Strength first when combined with running.
   - Every workout scaled two ways, with RPE and rest.
   - Progression limits.
   - Safety lines.
   - Never-prescribe list.
3. **Facts.** None in prose: injected from the registry.
4. **Sourcing.** Only references checked to exist.
5. **Claims.** Product facts only, plus "Not claimed".

The method should agree with the app's programmes, so I'll draft this from
`PROGRAM_COACHING_REVIEW.md` and its companions in hybridx-app, for you to
correct.

---

## 9. Starting queue and measurement

### 9.1 Candidates (the queue for step 4)

This is the proposal's 30 seeds rewritten as single-point questions. Each is a
candidate until it passes the overlap check against existing pages, and, from
step 6, demand data.

| # | Question (working title) | Pillar | Proof element | Needs step |
|---|---|---|---|---|
| 1 | How do I train the sled push without a sled? | HYROX | Workout (kit swaps) | 4 |
| 2 | How do I stop my grip failing on the sled pull? | HYROX | Workout | 4 |
| 3 | How should I pace burpee broad jumps? | HYROX | Table | 4 |
| 4 | How do I train wall balls for when I'm already tired? | HYROX | Workout | 4 |
| 5 | How should I break up 100 wall balls? | HYROX | Table | 4 |
| 6 | How do I train the farmers carry when my grip goes first? | HYROX | Workout | 4 |
| 7 | How do I stop sandbag lunges wrecking my last run? | HYROX | Workout | 4 |
| 8 | What does a HYROX simulation look like in a normal gym? | HYROX | Workout | 4 |
| 9 | What is a compromised-running session, and how often? | HYROX | Workout | 4 |
| 10 | How fast should my first 1km be? | HYROX | Tool (pacer) | 9 |
| 11 | How long should Roxzone take me? | HYROX | Tool (pacer) | 9 |
| 12 | How hard should I go on the SkiErg? | HYROX | Table (station target) | 9 |
| 13 | HYROX weights by division, 2026/27 | HYROX | Table (facts) | 4 |
| 14 | Should I lift or run first on the same day? | Running + lifting | Coach's note + table | 4 |
| 15 | How long between heavy squats and a hard run? | Running + lifting | Tool (week planner) | 5 |
| 16 | Can I do legs the day before a long run? | Running + lifting | Tool (week planner) | 5 |
| 17 | How should I set up a 3-day running and lifting week? | Running + lifting | Tool (week planner) | 5 |
| 18 | What does a 4-day hybrid week look like? | Running + lifting | Tool (week planner) | 5 |
| 19 | Does running kill strength gains? | Running + lifting | Coach's note + sources | 4 |
| 20 | How do I keep my strength while training for a marathon? | Running + lifting | Workout | 4 |
| 21 | Zone 2 or intervals: which helps a lifter more? | Running + lifting | Table | 4 |
| 22 | How much should a lifter run to get a faster 5k? | Running + lifting | Tool (VDOT, exists) | 4 |
| 23 | Which gym exercises make you a faster runner? | Running + lifting | Workout | 4 |
| 24 | Should beginner runners lift, and what first? | Starting out | Workout | 4 |
| 25 | How do I test my hybrid fitness baseline? | Starting out | Tool (strength and engine test) | 8 |
| 26 | Am I strong enough for HYROX Open? | Starting out | Tool (strength and engine test) | 8 |
| 27 | Open or Pro: which division should I enter? | Starting out | Table (facts) | 4 |
| 28 | Singles or doubles for a first HYROX? | Starting out | Table (facts) | 4 |
| 29 | How should I taper in HYROX race week? | Starting out | Table | 4 |
| 30 | How do I peak for three ATHX zones on one day? | ATHX | Workout | 4 |
| 31 | One session for kettlebells and running | Starting out | Workout | 4 |
| 32 | Functional fitness or hybrid training: what's the difference? | Starting out | Table. Low priority | 4 |

**Volume:** 23 candidates are ready at step 4, about eight weeks at three a week.

**Not on the list:**

- **Seed 9** ("good time by age"): held until real results data exists.
- **Seeds 21, 22 and 25:** refresh tasks for `/hybrid-training-program`,
  `/athx-2027` and `/hyrox-training-plan`, not new pages.

### 9.2 Conversions of record

These are server-side: complete, and no consent needed.

- Leads by `source` and `placement` (they exist today).
- App signups by source, after step 11.

### 9.3 Behaviour (a consented sample)

- GA4 events (step 2).
- Optionally later, the first-party tracker v2 on article and tool pages, so the
  monthly Claude review covers articles too.

### 9.4 Stop rules

**Before launch:** a three-month baseline for the existing pages.

| When | Measure | Healthy | Stop and reassess |
|---|---|---|---|
| 30 days after each article | Indexed? | ≥ 80% indexed | < 50% indexed, or "Crawled – currently not indexed" rising |
| Monthly | Clicks to existing pages | No fall beyond the seasonal pattern | A > 15% fall after a Google update, while articles are live |
| 90 days | Captures per 1,000 article clicks | Rising. Set the bar after month one | Flat at zero |
| Continuous | CTA copy changes | Judged after ≥ 300 visits per variant | — |

---

## 10. Why the proposal was changed

### 10.1 It assumed a different site

| The proposal assumes | What exists | Changed to |
|---|---|---|
| `hybridx.app` | `hybridx.club` (plus the race., streak. and trail. subdomains) | `sc-domain:hybridx.club` |
| A static host rebuilding per commit | Firebase App Hosting: every push to `master` is a full production build, and a bad secret fails the whole build | Firestore, not git |
| MDX files | Hand-built TSX pages | Typed blocks |
| A Python engine | TypeScript, with Genkit and Gemini already set up | TypeScript |
| Three new calculators | 12 calculators, the ATHX calculator, and the Glasgow pacing model behind a paid pack | Reuse what exists, plus D9 |
| PostHog | GA4, a first-party tracker, and server-side lead records | No PostHog |
| A teal palette | Black, white and yellow `#FADB5C` | The `hx` tokens |
| "Load this target into HybridX" | No target finish time in the app; fixed programmes | Honest copy (section 7.3) |
| CTAs to the app stores | The apps never sell; no deep links | Email capture first (section 7.1) |
| FAQ rich snippets, daily sitemap pings | FAQ results limited since 2023; the ping endpoint was retired in 2023 | `Article` JSON-LD; sitemap submitted once |
| GitHub Actions | No CI in this repo | The hourly maintenance job |

### 10.2 Risks it would have run

- **Google's scaled content abuse policy.** Daily, keyword-led and unreviewed is
  the textbook case, and a site-wide demotion would hit the pages that already
  earn traffic. Mitigated by three a week, your approval, a proof element in
  every article, a real byline, and the stop rules.
- **Cannibalisation.** It only deduplicated against its own output. Now routed
  by `query × page`.
- **Accuracy.**
  - The bible gave Open weights only.
  - It contained corrupted text ("kilometre,门槛/kettlebell").
  - Station loads change by season.

  Mitigated by the facts registry and the number checks.
- **Security.** Model-written MDX is code, built from attacker-influenceable
  input. Mitigated by typed blocks.
- **The shop.** A free station-level pacer would undercut the Pacing Pack. That
  is D9.
- **Claims.** Inconsistent trial lengths and an unverified "2,000 athletes"
  repeated at scale. That is step 1.

### 10.3 gum, assessed

**What it is.** An MIT-licensed CLI and MCP server (Wraxle LLC, v2.3.1) that
gives AI agents one safe interface to Google's APIs. Its strengths are real:

- a small catalog that keeps an agent's context lean;
- read, write and destructive calls gated separately;
- sign-in tokens kept in the OS keychain, away from prompts and `.env` files;
- Keyword Planner access.

**Why it isn't in the pipeline:**

- **It needs a personal computer, and not a Windows one.** For Search Console and
  Google Ads, gum's catalog allows only a personal Google sign-in with the token
  in the OS keychain. There is no ADC, service-account or file fallback for
  those operations. Its releases cover macOS and Linux only, with no Windows
  build. On a Windows PC it would have to run under WSL, with a Linux keyring
  installed and unlocked, and an unattended weekly job can't rely on that after
  a reboot.
- **We need three specific calls, not 228.** gum's catalog and context economy
  help an agent *exploring* Google's APIs. A fixed pipeline with three known
  calls gets nothing from them, and pays for a subprocess, a JSON boundary,
  a third-party binary and a home computer.
- **The safety is stronger server-side.** gum blocks writes in the client. A
  Restricted Search Console user with a read-only scope cannot write at all,
  whatever the code does.
- **Building it ourselves is small.** About 150 lines for Search Console and 100
  for Keyword Planner, each with tests, using Google's own client or REST. The
  one ongoing cost gum would absorb is bumping the Ads API version about once a
  year.

**Where gum would be worth having:** if you work from a Mac or Linux machine with
Claude Code and want to ask ad hoc questions across Google services. Nothing in
this plan depends on it. The step 6 admin search page, the CSV export and the
weekly summary email cover the questions the proposal wanted it for.

---

## 11. Setup outside the repo, by step

| Step | Who | What |
|---|---|---|
| 1 | You | Check the four singles rows in `DIVISIONS` against the official 2026/27 Singles rulebook |
| 2 | You | Nothing: the existing deny-all Firestore rule already covers the new collections |
| 3 | You | After merge: enable the IAM Credentials API and grant `roles/iam.serviceAccountTokenCreator` (commands in step 3). Admin works before then, with one-hour sign-in |
| 4 | You | To switch on: create and grant `ANTHROPIC_API_KEY` (optional; I then add the binding); set a Gemini budget alert; set `CONTENT_ENGINE_MODE` to `"on"` |
| 6 | You | Enable the Search Console API in `hybridx-hub`; add the service account to `sc-domain:hybridx.club` as Restricted; confirm the sitemap was submitted once |
| 10 | You | A Google Ads account and developer token. An OAuth client with its consent screen **set to "In production"**: left in "Testing", Google expires refresh tokens after seven days. A one-time sign-in; create and grant the secrets |
| 11 | Both | The hybridx-app work in section 7.3 |
| After step 2 | Me | A "Guides" section in CLAUDE.md, in the style of "Adding a lead magnet" |

---

## 12. Errors in the proposal's code, and what I couldn't verify

### 12.1 Errors

- `response_mime_type="application/schema+json"`: Gemini structured output
  expects `"application/json"`.
- `model="gemini-2.5-pro"` is hard-coded. Pin whatever is current, in one
  constant.
- `recommended_calculator` is hard-coded to `"SplitBuilder"`.
- Deduplication is by exact string, against its own output only, and the `page`
  dimension is never requested.
- A 15-impression threshold, and sorting by impressions only.
- The whole registry is pasted into every prompt.
- The model chooses the slug.
- Errors are swallowed with `print`.
- Daily sitemap resubmission, and URL inspection treated as a way to get
  indexed.
- `linker.py` rewrites published files.
- `trends.daily` is news, not topic research.
- The OAuth "Testing" status expires refresh tokens after seven days.
- `gum setup --scope project` writes config that every Claude Code session loads.
- The "Master Build Tracker" is empty in the .docx.

### 12.2 Not verified

- **The official HYROX 2026/27 rulebook.** Secondary sources only (step 1 asks
  you to check).
- **Whether the App Hosting runtime can mint a `webmasters.readonly` token**
  without a key. Step 6's diagnostic answers it.
- **App Hosting's request timeout.** Step 4 measures it.
- **Whether Keyword Planner works for a read-only Ads user,** and what volumes it
  returns with no ad spend. Step 10.
- **gumcli.dev itself,** which this session's network blocks. The gum statements
  come from its GitHub source.

### 12.3 Sources

- gum: [github.com/ehmo/gum](https://github.com/ehmo/gum). See
  `apps/gum/.goreleaser.yaml` and `install.sh` (macOS and Linux builds only),
  `apps/gum/internal/auth/keyring.go` and `composite.go`,
  `apps/gum/internal/embedded/catalog.json` (`byo_oauth` only for Search
  Console and Keyword Planner), and `docs/paths.md` (keychain bounds).
- Google: [FAQ structured data](https://developers.google.com/search/docs/appearance/structured-data/faqpage);
  [Changes to HowTo and FAQ rich results (Aug 2023)](https://developers.google.com/search/blog/2023/08/howto-faq-changes).
- On 2026 spam enforcement (secondary):
  [PPC Land: spam policies cover AI Overviews and AI Mode](https://ppc.land/google-spam-policies-now-officially-cover-ai-overviews-and-ai-mode-in-search);
  [PPC Land: scaled content abuse](https://ppc.land/scaled-content-abuse/);
  [SEO Sherpa: June 2026 spam update](https://seosherpa.com/googles-june-2026-spam-update-has-finished-rolling-out/).
- HYROX weights (secondary):
  [Red Bull: HYROX weights overview](https://www.redbull.com/gb-en/hyrox-weights-overview);
  [RunDida: HYROX weights by division](https://rundida.com/tools/hyrox-weights/).
- The repos: this repo at `4b70c7f`; `xhybrid-dev/hybridx-app` (`capacitor.config.ts`,
  `docs/MOBILE_RELEASE.md`, `src/hooks/use-native-app.ts`,
  `HYBRIDX_BRAND_BRIEFING.md`).
