# 02. Funnel spec: questions, routing, result

The source of truth is code and data, not this document. This file explains them.

- Content, options and product catalog: `data/funnel.json`
- Routing rules: `data/routing.js` (tests in `data/routing.test.js`)
- Reference behaviour: `src/app.js`, `dist/index.html`

If this document and the code disagree, the code and its tests win. Fix the document.

## The idea in three lines

The visitor answers five short questions about their own situation. The site hands back one recommended product and up to two
useful extras, chosen by fixed rules. If nothing fits, the visitor can talk to the owner directly. There is no waiting list, no
email step and no sign-up.

## The five questions

| Station | Title | Answer type | What it decides |
| --- | --- | --- | --- |
| 1 | What are you training for? | One of six goals. Auto-advances after 200 ms (no delay with reduced motion) | The product family |
| 2 | Where are you starting from? | One experience level and one training place. Both are needed to continue | Beginner or advanced title; home or gym version |
| 3 | What has got in the way before? | Any number of eight obstacles. "Nothing yet" is exclusive | The extras and the reason line |
| 4 | How do you want to follow your plan? | One of four formats. Auto-advances | The primary product's format |
| 5 | Anything else we should know? | Optional free text, optional race date | Reason line (weeks to race) and raw material for the monthly review |

Then: **6** result, **7** "Talk to us" form, **8** message sent. Step numbers are used in tracking events, so do not renumber them.

### Option ids (these appear in events and in the shareable link, so treat them as permanent)

| Question | Ids |
| --- | --- |
| Goal | `first` My first Hyrox, `faster` A faster Hyrox time, `athx` ATHX 2027, `xenom` XENOM, `ultra` A trail ultra or marathon, `hybrid` General hybrid fitness |
| Level | `new`, `regular`, `raced`, `compete` |
| Place | `home`, `gym`, `both` |
| Obstacle | `structure`, `generic`, `run`, `plateau`, `injury`, `time`, `options`, `none` |
| Format | `free` Free to start, `paper` On paper, `phone` On my phone, `tools` Just tools and guides |

Labels, sub-lines, help text and hints are in `funnel.json`. Change wording there, never by editing the ids.

## Routing

`route(answers)` returns `{ primary, secondary[], paper, freeStart, trace[], version }`. Missing answers fall back to
`first / new / home / paper`, so a result always exists.

**Step 1: which paperback fits the goal**

| Goal | Paperback |
| --- | --- |
| `first` | `twelve` if the visitor trains in a gym, otherwise `home` |
| `faster` | `elite` |
| `athx` | `athx` |
| `ultra` | `ultra` |
| `xenom` | `elite` if level is `raced` or `compete`, otherwise `twelve` |
| `hybrid` | `twelve` |
| override | `first` or `hybrid` with level `raced` or `compete` always gets `elite` |

**Step 2: free starting point.** `vdot` for `ultra`, `rtp` for `faster`, otherwise `free`.

**Step 3: the primary product is set by the format answer**

| Format | Primary |
| --- | --- |
| `phone` | `app` |
| `free` | the free starting point from step 2 |
| `tools` | `free` for `first`, `rtp` for `faster` and `athx`, `vo2` for `xenom` and `hybrid`, `vdot` for `ultra` |
| `paper` | the paperback from step 1 |

**Step 4: up to two extras.** If the visitor chose `options` ("too many options"), show **no** extras. Otherwise build a list in this
order, then drop the primary and duplicates and keep the first two.

1. `run` selected: `run12`, `vdot`
2. `structure` or `plateau` selected: `app`
3. `time` or `generic` selected: `free`
4. the free starting point
5. `app` if the format was `paper`, otherwise the paperback
6. `free`

The `trace` array lists every rule that fired, for example `["paper:first-gym","free-start:free","primary:format-phone","extras:structure-or-plateau"]`.
It is stored with each result so the admin can show which rule paths lead to low click rates or to "talk to us".

### Explanation line

`explain(answers, funnel, { weeks })` builds the sentence under the result heading and the recap chips, for example
"You are training for your first Hyrox, you train regularly without a plan and you train in a gym. You asked to follow your plan on your phone. You want more structure, so the app is listed as an extra."
It only restates what the visitor said and what was added because of it. Do not add persuasion or claims here.

Weeks to race: 12 or more says the time is enough for a full 12-week plan; fewer says to start this week. Dates in the past or more than two years
ahead are ignored.

## The product catalog

Eleven entries in `funnel.json`. `status: "live"` means the link was seen working when the plan was written (29 September 2026).
`status: "confirm"` means it came from the owner's notes and **must be checked before launch**.

| id | Title | Type | Price | Link | Destination type | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `free` | Free 12-week Hyrox plan | FREE PLAN | Free | https://hybridx.club/free-hyrox-plan | free-plan-form | live |
| `app` | The HybridX app | THE APP | £5/month, 14-day free trial | https://app.hybridx.club | app | live |
| `home` | Train for Hyrox at Home | PAPERBACK | On Amazon | https://amzn.to/445PMV1 | amazon-affiliate | live |
| `twelve` | Hyrox 12 Week Training Plan | PAPERBACK | On Amazon | https://amzn.to/3SSh8sz | amazon-affiliate | live |
| `elite` | Elite Hyrox Training Plan | PAPERBACK | On Amazon | https://amzn.to/44jOd74 | amazon-affiliate | live |
| `athx` | ATHX 2027 training book | PAPERBACK | On Amazon | https://hybridx.club/books | books-page | **confirm** |
| `ultra` | ULTRA STRENGTH | PAPERBACK | On Amazon | https://hybridx.club/books | books-page | **confirm** |
| `vdot` | VDOT Calculator | FREE TOOL | Free | https://hybridx.club/vdot | tool | live |
| `rtp` | Race Time Predictor | FREE TOOL | Free | https://hybridx.club/calculators/race-time-predictor | tool | live |
| `run12` | 12-Week Running Plan for Hyrox | FREE GUIDE | Free | https://hybridx.club/12-week-running-hyrox | guide | live |
| `vo2` | Build a Bigger Engine | FREE GUIDE | Free | https://hybridx.club/build-a-bigger-engine | guide | live |

Notes for the build:

- `athx` and `ultra` currently point at the books page. Replace with the direct Amazon links once the owner confirms them, and set `status` to `live`.
- Amazon links are affiliate links: `rel="sponsored noopener"`, and the destination type `amazon-affiliate` lets the admin separate them.
- Not yet in the routing (backlog, see docs/01): 45 Advanced Hyrox Workouts, 60 Hyrox Workouts, HYROX STRENGTH Women's Edition, the Treadmill FIT/TCX Generator,
  and the men's/women's edition toggle. XENOM and Youngstars have no live book, so XENOM routes to the nearest live plan. Count that demand: it shows as `goal = xenom`
  in the admin (docs/05, "Unmet demand").
- The app's own programs are not mapped to goals yet (open question in docs/01). Until they are, `app` always links to `https://app.hybridx.club`.

## Behaviours the reference implements (keep them)

- **One question at a time**, with a five-station strip. Completed stations can be revisited; later ones are disabled.
- **Auto-advance** on the goal and format questions. The multi-select and two-part questions have a Continue button that stays disabled until valid, with a visible hint.
- **Presets.** A story prompt on the homepage or a link can preset the goal, place or obstacle and open at the right station.
- **Result first.** The result appears straight after question 5. No email is asked for. "Change my answers" keeps all previous answers selected.
- **Shareable result.** The URL hash `#plan=goal.level.place.obst1+obst2.format.race` restores a result, and is cleared when the dialog closes.
  Invalid hashes are ignored. Production may prefer a real route such as `/start/result?plan=...` set to `noindex`. Either is fine if the same values restore the same result.
- **Talk to us.** Reachable from the result and from a band on the page. Validates name, email and goal. It pre-fills the goal and the note. It offers "attach my plan finder answers".
  With no endpoint configured it says plainly "This is a preview. Nothing was sent." Never claim a message was sent when it was not.
- **Health details.** Step 5 and the talk form ask the visitor to leave out health details. Keep that line.
- **No dead ends.** Every result links out to a live page; the footer of the result always offers "Talk to us directly".
- **Accessibility.** Native `<dialog>` opened with `showModal`; focus moves to the question heading; Escape closes and focus returns to the trigger; tab focus stays inside the open dialog;
  options are buttons with `aria-pressed`; errors are linked with `aria-describedby`; reduced motion is respected; buttons and options are at least 44px tall.
- **No JavaScript.** The page must still offer plain links to the free plan, books, app and tools.

## Changing the routing

1. Edit `data/routing.js`.
2. Update the oracle table at the top of `data/routing.test.js` **independently** (it is written as data on purpose, so a mistake in code and test cannot agree by accident).
3. Update the golden examples if a documented outcome changes.
4. Bump `VERSION` in `routing.js`. It is sent with every result event, so the admin can compare before and after.
5. Run `npm run test:unit`.

Never delete an option id, because old events and shared links use it. To retire an option, stop rendering it but keep it in `funnel.json` (for example with a `retired: true` flag, a convention you would add: the reference does not implement it).
