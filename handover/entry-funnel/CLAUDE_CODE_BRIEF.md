# Brief for Claude Code: the HybridX entry funnel

You are adding a guided "plan finder" to hybridx.club. It sits **above the existing homepage** as an entry
funnel, and the visitor can skip it at any time to reach the existing homepage. Every visit is tracked
(anonymously) and analysed in the admin, so the owner can see how people visit, what attracts them, what
puts them off, and how to improve.

Read this file first, then the docs it points to. The owner is Jon. He is not a developer, so ask plain
questions and show plain results.

## 1. What is in this package

Everything below has been built and tested outside the real repo. Nothing here has touched the live site,
the real Firestore, or the real admin.

| Path | What it is | Status |
| --- | --- | --- |
| `data/funnel.json` | All content and options: questions, answers, copy, product catalog, FAQ | Tested (integrity checks) |
| `data/routing.js` | The routing rules: answers in, product out, with a rule trace | Tested against all 73,728 answer combinations |
| `data/events.schema.json` | The tracking contract: every event and property allowed | Tested (collector and browser both use it) |
| `server/collect-core.js` | Validates and scrubs a tracked batch before storage | 38 tests |
| `admin/rollup.js` + `report.js` + `insights.js` | Daily rollup, merge, derived numbers, rule-based "how to improve" | 30 tests |
| `admin/seed.js` | Deterministic fake traffic, to build the admin before real data exists | Tested |
| `src/`, `build.js`, `dist/` | Reference implementation in plain HTML, CSS and JS: the funnel page, the entry-above-homepage demo, the tracker | 264 checks (funnel page) and 326 (entry demo) in a real browser |
| `test.js`, `scripts/` | Browser test (Playwright), brand and layout audit for any URL, demo report | Passing |
| `examples/` | Sketches for the Next.js collector route, rollup job, Firestore rules, monthly Claude review | **Not executed** |
| `docs/` | Specs, decisions, acceptance checklist | Read them |
| `sources/` | The original designer brief, logos, strategy summary | Reference |

Open `dist/entry-demo.html` in a browser to see the target behaviour: the funnel on top, a stand-in for the
existing homepage below, and a skip link. Open `dist/index.html` for the funnel as a stand-alone page.

## 2. Ground rules

1. **Do not change the existing homepage.** Keep its URL, `<title>`, meta description, H1, FAQ, JSON-LD and internal
   links exactly as they are. The entry section is added in front of it. (docs/03)
2. **No redirects, no hiding content from crawlers.** The entry is in normal page flow, rendered on the server. The skip is
   a real `<a href="#hx-home">` that works without JavaScript.
3. **Brand rules are strict:** yellow `#FADB5C`, black, white; Space Grotesk and Inter only; nothing under 12px. (docs/07)
   The owner has already sent back one design for breaking these rules.
4. **Copy comes from `data/funnel.json`.** Do not invent claims, numbers or product names. Plain, instructional English.
5. **Tracking must be truthful.** It is off unless an endpoint is configured, and off when the browser sends Global Privacy
   Control or Do Not Track. The on-screen privacy lines change to match. Never send names, emails, IP addresses or user agents
   to the tracker. (docs/04, docs/06)
6. **The routing table changes only with its tests.** Edit `routing.js` and `routing.test.js` together. (docs/02)
7. **Do not guess repo facts.** Find them (section 3), write them down, and ask when two answers are possible.
8. **Two catalog rows are unconfirmed** (`athx`, `ultra`). Ask the owner for the real URLs before launch. (docs/02)
9. **You are not the lawyer.** The privacy section is a checklist and draft wording for the owner's review. (docs/06)

## 3. Step 0: explore, then plan (do this before writing code)

Write what you find into `ENTRY_FUNNEL_NOTES.md` in the repo root and share a short plan with the owner. Find:

- Next.js version, App Router or Pages Router, TypeScript config, Tailwind config, the HSL tokens in `globals.css`.
- How fonts are loaded (`next/font/google`, `font-headline`, `font-body`) and how the logo is rendered (the design review notes it
  uses `dark:invert`, which loses the yellow. Use the supplied logo files in `assets/logos/`).
- The homepage component: where the H1 is, what is server-rendered, what is client-side, how the header is built.
- Whether a cookie or consent banner exists and what it gates (analytics, ads, Amazon affiliate).
- Existing analytics (Google Analytics, Vercel Analytics, anything else).
- Firebase Admin SDK initialiser, Firestore usage, `firestore.rules`, indexes.
- **The admin area:** its route, how it authenticates, what UI kit or components it uses. The pages in phase 4 must follow it.
- Vercel config: cron support, environment variables, Firewall rules.
- The privacy policy page and its content.
- What the Amazon short links do today, and where the "free plan" form lives.

Then ask the owner the questions in section 5 that block phase 1.

## 4. Phases and gates

Do not start a phase until the previous gate passes. Tell the owner when each gate passes.

**P1. Data and routing (small).** Copy `data/` into the repo (for example `lib/plan-finder/`). Convert `routing.js` to TypeScript with
the same behaviour. Port `routing.test.js`. *Gate:* the exhaustive test passes, `funnel.json` integrity test passes, and no rule is
different from `docs/02-funnel-spec.md`.

**P2. Entry UI.** Build the entry section and the plan finder dialog as React components, styled with the repo's Tailwind tokens,
matching `dist/entry-demo.html` in layout and behaviour. Implement the skip, continue and `?entry=off` behaviours. Insert it
above the existing homepage content without editing that content. *Gate:* docs/08 sections A, B and F pass, and
`node scripts/audit-url.js <local url>` passes at 1440, 820 and 390 wide.

**P3. Tracker, collector and storage.** Port the tracker (`HXT` in `src/app.js`) to a small module, add `POST /api/collect` using
`server/collect-core.js`, store batches in Firestore, and add the `/api/talk` lead endpoint. Wire `window.HX_CONFIG`. *Gate:* docs/08
section C passes, including "tracking is off with no endpoint, with Global Privacy Control and with Do Not Track".

**P4. Rollups and admin analytics.** Add the daily rollup job and the admin pages described in `docs/05-admin-analytics.md`, using
`admin/rollup.js` for the numbers. Build against seed data first (`node scripts/demo-report.js` shows the target output), then switch to
real data. *Gate:* docs/08 section D passes.

**P5. Privacy alignment.** Add the privacy-policy wording, set retention (TTL) policies, and settle the consent question with the
owner. *Gate:* the owner signs off docs/08 section E. Do not launch before this.

**P6. Launch as an experiment.** Show the entry to half of visitors and the plain homepage to the other half (`variant` `A` and `control`)
for at least four weeks, and read the lift in the admin. *Gate:* the owner decides to keep, change or remove the entry.

## 5. Decisions

### Already made (do not reopen without a reason)

| Decision | Why |
| --- | --- |
| Entry sits in normal flow above the homepage, skippable, no redirect | Keeps SEO, keeps the homepage unchanged, lets people who know what they want leave in one click |
| Cookieless tracking: a random id held in memory, one new id per page load | Avoids storing anything on the device, at the cost of not recognising returning visitors |
| Server-side collector with a schema whitelist; unknown fields are dropped | Nothing personal can be stored by accident, even if the tracker is changed |
| Daily rollups for the admin, raw batches expire after 400 days | Fast, cheap dashboards, and personal-data exposure limited in time |
| Talk-form leads are stored separately and carry no visit id | A lead cannot be joined to a tracked visit |
| Free-text note is scrubbed in the browser and again on the server | Defence in depth against emails, phone numbers and links |
| Race date is sent as a bucket (`12-23` weeks), never as a date | A date plus other fields can identify someone |

### Ask the owner (defaults in bold)

1. **Consent.** If a cookie banner exists, gate `trackEndpoint` on its analytics choice. If none exists, does the owner want a banner, or
   does he judge the statistical-purposes exception to apply? **Default: gate on consent until the owner and whoever handles compliance say otherwise.** (docs/06)
2. **Keep the free-text note?** **Default: yes, scrubbed.** Alternative: `captureNote: false`.
3. **Launch as an experiment?** **Default: yes, 50/50 for four weeks.**
4. **Where does the admin live, and who may see it?** Discover it, then confirm.
5. **Unconfirmed products:** real links for the ATHX 2027 and ULTRA STRENGTH books. Also: should 60 Hyrox Workouts, the Women's Edition,
   45 Advanced Hyrox Workouts and the Treadmill FIT/TCX Generator enter the routing? **Default: not yet.**
6. **A stand-alone `/start` route** for social posts and guides, with `?goal=` presets, noindex. **Default: yes.** (docs/03)
7. **Where do "Talk to us" messages go?** **Default: `hx_leads` in Firestore plus an email to the owner using whatever mechanism the site already has.**
8. **"Email me this plan"** on the result. **Default: no**, it needs the nurture emails to exist first.
9. **Retention.** **Default: raw batches 400 days, note text blanked after 90 days, leads 12 months, rollups kept.** (docs/06)

## 6. Commands

```bash
npm install                       # installs playwright-core only
npm run build                     # writes dist/index.html, dist/entry-demo.html and artifact fragments
npm run test:unit                 # routing, collector, rollup: 74 tests, no browser needed
CHROMIUM_PATH=/path/to/chrome npm run test:browser   # about 300 checks in a real browser
node scripts/demo-report.js       # what the admin will show, from fake traffic
CHROMIUM_PATH=... node scripts/audit-url.js http://localhost:3000/   # brand and layout audit of any page
```

If Chromium is not installed, `npx playwright-core install chromium` fetches one.

## 7. Where the docs are

| Doc | Read it when |
| --- | --- |
| `docs/01-business-and-website-plan.md` | You need the reason behind any product or wording. Its "Homepage rebuild" section is superseded by docs/03 |
| `docs/02-funnel-spec.md` | Building the questions, routing and result |
| `docs/03-entry-integration.md` | Putting the funnel above the homepage, the skip, SEO, performance, the experiment |
| `docs/04-tracking-and-data-model.md` | Building the tracker, collector and Firestore layout |
| `docs/05-admin-analytics.md` | Building the admin pages: which question each view answers |
| `docs/06-privacy-and-retention.md` | Consent, retention, policy wording, what the UI promises |
| `docs/07-brand-and-design.md` | Any visual work |
| `docs/08-acceptance-checklist.md` | Checking you are done |

## 8. Known limits (be honest with the owner about these)

- The reference is plain HTML and JS. The real build is React and Tailwind, so layout has to be re-verified there.
- `examples/*.ts` and the Firestore layout have **not been run** against a real project.
- Two catalog rows are unconfirmed, and the routing table's product choices come from the owner's notes, not from sales data.
- The rule-based insights use thresholds picked for a small site. Expect to tune them after the first month of real data.
- Without cookies, returning visitors count as new visits. The admin's "visits" are page loads, not people.
- The privacy and consent points are a checklist, not legal advice.
