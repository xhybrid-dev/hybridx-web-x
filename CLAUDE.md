# Project notes for Claude

## Infrastructure

- **Firebase project ID:** `hybridx-hub`
- **Firebase App Hosting backend name:** `studio`
  - Public URL: `https://hybridx.club`
  - Used as `--backend studio` for `firebase apphosting:secrets:grantaccess`.
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
  firebase apphosting:secrets:grantaccess SECRET_NAME --project hybridx-hub --backend studio
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
