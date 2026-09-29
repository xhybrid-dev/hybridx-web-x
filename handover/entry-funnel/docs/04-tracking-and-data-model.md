# 04. Tracking and data model

Goal: keep every answer and every meaningful action, anonymously, so the admin can show **how people visit, what attracts them, what puts them off,
and how to improve** (docs/05).

Contract: `data/events.schema.json`. Reference tracker: the `HXT` block and `initPageTracking()` in `src/app.js`. Collector logic: `server/collect-core.js`.

## Principles

1. **Whitelist, not blacklist.** The collector stores only events and properties named in the schema. Anything else is dropped. Adding a field means changing the schema first.
2. **Nothing that identifies a person.** No name, email, IP address, user agent, cookie, or device id. The visit id is 32 random hex characters made in the browser for
   each page load and held in memory. A reload is a new visit.
3. **Off unless configured, off when the browser says no.** No `trackEndpoint` means no tracking. Global Privacy Control or Do Not Track means no tracking. The screen text changes to match.
4. **Structure over free text.** Answers are ids. The one free-text field (the step-5 note) is scrubbed in the browser and again on the server. The race date becomes a bucket.
5. **Leads are a different thing.** The Talk-to-us form sends personal details to its own endpoint. The payload carries no visit id, so a lead cannot be joined to a tracked visit.

## Client settings: `window.HX_CONFIG`

Set before the funnel script runs.

| Key | Default | Meaning |
| --- | --- | --- |
| `trackEndpoint` | `''` | Where event batches are POSTed. **Empty means tracking is off** |
| `talkEndpoint` | `''` | Where the Talk-to-us form POSTs JSON. Empty means preview mode: the form says "This is a preview. Nothing was sent." |
| `captureNote` | `true` | Send the scrubbed step-5 note. `false` never sends it and changes the step-5 wording |
| `variant` | none | `A`, `B` or `control`. Set by whatever splits traffic |
| `mode` | detected | `entry` when `#hx-entry` exists, else `page` |
| `siteVersion` | `ref-1` | Build label stored with every batch, so changes can be compared |
| `privacyHref` | `https://hybridx.club/privacy-policy` | Link shown beside the step-5 privacy line when tracking is on |

The visitor-facing wording follows the switches. All strings are in `funnel.json` under `copy.privacy`.

| State | Third tick under the headline | Line under the step-5 box |
| --- | --- | --- |
| Tracking off | Answers stay on your device | Please leave out health details. Nothing you type here is sent anywhere unless you choose to message us. |
| On, note kept | Answers saved without your name | Your answers are saved without your name or email, to help us improve the plans. Please leave out health details. + privacy link |
| On, note not kept | Answers saved without your name | Your choices are saved without your name or email, to help us improve the plans. What you type in this box is not saved. Please leave out health details. + privacy link |

The result's "Did this fit what you were after?" question appears only when tracking is on, because otherwise there is nowhere to send the answer.

## What is sent, and when

Each POST is `{ "v":1, "sid":"<32 hex>", "ctx":{...}, "events":[ {n, t, q, ...props}, ... ] }`.

- `n` event name. `t` client time in milliseconds. `q` a sequence number for the visit, starting at 0 (the rollup job uses it to spot repeated batches).
- Batches: up to 50 events. Flushed every 4 seconds, when 10 are queued, on link clicks that leave the page, and when the tab is hidden (`navigator.sendBeacon`, with `fetch keepalive` as fallback).
- Content type is `text/plain;charset=UTF-8`, so the browser skips the cross-origin preflight. The collector parses the text as JSON.
- Cap of 400 events per page load.

### Context (`ctx`), sent with every batch

| Field | Value | Note |
| --- | --- | --- |
| `site`, `route`, `catalog` | build label, `routing.js` version, `funnel.json` catalog version | Lets the admin compare before and after a change |
| `mode` | `entry` or `page` | |
| `variant` | `A`, `B`, `control` | Only when an experiment is running |
| `path` | pathname | No query string, no hash |
| `ref` | referrer **hostname** only | Empty for direct visits |
| `utm` | `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` | Lower-cased and cleaned to `a-z 0-9 . _ -` |
| `vw` | `phone` (under 640 px), `tablet` (under 1024), `desktop` | A bucket, not the pixel width |
| `lang` | document language | |

### Events

`*` marks a required property. Properties not listed here are dropped by the collector.

| Event | Fired when | Properties |
| --- | --- | --- |
| `page_view` | Once per page load, after the tracker starts | none |
| `entry_shown` | The entry section is visible and not already skipped in this tab | none |
| `entry_skip` | Visitor clicks a skip control | `from` one of bar, dialog, startToday; `step` integer 0..8; `ms` integer 0..3600000 |
| `skip_reason` | Visitor taps a reason chip after skipping (optional) | `reason` one of know, toomany, notfor, browsing, other |
| `finder_open` | The questions dialog opens | `source` one of tile, nav, prompt, band, section, hash, entry; `step` integer 1..8 |
| `q_view` | A question (step 1 to 5) is shown | `step`* integer 1..8 |
| `q_answer` | Visitor leaves a step with an answer, or a tile/prompt preselects one | `step`* integer 1..5; `key`* one of goal, level, place, obst, format, note, race; `value`; `ms` integer 0..3600000 |
| `q_back` | Back pressed | `step` integer 1..8 |
| `q_jump` | Station strip used to jump | `from` integer 1..8; `to` integer 1..8 |
| `dialog_close` | Dialog closes (Close button, Escape, or a skip) | `step`* integer 1..8; `reason`* one of button, esc, backdrop, pagehide; `result` true/false; `ms` integer 0..3600000 |
| `result_view` | A result is shown for a new set of answers | `answers`*; `primary`* product id; `secondary` up to 2 product ids; `trace` up to 12 rule ids; `weeks` integer 0..104 |
| `result_click` | A product link on the result is clicked | `product`* product id; `slot`* primary or secondary; `dest` destination type; `affiliate` true/false |
| `result_restart` | Change my answers | none |
| `result_feedback` | Visitor sends the did-this-fit answer | `fit`* yes, partly or no; `reasons` list from wrong, else, basic, advanced, price, format |
| `talk_open` | The Talk to us form is shown | `from` one of result, band, nav, dialog |
| `talk_invalid` | Submit blocked by validation | `fields` list from name, email, goal. Names of fields only, never values |
| `talk_submit` | Submit finished (only when a real endpoint is configured) | `ok`* true/false; `attached` true/false |
| `section_view` | A page section is 40% visible, or covers 40% of the screen | `id`* section id |
| `scroll_depth` | 25, 50, 75 and 100 percent reached, once each | `pct`* one of 25, 50, 75, 100 |
| `cta_click` | Any link click outside the dialog, plus Continue to the homepage | `id`* slug of the link; `kind` one of nav, footer, tool, section, startToday, hero; `host` hostname |
| `faq_open` | A FAQ item is opened | `i`* index of the item |
| `page_hide` | Tab hidden or page left, once | `ms` visible time; `scroll` deepest percent; `step` step showing when the visitor left (0 = none); `result` true/false |

`answers` is `{ goal, level, place, obst:[...], format, race }` where `race` is one of `none`, `1-4`, `5-11`, `12-23`, `24+` (weeks). Option ids are in docs/02.

In the schema but not emitted by the reference: `dialog_close` reasons `backdrop` and `pagehide` (a pagehide is recorded through `page_hide`), and `entry_skip` from `startToday`.
Keep them in the schema for the real build's needs.

## Collector: `POST /api/collect`

Implement with `server/collect-core.js` (`validateBatch`). A sketch is in `examples/next-collect-route.example.ts` (**not executed**).

1. Drop obvious bots by user agent and return 204 without storing. The user agent is read once and never stored.
2. Optionally check the `Origin` or `Referer` header is the site, and return 204 otherwise.
3. Read the body as text, reject over 32 KB.
4. `validateBatch(raw, { schema, now })`. It parses, checks the version, the visit id format and the batch size, drops unknown events and properties, checks each value against its type
   and enum, truncates strings, cleans the context (path without query, referrer host only), replaces wild timestamps with the server time, and scrubs the note.
   It refuses any batch that would still contain an identifying key (`email`, `name`, `phone`, `ip`, `ua`, `userAgent`, `message`, `msg`).
5. Store one Firestore document per batch (about three per visit).
6. Answer 204. The tracker never reads the response and never retries.

Rate limiting belongs in a Vercel Firewall rule on `/api/collect`, so IP addresses never enter application code.

`scrubText` removes emails, phone-like numbers, links, bare domains, UK postcodes, @handles and long digit runs from the note, then caps it at 500 characters. It does **not** remove names.
That is a limit to state in the privacy notes (docs/06).

## Firestore layout

| Collection | Document | Holds | Written by | Read by | Expires |
| --- | --- | --- | --- | --- | --- |
| `hx_batches` | auto id | `{ sid, day, ctx, events[], receivedAt, expireAt }`. One per POST | Collector | Rollup job, and "today so far" | `expireAt` (TTL), 400 days |
| `hx_rollups` | `YYYY-MM-DD` | The day's counters, maps and histograms from `rollupDay()`, plus `updatedAt` | Daily job | Admin | Kept: counts only |
| `hx_leads` | auto id | Talk-to-us messages: name, email, goal, week, message, plan answers, `createdAt`, `status`, `expireAt` | `/api/talk` | Admin, owner only | 12 months, or when resolved |
| `hx_insights` | `YYYY-MM` | The monthly Claude review (docs/05) | Monthly job | Admin | Kept |

Why batches and not one document per event or per visit: one write per batch keeps writes and reads low. A per-visit document would need a read before each write.

Security: deny all client access to `hx_batches` and `hx_leads`. Rules example in `examples/firestore.rules.example`. Add a Firestore TTL policy on `expireAt` for `hx_batches` and `hx_leads`.

Dotted keys: rollup maps have keys such as `google.com`. Write rollups with `set()`, never `update()`, or Firestore reads the dot as a path.
Rollup maps keep at most 100 keys each and fold the rest into `_other`, so a hostile client cannot grow a document without limit. Rollup documents stay far below Firestore's 1 MiB limit.

## The daily rollup

`admin/rollup.js` turns a day's events into one small document of counters that can be added together.

- `rollupDay(events, { date })`: events of all visits that **started** on `date`, each carrying its `sid` and `ctx`.
- `mergeDays([doc, doc, ...])`: adds days. Associative and commutative, so any date range is a merge of stored days.
- `report(merged)`: rates, step funnel, source table, product table, medians, attention, put-offs and unmet demand. `insights(report)`: the rule-based "how to improve" list.

Job (sketch in `examples/rollup-job.example.ts`, **not executed**): at about 03:00 UTC, read `hx_batches` for `day` in [D, D+1], drop repeated `(sid, q)`, keep only visits whose first event is on D,
`rollupDay`, `set()` into `hx_rollups/D`. It is safe to run again: it overwrites.

Counting rules worth knowing (they are in the code and tests, and matter when the numbers look odd):

- A "visit" is one page load. Everything result-based uses the **first** `result_view` of a visit. Product clicks count once per visit per product and per slot. The last feedback answer in a visit wins.
- The exit step is the last step the visitor was on, counted only for visits that never reached a result.
- Skips after a result do not exist: "Continue to the homepage" is a click, not a skip.

Test the whole path without real data: `node scripts/demo-report.js`.

## Optional hardening: server-side click-outs

The tracker records `result_click` in the browser. A server-side redirect such as `/go/<product-id>?src=result` that logs and then redirects is more reliable when a browser blocks the beacon, and is
the only way to count Amazon short links precisely. If you add it, keep one source of truth (prefer the redirect), and make the browser event and the redirect share the same `product` ids. The plan in docs/01 asks for this.

## Not tracked, on purpose

Mouse movement or session replay; keystrokes (only the scrubbed note when the step is left); IP address or location; cookies or device ids; names or emails (anywhere in tracking);
the exact race date; the visitor's health details (the interface asks people not to type them, and the note is capped and scrubbed, but see docs/06).
