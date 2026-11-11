# Project notes for Claude

## Infrastructure

- **Firebase project ID:** `hybridx-hub`
- **Firebase App Hosting backend name:** `hybridx-web-x` (region `europe-west4`)
  - Public URL: `https://hybridx.club`
  - Used as `--backend hybridx-web-x` for `firebase apphosting:secrets:grantaccess`.
  - An older backend, `studio` (`us-central1`, repository `gymtrackpage-HybridX-web`), still
    exists with automatic rollouts disabled. It is not the live site: granting a secret to
    it does nothing for the build that matters.
  - Confirm with `firebase apphosting:backends:list --project hybridx-hub` if a deploy
    ever shows more than one backend.
- The **app** lives in a *separate* Firebase project, `hyroxedgeai`
  (`app.hybridx.club`). The two are joined only by the marketing bridge, so a
  secret set in one project does not exist in the other. Values that appear in
  both — `CRON_SECRET` in particular — are deliberately *different* values.

## Deploy gotchas

- **A missing or inaccessible secret fails the whole build**, not just the feature
  that reads it. `apphosting.yaml` resolves every `secret:` binding before the app
  is built, stops at the first one it cannot read, and reports
  `fah/misconfigured-secret`. So nothing in the deploy ships — not the change you
  were making, not anything merged alongside it.

  Adding a `secret:` entry to `apphosting.yaml` is **two** further steps, both easy
  to forget because the build is green until the moment the entry lands:

  ```bash
  # 1. create the secret value in THIS project
  echo -n "<value>" | firebase apphosting:secrets:set SECRET_NAME --project hybridx-hub
  # 2. grant the App Hosting backend read access
  firebase apphosting:secrets:grantaccess SECRET_NAME --project hybridx-hub --backend hybridx-web-x
  ```

  `grantaccess` takes a comma-separated list, so several can be granted in one call.
  When adding more than one secret in a change, create and grant them **all** before
  redeploying — otherwise the build simply fails on the next one in the file.

- **`CRON_SECRET` must match the Cloud Scheduler job's header, exactly.**
  `/api/cron/marketing-maintenance` compares `authorization` against
  `` `Bearer ${process.env.CRON_SECRET}` `` as a plain string. The scheduler job
  carries a literal token typed in at creation time — it is *not* a Secret Manager
  reference — so rotating the secret without updating the job leaves the endpoint
  returning 401 on every run, with no error anywhere except the job's history. The
  lead outbox stops draining and the complainant mirror goes stale, both silently.

  Rotate both together:

  ```bash
  SECRET=$(openssl rand -hex 32)
  echo -n "$SECRET" | firebase apphosting:secrets:set CRON_SECRET --project hybridx-hub
  gcloud scheduler jobs update http marketing-maintenance \
    --update-headers="Authorization=Bearer $SECRET" \
    --location=us-central1 --project=hybridx-hub
  ```

- **The build's TypeScript check needs more than Node's default heap.** The full
  check uses about 2 GB, Node's default ceiling there, and the build fails with
  "JavaScript heap out of memory" during "Running TypeScript". `apphosting.yaml`
  sets `NODE_OPTIONS=--max-old-space-size=3072` for the build only; build locally
  with the same (`NODE_OPTIONS=--max-old-space-size=3072 npm run build`).

- **`LEAD_BRIDGE_SECRET` is not interchangeable with `CRON_SECRET`.** The bridge
  credential authorises pushing leads into the mailing system; the cron credential
  only authorises running maintenance. A scheduler job should not be able to do the
  former by holding the latter, which is why they are separate secrets.

## Adding a lead magnet or campaign

A magnet is a page that trades a file for an email address. All three on the site
run on one set of machinery, declared in `src/lib/magnets.ts`; adding one is an
entry there plus the page. It used to be five copied files per funnel, which is
how a magnet ends up wired to another magnet's slug — leads filing under the
wrong funnel while every download token is rejected, with nothing that looks
broken.

1. **Add the entry** to `MAGNETS` in `src/lib/magnets.ts`. `delivery: 'confirmed'`
   pairs with a gated asset in `private/`; `delivery: 'immediate'` pairs with a
   public one under `public/`. `src/lib/__tests__/magnets.test.ts` checks the
   pairing, the slug and tag rules, that the file exists, and that the email
   button clears 4.5:1 against its accent.
2. **Build the page.** Pages are deliberately bespoke — a generic renderer would
   have made the ATHX pacing calculator impossible. Use `useMagnetCapture(slug,
   placement)` for the form behaviour and write your own markup; see
   `src/components/athx/AthxGuideForm.tsx` for the shortest example.
3. **Confirmed opt-in only**: add a confirm page that renders a component
   calling `confirmMagnet.bind(null, slug)`. It must *not* confirm on render —
   Outlook Safe Links and Gmail prefetch every URL in an inbound message, so a
   GET that grants consent is a double opt-in a scanner can complete.
4. **Nothing to do in the app repo.** The mailing system auto-registers an
   unseen slug on the first lead, and `/admin/marketing/routes` gives it a
   label, tags and a journey. Declaring it in that repo's `sources.ts` is
   optional and only worth it for a funnel meant to be permanent.

The campaign itself is built in the console at `/admin/marketing/studio` on
app.hybridx.club — describe it, review the drafts, test-send, activate. Naming
the funnel in the prompt narrows the journey to that route.
`scripts/seed-journeys.ts` exists for the drips that predate the console; a new
campaign does not need it.

## Guides (`/guides`) and the facts registry

The plan, the decisions behind it and the build order are in
`docs/content-engine-plan.md`: three short, one-point articles a week,
AI-drafted, reviewed and approved by Jon before publishing.

- **Sitemap dates:** hand-built pages take `<lastmod>` from `src/lib/page-dates.ts`. Edit a page, bump its date in the same commit; `sitemap.test.ts` fails otherwise.
- **Articles live in Firestore** (`guides`, with every revision copied to
  `guideRevisions`), never in the repo, so publishing needs no build. They are
  read at request time only: the guide pages and the sitemap (`src/lib/sitemap.ts`, served with CDN caching by `src/app/sitemap.xml/route.ts`) are
  `force-dynamic`, and nothing may read Firestore during a build. The build has
  no credentials, and the sitemap once tried to while being prerendered.
- **An article is typed blocks** (`src/lib/guides/types.ts`), never HTML or MDX.
  Text carries only bold, italic and links, and links only to pages in
  `src/lib/guides/topics.ts`. To make a new page linkable, add it there; the
  test fails if it is not also in the sitemap.
- **Preview without Firestore:** `GUIDES_FIXTURES=1 npm run dev` serves the two
  sample articles in `src/lib/guides/fixtures.ts`. The dev server can report a
  hydration error on the static `/guides/how-we-write`; a production build does
  not.
- **Facts come from `src/lib/facts/`:** HYROX loads (confirmed against the
  2026/27 rulebook by Jon), price, the 14-day trial, the athlete count and its
  wording, and the `NOT_CLAIMED` list. `facts.test.ts` scans the whole site's
  copy and fails on a trial length, a monthly price or an athlete count that
  disagrees, on "most affordable" (the line is "very affordable"), and on the
  2,000 described as app users.
- **Byline:** by HybridX, reviewed by Jon Lee, HybridX trainer.
  `/guides/how-we-write` describes the process, so change it whenever the
  process changes.
- **Review happens in `/admin/guides`.** Rules are in `src/lib/guides/review.ts`
  and slots in `slots.ts`: Monday, Wednesday and Friday at 07:00 UK time, one
  article per slot, editable in settings.
  - **Nothing publishes without Jon's approval, and no GET changes state.** Mail
    scanners open every link in a review email.
  - **A scheduled article is public from its slot,** decided when it is read;
    the hourly job only records it as published afterwards.
- **The drafting engine** (`src/lib/guides/engine/`) runs as a step of the
  hourly maintenance job and is off unless `CONTENT_ENGINE_MODE` is `"on"`
  (on since 10 November 2026; Pause in `/admin/guides/settings` stops it
  without a deploy).
  - **Assume a tick can be cut off at any moment** (App Hosting's request
    limit is unconfirmed): count every model call before it starts, start
    none after `CALL_WINDOW_MS`, and keep `recoverStalled` able to resume
    anything left half-done.
  - **Pace:** one stage per tick, at most two model calls, a lease lock. The
    review gets a tick of its own.
  - **Never publishes:** it drafts, checks, reviews, emails Jon and stops.
  - **The rules:**
    - the coaching bible is `bible.ts`;
    - the deterministic checks are `checks.ts`;
    - the starting topics are `candidates.ts`, seeded once into `guideTopics`.
  - **Tests** use stand-in models (`guides-engine.test.ts`); `run.ts` never
    imports a model SDK, only `live.ts` does.
  - **The reviewer key,** `ANTHROPIC_API_KEY`, is optional: without it drafts
    arrive marked "second review skipped". Bind it in `apphosting.yaml` only
    after the secret exists and is granted.
- **Links between articles** (plan step 4b): `related.ts` scores relatedness;
  `backlinks.ts` turns the engine's suggestions into links from older articles
  to a newly approved one.
  - **A suggestion may only wrap existing words in the link, or add one short
    sentence at the end of a paragraph.** `checkLinkEdit` enforces it; don't
    loosen it to let the model rewrite published text.
  - **Accepted links go in only once the new article is live,** applied by
    `applyAcceptedLinks` in the hourly job, engine on or not. A changed
    paragraph makes the suggestion stale, never forced.
  - **Pillar pages are ISR** (`revalidate = 3600`) and read articles through
    `listPublishedGuidesOutsideBuild`, which returns nothing during a build.
    Any other built-ahead page that lists articles must do the same.
- **Search Console** (plan step 6) is read by `src/lib/google/search-console.ts`
  with the runtime's own identity and a read-only scope: no key, no secret.
  The property is `sc-domain:hybridx.club` unless `SEARCH_CONSOLE_SITE` says
  otherwise. `/api/admin/search-console-check` says what is wrong when it
  cannot read.
  - **The weekly harvest** (`src/lib/guides/harvest/`) feeds the topic queue:
    at most five new topics a week, only searches with a training word, and
    never one Jon skipped. Query text is untrusted (anyone can type anything
    into Google): it is compared and shown, never followed, and the CSV export
    defuses spreadsheet formulas.
  - **Keyword Planner** (plan step 10, `src/lib/google/keyword-planner.ts`)
    adds UK monthly volumes to queued topics, the tick after each harvest. It
    is off until its credentials exist; the three secrets are bound in
    `apphosting.yaml` only after they are created and granted. The API version
    is one constant, `ADS_API_VERSION`: bump it when Google retires it.
  - **The queue's order is in bands** (`queue.ts`, `bandOrder`): Jon's own
    questions and topics he moved up, then search demand by score, then the
    rest, then topics he moved down. Keep his moves ahead of the data.
- **The week planner** (plan step 5, `/calculators/week-planner`): the rules
  live in `src/lib/calculators/week-planner.ts` and `week-planner.test.ts`
  checks all 336 input combinations in every week. Change a session there, never
  in the page. Its magnet is the one `personal` asset: the emailed link is the
  planner page rebuilt from the validated form fields.
- **The HYROX pacer** (plan step 9, `/calculators/hyrox-pacer`): the profiles
  are in `src/lib/hyrox-pacing.ts`, shared with the Glasgow preview, and
  measured from the Pacing Pack's printed tables. The whole table is free on
  the page (Jon's decision); its download and email buttons go to the Pacing
  Pack while it is on sale, and vanish when sales close.
- **The strength and engine test** (plan step 8,
  `/calculators/strength-engine-test`): Jon's targets and the scoring are in
  `src/lib/calculators/strength-engine.ts`; three worked examples in
  `strength-engine.test.ts` pin them to the number. Change a target only with
  Jon, and update the examples with it. It never asks for a true max.
- **Article performance** (plan step 7, `/admin/guides/performance`): an
  article's tool and call-to-action links go through `/api/guides/out`, which
  counts a total per article and redirects to a destination looked up by id.
  Keep it that way: never redirect to a URL taken from the query string.
- **Admin sign-in lasts 14 days** only once the App Hosting service account
  holds `roles/iam.serviceAccountTokenCreator` on itself, and the IAM
  Credentials API is enabled. Until then `createAdminSessionCookie` falls back
  to the one-hour ID token and logs why; the Guides admin header says which you
  have.

## The shop (paid PDFs)

`/hyrox-glasgow-2027` sells PDFs through Stripe Checkout; everything is in
`src/lib/shop/` and `docs/shop-setup.md`. It ships with `SHOP_SALES_OPEN` false
and its Stripe secrets commented out in `apphosting.yaml`, for the reason in
"Deploy gotchas" above. Prices live in `src/lib/shop/config.ts` and must equal
the Stripe Prices: checkout refuses on a mismatch. The PDFs are never in the
repo; `private/shop-source/` is gitignored and `scripts/shop-upload.ts` puts
them in private Storage.

## Running a magnet funnel locally

`npm run dev` is fine: with no mail credentials `getEmailProvider()` returns
`none`, and in development `sendEmail` logs a warning and discards the message
rather than failing. Capture forms report success and the lead path runs.

**A production build run locally does not do that.** `next start` sets
`NODE_ENV=production`, where `sendEmail` refuses to discard mail silently and
throws — so every magnet form shows *"We could not send that just now"*, which
reads like a bug in the funnel and is really an absent transport. That refusal
is deliberate: silently dropping mail once turned a misconfigured deploy into
subscribers who never received what they asked for.

To exercise the real send path locally, put the Brevo values in `.env` (or any
SMTP host — `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`) and set
`LEAD_TOKEN_SECRET` so confirmation links survive a restart.

When it happens on the deployed site instead, `GET /api/admin/email-check`
signed in as an admin reports which transport resolved and which credentials
are present, and the server log line names the provider and the underlying
error — `provider: none` means configuration, anything else is the relay's own
rejection.

## Testing

```bash
npm run test:run     # vitest, no watch
```

The suite deliberately covers what drifts silently across the project boundary:
the lead-token HMAC, the cross-repo field-name agreement with the app's bridge
contract, the outbox backoff, and the capture rate limiter. If a change touches
the wire format between this site and `hyroxedgeai`, it belongs in
`src/lib/__tests__/cross-repo-agreement.test.ts`.

## Known constraints

- `maxInstances: 1` in `apphosting.yaml` is no longer load-bearing. The capture rate
  limiter (`src/lib/rate-limit.ts`) holds its window in Firestore, shared across
  instances, with a deny-only in-process cache in front of it. It fails open if
  Firestore is unreachable, on the grounds that a lost signup is permanent and an
  unthrottled burst is not.

  The one thing to check before raising it: `LEAD_TOKEN_SECRET` must be set. Unset,
  `src/lib/lead-tokens.ts` falls back to a per-process random secret, so a
  confirmation link minted by one instance fails on another — which presents as an
  intermittently broken email rather than as a missing secret.

- Expired rate-limit windows are swept by `/api/cron/marketing-maintenance` on its
  hourly run. Documents also carry `expiresAt`, so a Firestore TTL policy on the
  `rateLimits` collection would do the same job with no code; the cron sweep exists
  so the collection stays bounded whether or not that policy was ever configured.

## The X family pages (`/una`, `/una/nerdy-bits`)

`/una` is the sales page for the six linked UNA Watch apps; `/una/nerdy-bits`
is the method and its references. The apps live in `xhybrid-dev/una-hyrox`.

- **`/una` is short and jargon-free on purpose** (Jon, 10 November 2026: clean
  and to the point, from the athlete's side, no long scroll). One picture of
  how the apps join up, tabs to pick an app, and the watch. Anything about
  *how* it works goes on the nerdy page, not here.
- **Facts come from that repo's checked store text**
  (`hybridx-link/docs/STORE_RELEASE.md`) and live in `src/lib/una-family.ts`.
  What that document lists under "Not claimed" stays unclaimed here.
- **No version numbers or release status on the page** (Jon, 10 November 2026):
  all six apps are on the UNA app store, and a version goes stale. The athlete
  chooses which apps they want.
- **The nerdy page's calculators run the real sums.** `src/lib/una-maths.ts` restates the watch's
  load, fitness/fatigue and VO2max arithmetic, and `una-maths.test.ts` pins it
  to the watch's own hand-worked figures (a load of 39, a VO2max of 54.4). If
  a method changes on the watch, change it there and let the tests say what moved.
- **A reference goes on the nerdy page only once it has been checked to exist**
  with those details. Books are cited without a link rather than a guessed one.
- Watch screens in `public/una/screens/` are the apps' store previews
  (`<app>/Resources/previews/` in the watch repo); icons are the 1024 px brand
  masters, resized.
  - **Two are retouched:** X Trail's `map.png` and `elevation.png`. The
    simulator's test route is a straight double line and a sine wave, which
    did not look like a trail (Jon, 10 November 2026). `scripts/una-trail-screens.py
    <previews dir> public/una/screens/trail` redraws only the route and the
    profile, in the watch's own colours; every other pixel is the app's.
