# 03. Entry integration: the funnel above the existing homepage, with a skip

This document **replaces the "Homepage rebuild" section of docs/01**. The owner decided to keep the existing homepage and put the funnel in
front of it, so nothing on the existing page is rebuilt or reordered.

Reference: `dist/entry-demo.html` (built from `src/partials/*`). Open it and try the skip, the questions and the result.

## The decision

| | |
| --- | --- |
| Where | At the top of `/`, inside the page, directly under the existing site header |
| What | One full-width section (`#hx-entry`): headline, three reassurance ticks, and the first question as six tiles |
| Skip | A link in the top bar of the section: "Skip to the homepage". It is a real anchor to `#hx-home` |
| Existing homepage | Wrapped in `<div id="hx-home" tabindex="-1">`. Its content is untouched |
| Not used | Redirects, an overlay that covers the page, a separate URL for the entry, hiding the homepage from search engines |

Why in flow and not an overlay: search engines and visitors see the same page; the skip works without JavaScript; the existing homepage keeps
its URL, title and content. Google's guidance on intrusive interstitials is about overlays that hide the content. The entry is ordinary page
content, and the skip link is inside the first screen on phones (tested at 390 x 844).

```
+-------------------------------------------+
| existing site header (unchanged)          |
+-------------------------------------------+
| #hx-entry                                 |   <- new, server-rendered
|   bar: "You can skip the questions..."    |
|        [ Skip to the homepage -> ]        |
|   headline, ticks, question 1 as tiles    |
+-------------------------------------------+
| #hx-skipwhy  (hidden until a skip)        |   <- new, one row of chips, optional
+-------------------------------------------+
| #hx-home  (existing homepage, unchanged)  |
+-------------------------------------------+
| existing footer (unchanged)               |
+-------------------------------------------+
  <dialog id="finder">  the questions, opened from the tiles or the header button
```

## Markup contract

The reference JavaScript looks for these hooks. Keep the ids and `data-` attributes when porting, or update the tracker to match.

| Hook | Where | Meaning |
| --- | --- | --- |
| `#hx-entry` | the entry `<section>` | Present = entry mode. Absent = stand-alone page mode |
| `a[data-skip="bar"][href="#hx-home"]` | in the entry's top bar | The skip link |
| `#hx-home` (`tabindex="-1"`) | wrapper around the existing homepage | Focus and scroll target after a skip |
| `#hx-skipwhy` (`hidden`) | after the entry | Optional one-tap "why did you skip" row |
| `button.tile[data-goal]` | the six goal tiles | Opens the dialog at question 2 with the goal set |
| `[data-open="find"]` | header button, any "Find my plan" button | Opens the dialog where the visitor left off |
| `[data-open="talk"]` | the "Your goal is not on the list?" band | Opens the talk form directly |
| `[data-prompt]`, `[data-goal]` | story cards on the page | Preset an answer and open at the right station |
| `dialog#finder` | end of `<body>` | The plan finder |
| `main section[id]` | homepage sections | The tracker records which are reached (needs an `id` on each) |
| `[data-privacy-tick]` | the third reassurance tick | Text switches to match whether tracking is on |

Heading rule: the entry headline is an `<h2 class="h1">`, not an `<h1>`. The existing homepage keeps its own `<h1>`, so the page never has two.
(The stand-alone `/start` page uses `<h1>`.)

## Skip and continue: every behaviour

| Visitor does | Result | Tracked as |
| --- | --- | --- |
| Clicks "Skip to the homepage" in the entry bar | Entry hides; page scrolls to top; focus moves to `#hx-home`; skip remembered for this tab session; the one-row "why" strip appears if tracking is on | `entry_skip {from:"bar", step:0}` |
| Opens the questions, then clicks "Skip to the homepage" in the dialog | Dialog closes, same as above | `entry_skip {from:"dialog", step:N}` and `dialog_close` |
| Finishes, then clicks "Continue to the homepage" | Same layout result, but **not a skip**: no "why" strip | `cta_click {id:"continue-to-homepage"}`. Remembered as `done` |
| Closes the dialog with Close or Escape | Back to the entry section, unchanged | `dialog_close {reason:"button"|"esc"}` |
| Reloads the page in the same tab after skipping or finishing | Entry stays hidden; not counted as shown again | `page_view` only |
| Opens `/?entry=off` | Entry hidden; nothing remembered. For links from email, ads or the app that should land on the homepage | `page_view` only |
| Opens the page in a new tab or a later visit | Entry shows again | `entry_shown` |
| Has JavaScript off | Tiles are hidden and replaced by plain links; the skip link still jumps to `#hx-home` | none |
| Clicks the header's "Find your plan" after a skip | Dialog opens; the entry does not come back | `finder_open {source:"nav"}` |

Memory is `sessionStorage` key `hx_entry` (`skipped` or `done`), wrapped in try/catch, so it fails safe. It lasts for one tab session and holds no identifier.
If the owner later wants "skip means skip for 30 days", that needs a stored preference. Check the consent position first (docs/06), and decide only after
seeing real skip rates in the admin.

## Stand-alone page: `/start`

Build the same component as its own page for campaigns: social bios, guides, ads.

- `noindex` (meta robots). Do not also add a canonical pointing at `/`: mixing the two sends search engines conflicting signals.
- Accepts `?goal=first|faster|athx|xenom|ultra|hybrid`, `?place=home|gym|both` and the usual `utm_*` values. A valid goal opens the dialog at question 2.
  **The reference implements `utm_*` and the `#plan=` link but not `?goal=` yet. Add it.**
- Its analytics context is `mode: "page"`, so `/start` traffic and homepage-entry traffic are never mixed in the admin.
- Every guide page gets a "Take the one-minute plan finder" block linking to `/start?goal=...&utm_source=guide&utm_campaign=<page-slug>`.

`dist/index.html` is this page.

## Performance and search

The entry adds height above the existing homepage. Measured in the reference (Chromium, tests in `test.js`):

| Viewport | Entry height | Existing homepage starts at |
| --- | --- | --- |
| 1440 x 900 | 816 px | 905 px |
| 390 x 844 (phone) | 938 px | 1,011 px |

So on every device the existing homepage begins roughly one screen down. That is deliberate, but it has costs to watch:

1. **Largest Contentful Paint.** If the existing homepage's LCP element was in its hero, it now sits below the fold. Measure LCP for `/` before launch and again in the experiment.
   The entry should be plain server-rendered HTML with no image, so it paints immediately.
2. **Layout shift.** Render the entry on the server with its final height. Do not inject it after hydration.
3. **JavaScript.** The tiles are plain buttons. Load the dialog code on first click, and prefetch it on hover, focus or touchstart.
4. **Fonts.** Use the fonts the site already loads. Add nothing.
5. **Search.** The homepage's title, meta description, H1, FAQ and JSON-LD stay as they are. The entry adds visible text ("What do you want from your training?"); it should not
   dilute the page. Watch Search Console impressions and average position for the homepage's main queries for two months after launch.
6. **Compact phone layout.** Under 720 px the entry hides its lead paragraph and the tile sub-lines, and shows the tiles two across. That is what keeps the phone entry near one screen.
7. **Back button.** The reference does not push history entries. On a phone, pressing Back with the dialog open leaves the page. The obvious improvement is to push a state when the
   dialog opens and close it on `popstate`. Do it, and track it as `dialog_close {reason:"esc"}` or add a `back` reason to the schema.

## The experiment (launch step, P6)

Question: does adding the entry make more visitors take a useful action than the existing homepage alone?

| | |
| --- | --- |
| Arms | `A` = entry above the homepage. `control` = the existing homepage alone |
| Split | 50 / 50, decided per page load. No cookie, so a returning visitor may see both arms. The effect is small and the design stays cookieless |
| How | Route `/` to two statically generated variants, for example with a middleware rewrite. The rewrite runs before the CDN cache, so each variant caches separately. Confirm on the repo's Next.js version. Do not pick the arm in the browser after load: that flashes and shifts the layout |
| Tracking | Both arms send the tracker with `mode:"entry"` and `variant:"A"` or `"control"`. The control page renders no entry markup and no dialog, only the tracker |
| Primary measure | Downstream actions per 100 visits: free plan requests, app trial starts, Amazon click-outs. In the tracker these are `result_click` (via the funnel) and `cta_click` (on the existing homepage's links) |
| Guardrails | Bounce under 10 s, LCP, skip rate, Search Console position |
| Reading it | `report().variants.lift` in `admin/rollup.js` compares arms and needs 30 visits each; treat it as meaningful only with a few hundred per arm |
| Stop rule | Agree it with the owner in advance, for example: at least four weeks and 300 visits per arm |

The admin's "Entry vs control" view is specified in docs/05.

## Acceptance for this document

See docs/08 section B. In short: the existing homepage is byte-for-byte unchanged inside `#hx-home`; the skip works with and without JavaScript; there is exactly one `<h1>` on `/`;
focus lands on `#hx-home` after a skip; and the phone entry is under about 1.2 screens tall.
