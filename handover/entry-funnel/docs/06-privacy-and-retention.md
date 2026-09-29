# 06. Privacy, consent and retention

**This is a checklist and draft wording for the owner to review with whoever handles his compliance. It is not legal advice.** The aim is that the tracker
collects little, says what it does, and does what it says.

## What is collected

| Data | Example | Personal data? | Where | Kept |
| --- | --- | --- | --- | --- |
| Random visit id | `9f2c…` (32 hex, new every page load, in memory only) | Not by itself: it links nothing to a person | `hx_batches` | 400 days |
| Answers | goal `first`, level `new`, obstacles `run` + `time` | No | `hx_batches`, `hx_rollups` | 400 days (raw), counts kept |
| Race timing | weeks bucket `12-23` | No | same | same |
| Free-text note | "Race in Leeds, train before work" (scrubbed) | **Could be.** People may type names, places or health details | `hx_batches` | **90 days** (then blanked), see below |
| Behaviour | which step was left, skips, section reached, links clicked, scroll depth | No | same | same |
| Context | referrer host, UTM tags, phone/tablet/desktop, language, page path | No | same | same |
| Talk-to-us message | name, email, goal, message, attached answers | **Yes** | `hx_leads` | 12 months, or when resolved |

**Never collected by the tracker:** IP address, user agent (read once to skip bots, never stored), cookies, device or advertising ids, name, email, exact race date, precise location.

## The law, briefly

The rules that matter are UK GDPR and the Privacy and Electronic Communications Regulations (PECR). Two questions:

1. **Does the tracker need consent under PECR?** PECR covers storing information on, or accessing information from, a visitor's device. The ICO's guidance on storage and access technologies
   (finalised 29 April 2026, [ICO page](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/)) lists scripts and tags among the technologies it covers and
   describes an exception to consent for statistical purposes, which requires clear and comprehensive information and a simple way to object.
   This tracker stores nothing on the device, but it does run a script that reads the referrer, screen width and language and sends them out. I could not confirm from the guidance whether that set-up qualifies for the exception.
   **Do not assume "cookieless" means "exempt".** Ask, and record the answer.
2. **Is any of the data personal data under UK GDPR?** The visit id is random and not linked to a person, the answers are ids, and the note is scrubbed, so the tracked data is designed to be anonymous.
   Two weak points: free text can contain names, and small combinations of answers plus a rare referrer could in theory single someone out. That is why the note is capped, scrubbed, expires early, and the race date is bucketed.
   Talk-to-us messages are ordinary personal data.

### Decision for the owner: consent route

| Option | What it means | Build impact |
| --- | --- | --- |
| **A. Gate on consent (default)** | The tracker starts only after the visitor accepts analytics in a cookie banner. Without consent, the funnel works but sends nothing, and the privacy lines change | Set `trackEndpoint` only after consent. If the site has no banner, add one |
| B. Statistical-purposes exception | No banner for this tracker, but the privacy policy must describe it clearly and offer a simple way to object | Add an "opt out of analytics" link that stores a flag (a user-requested preference) and make the tracker honour it. **Not in the reference.** Confirm eligibility first |

Either way, Global Privacy Control and Do Not Track are honoured today, and the screen text says the truth in each state (docs/04).

Missing consent is not an error: the funnel must work identically with tracking off.

## The free-text note

The step-5 box invites a race, a schedule or equipment, and asks people to leave out health details. People still may type them. Health information is special category data, so:

- The interface asks people to leave it out (both step 5 and the Talk-to-us form).
- The note is capped at 500 characters, scrubbed in the browser and again on the server (emails, phone numbers, links, domains, postcodes, handles, long digit runs). Names and health words are **not** removed.
- Notes are only useful for the monthly review. **Blank the text of every note 90 days after receipt** (a scheduled job that rewrites `q_answer` events with `key:"note"` in `hx_batches`), and keep the counts and themes in `hx_insights`.
- If the owner would rather not take the risk, set `captureNote:false`. The funnel then sends no free text at all and loses only the "obstacles in their own words" part of the monthly review.
- The monthly review sends up to 200 scrubbed notes to an AI provider (Anthropic's API) to summarise. That is a processor and must appear in the privacy policy. Do not send anything else from the visitor's message or from leads.

## Retention

| Data | Rule | How |
| --- | --- | --- |
| Raw batches (`hx_batches`) | Delete after 400 days | Firestore TTL policy on `expireAt` (set by the collector) |
| Note text | Blank after 90 days | Scheduled job |
| Rollups (`hx_rollups`) | Keep | Counts only |
| Leads (`hx_leads`) | 12 months after last contact, or earlier when closed | TTL on `expireAt`, refreshed when a lead is answered |
| Monthly reviews (`hx_insights`) | Keep | Summaries, no raw notes stored |
| Server logs | Do not log request bodies for `/api/collect` or `/api/talk` | Check Vercel log settings |

## Rights and requests

- Tracked data cannot be looked up by a person, because nothing identifies them. Say so in the policy.
- Leads can: a person can ask what you hold or ask you to delete it. Build a "delete lead" action in the admin (docs/05, Leads).
- Nothing joins a lead to a tracked visit, so deleting a lead does not leave a behavioural record behind.

## Where the data sits

Choose the Firestore region deliberately (a UK or EU region if the project allows), and list the processors in the policy: Vercel (hosting, the collector), Google Cloud/Firebase (storage), and Anthropic (monthly review).

## Draft policy wording (for review, not for pasting unread)

> **Plan finder and how we use it.** When you use our plan finder we save your answers (your goal, experience, how you train, what has got in the way and how you like to follow a plan) together with a few facts about your visit: the page you came from,
> whether you are on a phone, tablet or computer, which parts of the page you looked at, and which links you clicked. We do not save your name, email address, IP address or any identifier stored on your device, and we cannot tell who you are from this data.
> We use it to see how people use the site and to improve our plans and our website. If you type a note in the plan finder, we remove email addresses, phone numbers and links from it and delete it after 90 days. Please leave out health details.
> We use Vercel to run the site, Google Firebase to store this information, and an AI service to summarise anonymous notes once a month.
> If you choose to message us, we use your name, email and message to reply, keep them for up to 12 months, and store them separately from the plan finder data.
> [Consent route: either "We only do this if you accept analytics in our cookie banner" or, if the owner relies on the statistical exception, "You can opt out here: link".]
> You can ask us what personal data we hold about you, or ask us to delete it, at [contact].

## What the screen says, and what makes it true

| The screen says | Made true by | Checked by |
| --- | --- | --- |
| "Answers stay on your device" (tracking off) | No `trackEndpoint`, or GPC, or DNT: the tracker sends nothing | `test.js`: zero requests to the collector in all three cases |
| "Answers saved without your name" (tracking on) | Collector drops unknown fields and refuses identifying keys; the talk payload has no visit id | `test.js`: no name or email in any batch; `collect-core.test.js` |
| "What you type in this box is not saved" (`captureNote:false`) | The note is never sent | `test.js`: `captureNote:false never sends the note` |
| "Nothing you type here is sent anywhere unless you choose to message us" (tracking off) | Same as the first row | Same |
| "This is a preview. Nothing was sent." (talk form, no endpoint) | The form does not post | `test.js` |

If any of these behaviours changes, change the wording in `funnel.json` in the same commit.

## Pre-launch checklist

- [ ] Consent route decided (A or B) and recorded.
- [ ] Privacy policy updated (draft above) and linked from the step-5 line (`privacyHref`).
- [ ] Firestore region chosen; processors listed.
- [ ] TTL policies set on `hx_batches.expireAt` and `hx_leads.expireAt`; note-blanking job scheduled.
- [ ] Rules deny client access to `hx_batches` and `hx_leads`.
- [ ] Request bodies for `/api/collect` and `/api/talk` are not logged.
- [ ] Admin access limited to the owner and named staff; Leads view restricted further.
- [ ] Delete-lead action works.
- [ ] Someone who handles compliance has read this page.
