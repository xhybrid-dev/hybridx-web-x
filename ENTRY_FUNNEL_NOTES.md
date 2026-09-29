# Entry funnel: findings, status and launch steps

The plan finder in front of the homepage, built from the handover package in
`handover/entry-funnel/` (start with its `CLAUDE_CODE_BRIEF.md`). This file
has three parts: [status and launch steps](#status), the owner's
[decisions](#decisions), and the [step 0 findings](#step-0-findings) about the repo (read from
the code on 29 September 2026), which the build follows wherever the package
assumed something else.

<a id="status"></a>
## Status

| Phase | Built | Gate | Result |
| --- | --- | --- | --- |
| P1 Data and routing | `src/lib/plan-finder/` (`funnel.json`, `events.schema.json`, `routing.ts`) | docs/08 A1, A2, A5, A6 | Passed. All 73,728 answer combinations match an independent statement of the docs/02 tables, primary and extras, and match the reference exactly |
| Consent banner | `src/components/consent/`, `src/lib/consent.ts`, privacy policy section 5 | Owner's decision 1 | Built. GA4 and the tracker wait for Accept; Reject and Accept are equal; the choice can be changed from the footer or the privacy policy |
| P2 Entry UI | `EntrySection`, `PlanFinderRoot`, `PlanFinderDialog`, `/start` | docs/08 A, B, F | Passed, except B8 (no header button, by decision). The homepage's `<main>`, title, description, canonical, `<h1>` and all eight JSON-LD objects render identically with and without the entry |
| P3 Tracker, collector, talk | `tracker.ts`, `page-tracking.ts`, `collect-core.ts`, `/api/collect`, `/api/talk` | docs/08 C | Passed locally, except C10 (needs the real Firestore) and the email half of C13 (needs the real mail transport). C7 is not exercised: the note is kept, by decision 2 |
| P4 Rollups and admin | `analytics/`, `store.ts`, `monthly-review.ts`, `/admin/plan-finder`, CSV export | docs/08 D | Passed on demo data and with an in-memory Firestore. D10 runs once `ANTHROPIC_API_KEY` exists (below) |
| P5 Privacy and retention | Policy section 6, note blanking in the hourly job, TTL `expireAt` on every batch and message | docs/08 E | **Needs the owner**: sign-off, the two TTL commands, the region check |
| P6 Experiment | `PLAN_FINDER_MODE` in `apphosting.yaml` and the 50/50 rewrite in `middleware.ts` | docs/08 F7 | Built and checked on a local production build: about half of loads get each arm, `/` is sent `private, no-store` so the CDN cannot pin one arm, and LCP and CLS are no worse. **Ships as `off`** |

How it was checked: 141 unit tests (`npx vitest run src/lib/__tests__/plan-finder-*`),
255 browser checks against the running site
(`handover/entry-funnel/scripts/check-next.js`, which also audits the brand
rules at 1440, 820 and 390 wide), and `tsc` plus a production `next build`.
The site's other tests were not run in this session.

### Merging changes two things at once

- **The consent banner and the change to Google Analytics go live on merge**,
  whatever `PLAN_FINDER_MODE` says. From then on GA counts only visitors who
  accept, so expect its numbers to drop.
- **The plan finder does not**: `PLAN_FINDER_MODE` ships as `off`, so `/`
  looks as it does today. `/start` and `/admin/plan-finder` exist, and the
  tracker records `/start` visits from people who accept.

### Before switching it on (owner)

1. Click the ATHX 2027 and ULTRA STRENGTH links on a result (or in
   `src/lib/plan-finder/funnel.json`). They could not be opened from here,
   and both ids are one character shorter than an Amazon ASIN.
2. Read privacy policy sections 5 and 6 with whoever handles compliance, and
   sign off docs/08 section E. The wording is a draft adapted from docs/06; it
   is not legal advice. Note that the Ecwid store widget on the homepage loads
   without asking and may set its own cookies; the banner does not cover it.
3. Turn on the retention the policy promises (raw batches 400 days, messages
   12 months):

   ```bash
   gcloud firestore fields ttls update expireAt --collection-group=hx_batches --enable-ttl --project=hybridx-hub
   gcloud firestore fields ttls update expireAt --collection-group=hx_leads --enable-ttl --project=hybridx-hub
   ```
4. Check the Firestore region in the Firebase console (a UK or EU region is
   preferable, docs/06).
5. Record the homepage's Search Console queries, positions and Core Web
   Vitals, as the before picture (docs/08 F5, F6).
6. After the merge deploys: open `/start`, accept analytics, answer the
   questions and send a Talk to us message. Then check
   `/admin/plan-finder/health` (batches arriving), `/admin/plan-finder/leads`
   (the message) and the training@hybridx.club inbox (the email).

### Switching it on

Set `PLAN_FINDER_MODE` to `"experiment"` in `apphosting.yaml` and deploy. It
is a plain value, not a secret, so it cannot fail the build. Agree the stop
rule first (docs/03 suggests at least four weeks and 300 visits per arm), and
read the result on `/admin/plan-finder/entry`. `"on"` shows the entry to
everyone; `"off"` removes it again.

### The monthly review (optional)

It stays dormant until the backend has an Anthropic API key. Create the secret
and grant it **before** adding the binding, or every deploy fails (`CLAUDE.md`):

```bash
echo -n "<key>" | firebase apphosting:secrets:set ANTHROPIC_API_KEY --project hybridx-hub
firebase apphosting:secrets:grantaccess ANTHROPIC_API_KEY --project hybridx-hub --backend studio
```

then add to `apphosting.yaml` and deploy:

```yaml
  - variable: ANTHROPIC_API_KEY
    secret: ANTHROPIC_API_KEY
    availability:
      - RUNTIME
```

On the day it runs, the maintenance job can take longer than Cloud
Scheduler's default three-minute deadline. The review still finishes, but the
scheduler's history shows a failure unless the deadline is raised:
`gcloud scheduler jobs update http marketing-maintenance --attempt-deadline=300s --location=us-central1 --project=hybridx-hub`.

### Not verified here

- Writes and reads against the real Firestore, the real email transport and
  the real Anthropic API (every one of them is tested against a stand-in).
- App Hosting's CDN honouring `private, no-store` on `/` (checked on a local
  `next start`, which is what App Hosting runs, but not behind its CDN).
- The two book links, and whether `link.amazon` links carry the affiliate tag
  (they are recorded as `amazon`, not `amazon-affiliate`).

### Changes to the brief's design

- Rolling up a day reads the day either side, not just the day and the next:
  the sketch in `examples/rollup-job.example.ts` counts a visit that crosses
  midnight twice.
- `/api/collect` limits each address to 60 batches in ten minutes, in memory,
  with the IP hashed under a per-process salt and never stored: App Hosting has
  no firewall layer for this.
- The tracker also waits for consent (decision 1). Accepting mid-visit starts
  the record with a `page_view` from that moment.
- Tracking contract: `finder_open.source` gains `link` (`/start?goal=`) and
  `dialog_close.reason` gains `back` (the Back button closes the dialog).
- The entry's largest paint is the faint X mark; it is preloaded so the entry
  paints as fast as the plain homepage.
- Admin charts carry one series each in the theme's primary colour. The brand
  allows no second hue, so comparisons are tables, and the goal-by-format grid
  uses a grey ramp that passes the ordinal colour checks in both themes.

### Noticed, not changed

- The site header throws a React hydration mismatch in development on several
  pages (a Radix dropdown against a link), and its logo `<Image>` warns about
  its size. Both predate this work.
- The homepage JSON-LD is injected by `next/script`, so it is not in the raw
  HTML; crawlers that run JavaScript see it. Unchanged.
- The Speakable schema's `h2` selector now also matches the entry's headings.
- The race, streak and trail subdomains share the banner, but the choice is
  stored per subdomain, so each asks once.

<a id="decisions"></a>
## Decisions

Answered by the owner on 29 September 2026: "a) Build a banner", the two
book links, and "continue otherwise with defaults".

| # | Question | Decision |
| --- | --- | --- |
| 1 | Consent route | **Build a consent banner, on every page, covering Google Analytics as well as the plan-finder tracker.** GA4 and the tracker both wait for "Accept" |
| 2 | Keep the scrubbed free-text note | Yes (default) |
| 3 | Launch as a 50/50 experiment for four weeks | Yes (default) |
| 4 | Who may see the admin analytics and the leads inbox | The existing `ADMIN_EMAILS` list (default; one address today) |
| 5 | ATHX 2027 and ULTRA STRENGTH links | `https://link.amazon/B073SX15W` and `https://link.amazon/B0bvDfu46`, supplied by the owner. **Not opened from here** (the sandbox cannot reach Amazon), and both ids are nine characters where an ASIN is ten, so click both before launch. No other titles in the routing yet (default) |
| 6 | Stand-alone `/start` | Yes, `noindex` (default) |
| 7 | Where Talk-to-us messages go | `hx_leads`, not the marketing `leads` collection, plus an email to training@hybridx.club (default) |
| 8 | "Email me this plan" | No (default) |
| 9 | Retention | 400 days raw, notes blanked at 90, leads 12 months, rollups kept (default) |
| – | "Find your plan" button in the site-wide header (docs/08 B8) | Not added: the header stays unchanged (docs/03). Open for the owner |
| – | Inter 500 | Not loaded site-wide; the entry uses Inter 400 and 600 (default) |

# Step 0 findings

## Stack

| Thing | Finding | Where |
| --- | --- | --- |
| Next.js | 16.2.1, **App Router** (`src/app/`). React 19.2 | `package.json` |
| TypeScript | `strict: true`, path alias `@/*` → `src/*`, `allowJs`. `next build` type-checks (`ignoreBuildErrors: false`) and `tsconfig` includes `**/*.ts` | `tsconfig.json`, `next.config.js` |
| Tailwind | 3.4, `darkMode: ['class']`, shadcn/ui (`components.json`, style `default`, base `neutral`) | `tailwind.config.ts` |
| Tests | Vitest 4 (`npm run test:run`), `environment: 'node'`, default include pattern (any `*.test.*` in the repo) | `vitest.config.ts`, `src/lib/__tests__/` |
| Hosting | **Firebase App Hosting** (Cloud Run), backend `studio`, project `hybridx-hub`. Node 22. `maxInstances: 1` | `apphosting.yaml`, `CLAUDE.md` |
| Middleware | `middleware.ts` already runs on every page: subdomain rewrites for race./streak./trail., security headers and CSP. Next 16 has deprecated the name in favour of `proxy.ts`; it still works | `middleware.ts` |

### Colour tokens (`src/app/globals.css`)

Light theme is the default (`ThemeProvider defaultTheme="light"`); dark is a
class toggle stored in `localStorage` (`hybridx-ui-theme`).

| Token | Light | Dark |
| --- | --- | --- |
| `--background` / `--foreground` | `0 0% 100%` / `0 0% 0%` | `0 0% 0%` / `0 0% 100%` |
| `--primary` | black | yellow `47 95% 67%` (#fadb5c) |
| `--accent`, `--ring` | yellow `47 95% 67%` | same |
| `--card` | white | `0 0% 10%` (#1A1A1A) |
| `--muted-foreground` | `0 0% 30%` (#4D4D4D) | `0 0% 70%` (#B3B3B3) |
| `--border` | `0 0% 85%` (#D9D9D9) | `0 0% 20%` (#333333) |
| `--destructive` | red | red |

These line up with the palette in docs/07. The entry section is black in both
themes, so it should use explicit brand values (black, #1A1A1A, #333333,
#B3B3B3, #FADB5C) rather than theme tokens that flip with the toggle.

### Fonts

`next/font/google` in `src/app/layout.tsx`, exposed as CSS variables and
Tailwind families `font-headline` (Space Grotesk) and `font-body` (Inter, the
default on `<body>`).

- Space Grotesk loads **300, 400, 500, 700**.
- Inter loads **400, 600, 700**. No 500, so `font-medium` renders as 400
  (design review finding 3). The reference uses Inter 500 on buttons and
  options.

### Logo

`src/components/Header.tsx` renders `/Full Logo (2).png` through `next/image`
with `dark:filter dark:invert` (design review finding 9). The supplied files
(`hybridx-logo-full.png`, `hybridx-x-mark.jpg`) are not in `public/` yet.

## The homepage (`src/app/page.tsx`)

A Server Component with no dynamic APIs, so it appears to be statically
rendered. Structure:

```
<div class="flex flex-col min-h-screen …">
  <Script> × 4          Course and Speakable JSON-LD
  <Header />            sticky, 64px tall, shared by every page
  <main class="flex-grow space-y-20 md:space-y-28">
    <HeroSection />           <section> with NO id — holds the page's only <h1>
    <SocialProofSection />    #social-proof
    <TrainingPlanShowcase />  #training-plans
    <AppPromotion />          #app-promotion
    <FreeToolsSection />      #free-tools
    <AmazonBookPromotion />   #book-promotion
    <ApparelPromotion />      #apparel-promotion   ('use client', Ecwid widget)
    <FaqSection />            #faq   (Radix accordion + FAQ JSON-LD)
    <InstagramSection />      #instagram-section
  </main>
  <Footer />
</div>
```

- **H1:** "Your Path to Peak Hyrox Performance Starts Here." in
  `HeroSection.tsx`. The entry must use `<h2>` so there is still one `<h1>`.
- **Server vs client:** everything above is server-rendered except
  `ApparelPromotion`, and the `TrackedLink`s and Radix pieces inside.
- **Header:** logo, nav (Free Hyrox Plan, Our App, Guides ▾, Shop ▾,
  Calculators ▾, FAQ), theme toggle, a yellow "Sign Up" button to
  app.hybridx.club, and a mobile `Sheet` menu. There is **no "Find your plan"
  button**, and the header is shared by every page on the site.
- **Section ids:** eight of the nine sections already have one. Only the hero
  has none. The tracker can name it by position (`#hx-home main > section`)
  instead of needing an `id` added to the homepage.
- **Where the entry goes:** between `<Header />` and `<main>`, with `<main>`
  wrapped in `<div id="hx-home" tabindex="-1">`. That is a change to
  `page.tsx`'s wrapper, not to any homepage component. The wrapper needs
  `flex-grow` so the footer still sits at the bottom.
- **Not brand-clean today:** the FAQ category pills use sky, green and orange;
  the hero H1 uses yellow text on white and `font-extrabold`. Rule 1 says not
  to touch these, so the brand audit (`scripts/audit-url.js`) will fail on `/`
  as a whole. It has to be scoped to `#hx-entry` and the dialog (see the plan).

## Consent and analytics

- **No cookie or consent banner exists.** Nothing in `src/` gates anything on
  consent.
- **Google Analytics 4 (`G-XKH1WYE7CQ`) loads on every page, unconditionally**,
  from the root layout, with cross-domain linking to app.hybridx.club.
  `src/lib/analytics.ts` (`trackEvent`) and `TrackedLink` send GA events
  (`cta_app_click` and others) and forward UTM tags to the app.
- No Vercel Analytics or any other analytics.
- The Amazon short links (`amzn.to/…`) are `TrackedLink`s that send a GA
  `cta_book_click` event, with `rel="noopener noreferrer"`. Nothing logs or
  redirects them server-side today.

## Privacy policy (`src/app/privacy-policy/page.tsx`)

"Last Updated: June 26, 2024". Seven short sections. It mentions Google
Analytics, IP addresses and cookies in general terms. It does not mention
Firebase, the email provider (Brevo), App Hosting, the lead magnets'
confirmation emails, or anything like the plan finder. Contact:
training@hybridx.club.

## Firebase and Firestore

- **Admin SDK:** `src/lib/firebase-admin.ts` exports `adminFirestore` and
  `adminAuth`. Application Default Credentials when deployed; a service
  account from env vars locally.
- **Collections in use:** `leads` (magnet and free-plan signups, forwarded to
  the app's mailing system through an outbox), `rateLimits` (capture-form rate
  limiter, IP hashed with SHA-256), and a suppression-mirror document. No `hx_`
  collections exist yet.
- **`firestore.rules`:** deny all client reads and writes. Every access goes
  through the Admin SDK. New `hx_*` collections are covered with no change.
- **`firestore.indexes.json`:** two composite indexes on `leads`.
- **Region:** not recorded in the repo. Check in the Firebase console.

## The admin area

- **Route:** `/admin/leads` (the only admin page) and `/admin/login`.
  `src/app/admin/layout.tsx` sets `noindex, nofollow`; `robots.ts` disallows
  `/admin/` and `/api/`.
- **Auth:** Firebase Auth email and password in the browser, then
  `/api/admin/session` verifies the ID token and stores it in the
  `admin_session` cookie (55 minutes). Every admin page and API route calls
  `getAdminSession()` (`src/lib/admin-auth.ts`), which checks the email against
  `ADMIN_EMAILS` in `apphosting.yaml`. **One address is on the list today (the
  owner's).** There are no roles, so "Leads view restricted further" (docs/06)
  would need a second list.
- **UI kit:** shadcn/ui `Card`, `Button`, plain `<table>` styled with
  Tailwind, pill tabs as `Link`s. CSV export is a separate route
  (`/api/admin/leads/export`). `recharts` and the shadcn `chart.tsx` wrapper
  are installed, so the analytics pages can chart with what is there.
- `/admin/marketing/*` (named in `CLAUDE.md`) is the **app's** admin on
  app.hybridx.club, not this repo's.

## Scheduled jobs, secrets and email

- **No Vercel cron.** The one scheduled job is Cloud Scheduler calling
  `GET /api/cron/marketing-maintenance` hourly with `Authorization: Bearer
  $CRON_SECRET`. It drains the lead outbox, refreshes the complainant mirror and
  prunes rate-limit windows, each independently.
- **Secrets** come from `apphosting.yaml` `secret:` bindings. Per `CLAUDE.md`,
  a new binding that is not created and granted first fails the whole build.
- **Email:** `sendEmail()` in `src/lib/email/service.ts`, Brevo SMTP relay,
  from `info@train.hybridx.club`, reply-to `training@hybridx.club`. It throws in
  a local production build with no credentials (see `CLAUDE.md`).
- **Rate limiting:** `isCaptureRateLimited(ip)` in `src/lib/rate-limit.ts`,
  Firestore-backed, 8 per hour per hashed IP.

## Product links and the free-plan form

- Amazon links in `src/lib/books.ts` match the package's catalog exactly:
  `twelve` 3SSh8sz, `elite` 44jOd74, `home` 445PMV1 (and `45 Advanced` 4livuyq,
  not in the routing).
- **No ATHX 2027 or ULTRA STRENGTH Amazon link exists anywhere in the repo.**
  Both catalog rows still point at `/books`, which lists neither title.
- Every internal link in `funnel.json` resolves to an existing route.
- The free-plan form is `HyroxDominationForm` on `/free-hyrox-plan`
  (anchor `#get-the-plan`). It does **not** read query parameters, so "open the
  plan form with the race date and level filled in" (docs/01) is not possible
  without changing that form.

## Where the brief does not match the repo

| The package assumes | The repo has | Consequence |
| --- | --- | --- |
| Vercel hosting | Firebase App Hosting | See the next three rows |
| Rate limiting on `/api/collect` in a Vercel Firewall rule, so IP addresses never enter app code | No firewall layer in the repo. The site's own limiter hashes the IP in app code | `/api/collect` gets size caps and bot filtering; `/api/talk` reuses `isCaptureRateLimited`, as the magnet and funnel forms do. A per-IP limit on `/api/collect` means reading the IP in code, hashed and never stored with a batch |
| Vercel cron for the daily rollup | Cloud Scheduler plus a bearer-authenticated route | Run the rollup from the existing hourly maintenance route (re-rolling yesterday is idempotent), so no new scheduler job or secret is needed |
| "Check Vercel log settings" | Cloud Logging on Cloud Run | The routes must simply never log request bodies |
| A cookie banner may exist | None, and GA4 already ran without one | Built one (decision 1); GA4 and the tracker now wait for it |
| A monthly Claude review with `ANTHROPIC_API_KEY` | No Anthropic key; the site uses Genkit with a Gemini key | Built, dormant until the key exists; the binding is left out of `apphosting.yaml` until the secret is created and granted (steps above) |
| `?entry=off` and the tab-session skip handled after load | A static page | Hide the entry with a tiny inline script right after it, before first paint, or skipped visitors see it flash and shift (the CSP already allows inline scripts) |
| Brand audit passes on `/` | The existing homepage breaks the palette and type rules | The audit in `scripts/check-next.js` covers what the plan finder adds: the entry, the dialog, the skip strip and the consent banner |
| `middleware.ts` split for the experiment | The same file already does subdomain routing and CSP | Add the A/control rewrite for `/` there, after the subdomain check |

## The reference package in this repo

`handover/entry-funnel/` is the package as supplied, minus its screenshots and
test fonts (6 MB, kept in the original zip). Its build and browser tests need
those fonts, so run them from the zip, not from here. The X-mark JPEG carried
GPS location data in its EXIF block; it was stripped here, in `public/`, and in
the two `dist/` pages that embed it.

## Hazard for later sessions

The handover package contains `examples/*.ts` and `*.test.js` files. Dropped
into this repo as-is, `next build` would type-check the `.ts` sketches (whose
imports do not resolve) and Vitest would pick up the `node:test` files, so the
deploy would fail. If the package is committed for reference, put it under
`handover/entry-funnel/` and exclude that path in both `tsconfig.json` and
`vitest.config.ts`.
