# 08. Acceptance checklist

Tick each item only after checking it in the real build. "Ref" says where the reference implementation already demonstrates it, so you can see the intended result.
Items marked **(auto)** are covered by a test in this package. Re-run or port that test against the real build, do not just trust the reference.

## A. Funnel behaviour (phase P1 and P2)

- [ ] A1. `routing` returns the documented product for every one of the 73,728 answer combinations (auto: `data/routing.test.js`).
- [ ] A2. The ten golden examples in `routing.test.js` give the documented result (auto).
- [ ] A3. Five questions, one at a time. Goal and format auto-advance; Continue is disabled with a visible hint until the question is answered. Ref: `test.js` "dialog" sections (auto).
- [ ] A4. "Nothing yet" clears the other obstacles; choosing an obstacle clears "Nothing yet" (auto).
- [ ] A5. "Too many options" shows a single recommendation and no extras (auto: routing).
- [ ] A6. A race date turns into weeks in the reason line and a chip (auto). Dates in the past or over two years ahead are ignored (in `raceWeeks()`, not unit tested: add a test).
- [ ] A7. "Change my answers" keeps every earlier answer selected; the station strip jumps only to answered stations (auto).
- [ ] A8. The shareable `#plan=` link restores a result, an invalid one is ignored, and the hash is cleared when the dialog closes (auto).
- [ ] A9. Talk to us: pre-fills goal and note; validates name, email, goal; focus jumps to the first error; with no endpoint it says "This is a preview. Nothing was sent." (auto).
- [ ] A10. Every result link goes to a live page. `athx` and `ultra` no longer point at the generic books page, or the owner has accepted that in writing.
- [ ] A11. Native dialog: focus moves to the heading, tab stays inside, Escape closes and focus returns to the trigger (auto).
- [ ] A12. With JavaScript off, plain links to the free plan, books, app and tools are shown (auto in the entry demo).

## B. Entry above the existing homepage (phase P2)

- [ ] B1. The existing homepage's content inside `#hx-home` is unchanged, and its URL, title, meta description, FAQ and JSON-LD are unchanged. Diff the rendered HTML before and after.
- [ ] B2. There is exactly one `<h1>` on `/` (auto in the entry demo).
- [ ] B3. The skip link is an anchor to `#hx-home`, works with JavaScript off, and is inside the first screen at 390 x 844 (auto).
- [ ] B4. After a skip: entry hidden, page at the top, focus on `#hx-home`, remembered for the tab session, reason strip shown only when tracking is on (auto).
- [ ] B5. After a reload in the same tab the entry stays hidden and is not counted as shown (auto).
- [ ] B6. `/?entry=off` hides the entry and stores nothing (auto).
- [ ] B7. Skip from the dialog closes it and lands on the homepage; "Continue to the homepage" after a result is not recorded as a skip (auto).
- [ ] B8. The header's "Find your plan" still opens the questions after a skip (auto).
- [ ] B9. The entry is server-rendered: view-source shows the headline, tiles and skip link. No layout shift when the page hydrates.
- [ ] B10. On a phone the entry is about one screen tall (reference: 938px at 390 x 844) and the homepage starts within about 1.2 screens.
- [ ] B11. `/start` exists, is `noindex`, accepts `?goal=` and `utm_*`, and reports `mode:"page"` (built by you: the reference has no `?goal=`).
- [ ] B12. Back button: pressing Back with the dialog open closes it instead of leaving the page (not in the reference).

## C. Tracking (phase P3)

- [ ] C1. Every batch the tracker sends passes `validateBatch` with nothing dropped (auto: the browser test validates every batch).
- [ ] C2. Events arrive in journey order, sequence numbers run 0..n with no gaps, and one `result_view` is sent per set of answers (auto).
- [ ] C3. No name or email appears in any tracking request; the talk payload has no visit id (auto).
- [ ] C4. The note is scrubbed before it leaves the browser: emails, phone numbers and links are replaced (auto).
- [ ] C5. The race date is sent as a bucket, and no calendar date appears in any batch (auto).
- [ ] C6. **Zero requests to the collector** with no endpoint, with Global Privacy Control, and with Do Not Track (auto).
- [ ] C7. `captureNote:false` never sends the note and changes the step-5 wording (auto).
- [ ] C8. Scroll depth marks fire once each in order; sections are recorded once each; FAQ opens and link clicks are recorded with kind and host only (auto).
- [ ] C9. Bots are dropped by the collector and not stored. Test with a Googlebot user agent.
- [ ] C10. A test batch reaches `hx_batches` in the real Firestore with `expireAt` set; a batch with an unknown property arrives without it.
- [ ] C11. The visit id is not stored in cookies, `localStorage` or `sessionStorage` (open DevTools > Application after a full journey; only `hx_entry` in `sessionStorage`).
- [ ] C12. `/api/collect` and `/api/talk` do not log request bodies.
- [ ] C13. The talk form stores a lead in `hx_leads` and notifies the owner; a failed send shows the error and keeps what the visitor typed.

## D. Admin analytics (phase P4)

- [ ] D1. The admin pages sit behind the existing admin authentication, checked on the server. A logged-out request gets nothing.
- [ ] D2. The daily job writes `hx_rollups/<date>`; running it twice gives the same document.
- [ ] D3. Merging seven daily rollups gives the same totals as one rollup of the same events (auto: `admin/rollup.test.js` property test).
- [ ] D4. Built against seed data first: the pages show the same numbers as `node scripts/demo-report.js` for the same seed.
- [ ] D5. Each view in docs/05 exists, and each of the owner's questions in the table at the top of docs/05 can be answered from one page.
- [ ] D6. The Put-offs page collects: biggest step drop, slowest step, most-back step, skip reasons, "Not really" reasons, talk-form errors, bounce by device.
- [ ] D7. The Improve page shows the rule-based findings with evidence, and a "not enough data yet" note below 100 visits.
- [ ] D8. The Leads page is restricted, and delete-lead works.
- [ ] D9. The pages say what the numbers cannot tell (visits are page loads; no lead-to-visit link; small samples).
- [ ] D10. The monthly review job runs once against real or seed data, stores `hx_insights/<YYYY-MM>`, and the output matches the schema in `examples/insights-prompt.md`.
- [ ] D11. CSV export works for the source, product and step tables.

## E. Privacy and retention (phase P5)

- [ ] E1. Consent route decided (A or B in docs/06) and implemented.
- [ ] E2. The privacy policy has the plan-finder section and the processors list, and `privacyHref` points to it.
- [ ] E3. Firestore TTL policies are on `hx_batches.expireAt` and `hx_leads.expireAt`; the note-blanking job is scheduled.
- [ ] E4. Firestore rules deny client reads and writes to `hx_batches` and `hx_leads`.
- [ ] E5. On-screen privacy wording matches behaviour in all three states (off, on with note, on without note) (auto for the reference).
- [ ] E6. Someone who handles compliance has read docs/06 and the owner has signed off.

## F. Brand, layout and performance (phases P2 and P6)

- [ ] F1. `scripts/audit-url.js` passes at 1440, 820 and 390: no text under 12px, no horizontal scroll, only brand fonts and weights, only palette colours.
- [ ] F2. The dialog states (each step, result, talk, sent) pass the same audit. Ref: `test.js` audits all of them (auto for the reference).
- [ ] F3. No yellow text on white anywhere; no `font-extrabold`; Inter 500 either loaded or not used.
- [ ] F4. Logo is the supplied file, not an inverted copy.
- [ ] F5. LCP, CLS and INP for `/` are measured before and after. No worse than before, or the owner accepts the change knowingly.
- [ ] F6. Search Console: the homepage's title, meta description and main-query positions are recorded before launch and reviewed at four and eight weeks.
- [ ] F7. The experiment (`A` vs `control`) is running with the stop rule agreed in docs/03, and the admin's Entry vs control view shows both arms.

## Commands

```bash
npm run test:unit
CHROMIUM_PATH=/path/to/chrome npm run test:browser
node scripts/demo-report.js
CHROMIUM_PATH=/path/to/chrome node scripts/audit-url.js http://localhost:3000/
```
