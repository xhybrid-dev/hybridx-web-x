# 05. Admin analytics: understanding visitors and improving the funnel

The owner's requirement: **all response data is kept, stored and analysed in the admin, so he can understand how people visit the site, what attracts
them, what puts them off, and how to improve.**

This document says which page answers which question, where each number comes from, and what the admin must not do.
The numbers come from `admin/rollup.js` (`rollupDay`, `mergeDays`, `report`, `insights`). Do not recompute them in the UI.
To see the target output now: `node scripts/demo-report.js` (synthetic traffic with two planted weak spots).

## The owner's questions, and where they are answered

| Question | Admin view | Key numbers (`report()` keys) |
| --- | --- | --- |
| How do people visit the site? | Overview, Sources, Devices | `totals.sessions`, `sources[]`, `devices[]`, `answerShares.refHost`, `answerShares.utmCampaign` |
| Who are they and what do they want? | People | `answerShares.answers.goal / level / place / obst / format / race` |
| What attracts them? | Homepage attention, Entry, Results | `attractors.goalStarts[]` (which goal tile people pick first), `attractors.sections[]`, `attractors.ctas`, `attractors.faq`, `rates.openRate`, `products[].ctr` |
| What puts them off? | Put-offs (one page), Journey | `putOffs.*`, `stepFunnel[].dropRate / backRate`, `rates.skipRate`, `answerShares.skipReason`, `answerShares.feedbackReasons`, `rates.bounceRate` |
| Is the routing recommending the right thing? | Results and products | `products[]`, `demand.cells[]`, `answerShares.rulePath`, `answerShares.feedbackFit` |
| What do people want that we do not sell? | Unmet demand | `demand.feedbackNoByGoal[]`, `demand.noMatch`, goal shares for `xenom`, talk-form leads |
| Does the entry funnel beat the plain homepage? | Entry vs control | `variants.arms[]`, `variants.lift[]` |
| How can we improve? | Improve | `insights(report)` (rules) and the monthly Claude review |

## Views to build

Build them as pages inside the existing admin, using its layout, auth and UI kit. Every page has the same date-range control: last 7, 30, 90 days and custom.
Show "Data through <date>" from the newest rollup, and "Today so far" if the live view is on.

### 1. Overview
KPI tiles with change against the previous period of the same length: visits, open rate, completion rate, click rate, skip rate, talk rate, bounce rate.
Under them: visits per day (line), and the top three `insights()` items.

### 2. Journey (where people drop out)
- Step funnel: five bars for steps 1 to 5 showing views, answered, went back, left here (`stepFunnel[]`).
- Time on step: the median bucket and the slowest 10% for each step (`medianBuckets.timeOnStep`). A slow step is often a confusing one.
- How the dialog was left: button, Escape, page left (`answerShares.closeReason`).
- Time to result (`medianBuckets.timeToResult`).

### 3. People
Bars for goal, level, place, obstacles, format and weeks-to-race (`answerShares.answers`). The obstacle bars are "what has got in the way": the owner's product research.
Beside the goal bars, show **which goal tile people pick first, including those who never finish** (`attractors.goalStarts[]`: started, reached a result, clicked, completion rate, click rate). That is the clearest "what attracts them" signal, and it shows which goals lose people on the way.
A goal-by-format table (`demand.cells`) with results, clicks and click rate per cell. Use a colour scale.

### 4. Results and products
A table per product: how often it was recommended first, click rate, "Yes / Partly / Not really" split and the reasons given (`products[]`, `answerShares.feedbackReasons`).
Below it, the most common rule paths from `trace` (`answerShares.rulePath`), so a weak product can be traced to the rule that sent people to it.
Show primary and secondary clicks separately (`answerShares.clickBySlot`).

### 5. Entry and skips
Skip rate, where the skip happened (entry bar or dialog), the reasons chosen (`skipReason`), and skip rate by source. Also what skippers did next: the share who clicked a homepage link and the share who scrolled at least halfway (`skips.thenCtaRate`, `skips.thenScroll50Rate`). A skip followed by engagement is a visitor who knew what they wanted; a skip followed by nothing is a visitor who was put off. Entry vs control: visits, open rate, completion, and the lift in
downstream action per visit, with a note when either arm has under 30 visits (`variants`).

### 6. Homepage attention
Which sections were reached and the share of visits that reached each (`attractors.sections`), scroll depth (`attractors.scroll`), the most clicked links (`attractors.ctas`) and the most opened FAQ items
(`attractors.faq`). This is the "what attracts them" view for the **existing** homepage, and it needs `id` attributes on its sections (docs/03).

### 7. Sources
One table: source (referrer host, or `direct`), visits, open rate, completion, click rate, skip rate (`sources[]`). Then UTM source and campaign tables. The point is to find which content brings people
who open the questions and click, and which brings people who skip.

### 8. Put-offs
One page that collects every "put off" signal so the owner does not have to hunt (`putOffs`):
- the step with the biggest drop, the slowest step, the step people go back from most;
- skip reasons and how they split;
- "Not really" feedback reasons;
- talk-form fields that failed validation;
- bounce rate by device and the phone/desktop gap.
Each item links to the view that explains it.

### 9. Improve
- **Rule-based findings** from `insights(report)`: severity, area, finding, evidence (with the numbers), suggestion. Rules and default thresholds are below.
- **Monthly Claude review** from `hx_insights/{YYYY-MM}`: audiences, what attracts, what puts people off, obstacles in the visitors' own words, unmet demand, and up to five changes with how to test each.
  Prompt and output shape are in `examples/insights-prompt.md`.
- A "how to test it" reminder on every suggestion: run the change as the `B` arm and compare in view 5.

### 10. Leads (talk-to-us inbox)
The messages from the Talk-to-us form, newest first: name, email, goal, message, the plan answers if attached, status (new, replied, closed). Restricted to the owner. This is personal data (docs/06). Show the count of leads that came after a
result against those that did not (`talkFrom`).

### 11. Data health
Date of the newest rollup, batches received today, and a warning when yesterday's rollup is missing or visits fell to zero. If the collector drops unexpected properties often, the tracker and schema have drifted, so log a count.

## The rule-based insights

Defined in `admin/insights.js`. Each returns `{ id, severity, area, finding, evidence, suggestion }`. Thresholds live in `DEFAULT_THRESHOLDS` and can be overridden.
Nothing is reported until there are at least 100 visits (`minSessions`): below that, the only item is a "not enough data yet" note.

| Rule (`id`) | Fires when (default) | Severity |
| --- | --- | --- |
| `step-drop-N` | 25% or more of visitors who saw step N left there (30 views minimum); 40% or more is high | medium / high |
| `back-step-N` | 15% or more went back from step N | low |
| `slow-step-N` | The median time on step N is 60 to 120 seconds or slower | medium |
| `low-completion` | Under 40% of those who opened the questions reached a result | high |
| `skip-rate` | 50% or more of visitors shown the entry skipped it; quotes the top reason | high |
| `low-click-rate` | Under 30% of results led to a product click | high |
| `cell-GOAL-FORMAT` | A goal and format combination has 10+ results and under 25% click rate (up to 5 shown) | medium / low |
| `product-feedback-P` | A product has 10+ feedback answers and 30% or more say "Not really" | medium |
| `phone-completion-gap` | Phone completion is 15 points or more below desktop | medium |
| `source-open-gap-SRC` | A source with 50+ visits opens the questions 15 points or more below the site average | medium |
| `ref-skips-SRC` | A source with 50+ visits skips 50% or more | medium |
| `lift-negative-ARM` | The entry arm's downstream action rate is below control; medium only when statistically significant (z of 1.96 or more) | medium / low |
| `section-low-reach-ID` | A homepage section is reached by under 20% of visits that scrolled at least halfway | low |

The thresholds were chosen for a small site and have not been tested against real traffic. Expect to tune them after the first month.

### Example (synthetic data, planted weak spots)

```
HOW PEOPLE VISIT
  entry section opened by   27.1% of visits
  finished the questions    52.5% of those who opened
  clicked a recommendation  48.4% of results
  skipped to the homepage   56.6% of visits shown the entry

WHERE PEOPLE DROP OUT
  step 3 What got in the way  views  1009   left here  33.1%

HOW TO IMPROVE
  [high]   skip: Most visitors skip the plan finder and go straight to the homepage.
           evidence: 2021 of 3573 visitors who saw the entry section skipped it (56.6%); top reason: "know" (177 answers).
  [medium] funnel: Visitors are leaving at step 3 (What got in the way) without a result.
           try: Make this step optional, preselect "none" or shorten the list.
```
These are made-up numbers, produced by `node scripts/demo-report.js`. They show the shape of the page, not a forecast.

## Data access and live numbers

- Server-side only. Every admin data call checks the existing admin authentication on the server. Send `Cache-Control: private, no-store`.
- `getReport({ from, to })`: read `hx_rollups` for the range, `mergeDays`, `report`, `insights`. Cache for a few minutes.
- "Today so far": run `rollupDay` on today's `hx_batches` on demand (a few hundred reads at this site's likely volume) and merge it in.
- **Filters.** The rollup stores cross-tabs for source, device and variant, so those three dimensions have their own tables. For any other slice (for example "only visitors from Instagram who chose the app"), run `rollupDay` on
  the filtered events of a short range (30 days at most) and cache the result. Do not try to filter merged rollups.
- CSV export of any table.
- Read-only. The admin never edits stored events.

## What the admin cannot tell you (say so on the page)

- **Visits are page loads, not people.** There are no cookies, so a returning visitor is a new visit. Do not present "unique visitors".
- **Amazon sales are not visible.** Click-outs are the working measure; sales arrive later in the KDP reports (docs/01).
- **Nothing links a lead to a visit.** That is deliberate (docs/04). Lead quality has to be judged from the message and the attached plan answers.
- **Small samples.** Under about 100 visits a period, or 30 in a cell, treat any rate as a hint.
- **Free-text notes are scrubbed, not perfect.** Names are not removed.

## Backlog (not built)

- Per-question time distributions for the Talk-to-us form.
- Alerting (email when completion falls sharply).
- An "explain this result" panel that replays `explain()` for a set of answers, for support.
