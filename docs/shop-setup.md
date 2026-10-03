# Shop setup: HYROX Glasgow 2027 PDFs

The shop sells the Preparation Guide and the Pacing Pack at `/hyrox-glasgow-2027`
through Stripe Checkout and delivers them from a private Firebase Storage bucket.
It ships switched off. `SHOP_SALES_OPEN` is `"false"` in `apphosting.yaml`, so
the page shows "Sales have not opened yet", checkout returns 503, the page is
`noindex`, and nothing links to it. Work through this file in order, then
turn it on.

## Decisions to make before going live

Each one is a value in config, so settling it needs no code change.

| # | Decision | Where it lives |
|---|---|---|
| 1 | **EU VAT.** (a) register for the EU non-Union OSS, enable Stripe Tax, set `SHOP_TAX_ENABLED=true`; (b) sell through Payhip instead and swap the buy panel for links; (c) UK buyers only, which needs advice on how to enforce it. **Do not open sales until this is chosen.** | `apphosting.yaml` |
| 2 | **Prices.** Guide £8, Pack £5, both £12 assumed. | `pricePence` in `src/lib/shop/config.ts`, and the Stripe Prices. Checkout refuses to run if the two differ. |
| 3 | **Consent and refund wording.** | `SHOP_CONSENT` (bump `version` when the text changes) and `policies.refunds` in `config.ts` |
| 4 | **Email sender.** Unset, order email goes from `EMAIL_FROM` (`info@train.hybridx.club`, already authenticated in Brevo). | `SHOP_EMAIL_FROM` in `apphosting.yaml` |
| 5 | **Free updates.** Whether the free-update promise stands. | `policies.updates` in `config.ts` |
| 6 | **Support email** shown on the page and the download page. Currently `training@hybridx.club`. | `SHOP_SUPPORT_EMAIL` in `config.ts` |

Also review these drafts: `/shop-terms` (`src/app/shop-terms/page.tsx`) and
section 7 "Purchases" of `/privacy-policy`. Both are marked `DRAFT` in the source.
Neither has been checked by a lawyer.

## 1. Stripe (test mode first)

1. Create three products: *HYROX Glasgow 2027 Preparation Guide*, *HYROX Glasgow
   2027 Pacing Pack*, *HYROX Glasgow 2027 Preparation Guide and Pacing Pack*. Give
   each a one-off GBP price (800, 500, 1200 pence) and note the `price_...` ids.
2. On each product set the **tax code** for a downloadable digital document.
   Search "digital" in the product's tax code picker and choose the downloadable
   electronic publication code, not a streamed or physical one. Set each price's
   tax behaviour to *inclusive*, so a buyer pays the listed price.
3. Settings → Business: business details, public support email, statement descriptor.
4. Settings → Customer emails: turn on **successful payment** receipts.
5. Confirm which Stripe account these keys belong to. The app's subscription
   billing (hyroxedgeai) is untouched by this code. If both share an account,
   that is fine: the webhook ignores any session without `metadata.shop_event`.

## 2. Webhook

Developers → Webhooks → add endpoint `https://hybridx.club/api/shop/stripe-webhook`
with exactly these events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `charge.refunded`
- `charge.dispute.created`

Copy the signing secret (`whsec_...`).

## 3. Secrets and environment (App Hosting, not Vercel)

The site runs on Firebase App Hosting (`hybridx-hub`, backend `studio`), not
Vercel. **Read "Deploy gotchas" in `CLAUDE.md` first.** A `secret:` binding
whose secret is missing fails the whole build, so create and grant before
uncommenting:

```bash
echo -n "sk_test_..." | firebase apphosting:secrets:set STRIPE_SECRET_KEY --project hybridx-hub
echo -n "whsec_..."   | firebase apphosting:secrets:set STRIPE_WEBHOOK_SECRET --project hybridx-hub
firebase apphosting:secrets:grantaccess STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET \
  --project hybridx-hub --backend studio
```

Then, in `apphosting.yaml`, uncomment the Stripe block and fill in the three
`STRIPE_PRICE_*` values. App Hosting has one backend, with no separate preview
environment, so test locally against test keys (section 6) and put **live** keys
on the backend only when going live (section 7). Replacing a secret's value is
another `secrets:set`; the grant carries over.

All settings:

| Variable | Default | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://hybridx.club` | Stripe redirects and email links |
| `STRIPE_SECRET_KEY` | | secret |
| `STRIPE_WEBHOOK_SECRET` | | secret |
| `STRIPE_PRICE_GUIDE`, `_PACK`, `_BUNDLE` | | Price IDs |
| `SHOP_SALES_OPEN` | `false` | BUILD and RUNTIME, because the sitemap and cross-links are static |
| `SHOP_TAX_ENABLED` | `false` | Decision 1 |
| `SHOP_SALES_CLOSE_AT` | `2027-03-14T23:59:00Z` | After this, the page says sales have closed and checkout returns 410. Download pages keep working. |
| `SHOP_EMAIL_FROM` | `EMAIL_FROM` | Decision 4 |
| `SHOP_DOWNLOAD_LIMIT_PER_PRODUCT_DAY` | `10` | per order, per file, rolling 24h |
| `SHOP_DOWNLOAD_LIMIT_TOTAL` | `50` | per order, ever |
| `SHOP_STORAGE_BUCKET` | `hybridx-hub.firebasestorage.app` | |
| `SHOP_IP_COUNTRY_HEADER` | | App Hosting sends no country header, so `ipCountry` is usually empty. Billing and card country are the two pieces of OSS evidence. |

Email uses the existing Brevo SMTP setup (`SMTP_*`). No new provider.

## 4. Firebase

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage --project hybridx-hub
```

- `storage.rules` is new and denies all client access. Nothing on the site uses
  client-side Storage, so this changes nothing else.
- Indexes added: `shop_orders (email, createdAt desc)` for `/resend`, and
  `shop_downloads (orderId, product, at)` for the daily limit. Lookups by
  `downloadToken` and `paymentIntentId` use Firestore's automatic single-field
  indexes. A composite index cannot have one field.
- **Signed URLs need one IAM grant.** The App Hosting backend's service account
  signs the five-minute download links through IAM `signBlob`, so it needs
  *Service Account Token Creator* on itself:

  ```bash
  SA=$(gcloud run services describe studio --region us-central1 --project hybridx-hub \
        --format='value(spec.template.spec.serviceAccountName)')
  gcloud iam service-accounts add-iam-policy-binding "$SA" \
    --member="serviceAccount:$SA" --role=roles/iam.serviceAccountTokenCreator --project hybridx-hub
  ```

  Without it every download returns 500 and the log names `iam.serviceAccounts.signBlob`.
  Check the service name and region with `gcloud run services list --project hybridx-hub`.

## 5. Upload the PDFs

Keep the source files in `private/shop-source/`, which git ignores. They never go
in `public/` or the deployed bundle.

```bash
gcloud auth application-default login   # as an owner of hybridx-hub
npx tsx scripts/shop-upload.ts glasgow-2027-guide private/shop-source/HybridX_HYROX_Glasgow_2027_Guide.pdf 1 "First edition"
npx tsx scripts/shop-upload.ts glasgow-2027-pack  private/shop-source/HybridX_HYROX_Glasgow_2027_Pacing_Pack.pdf 1 "First edition"
```

To ship a correction, upload the new file under the next version number with a
one-line note. Every buyer's download page shows it immediately, with the note
under "Changes". No deploy needed. Old versions stay in the bucket.

## 6. Test (Stripe test mode)

```bash
stripe listen --forward-to localhost:3000/api/shop/stripe-webhook
```

Locally you need `STRIPE_*`, `SHOP_SALES_OPEN=true`, Brevo SMTP credentials and
`LEAD_TOKEN_SECRET` in `.env` (see "Running a magnet funnel locally" in `CLAUDE.md`).
Card `4242 4242 4242 4242`.

- [ ] Buy each product and the bundle. The thanks page redirects to `/d/...` and the email arrives.
- [ ] Buy, then close the tab before the redirect. The email still arrives and the link works.
- [ ] Refund in the dashboard. The download page shows the refund message and downloads stop.
- [ ] The order in `shop_orders` has `billingCountry`, `cardCountry` (and `ipCountry` if a header provides it). Try a non-UK billing address.
- [ ] The Buy buttons stay disabled until the box is ticked. `consent.text`, `version` and `acceptedAt` are on the order.
- [ ] `/resend` with a buyer address sends the links. With an unknown address it says the same thing and sends nothing.
- [ ] The page works at 360px. Run Lighthouse mobile (target 95+ for performance, accessibility, SEO).
- [ ] The email passes SPF, DKIM and DMARC and lands in the inbox on Gmail and Outlook.

Automated: `npm run test:run` (`src/lib/__tests__/shop-*.test.ts`).

## 7. Go live

1. Live keys and Price IDs in place (section 3), PDFs uploaded to the live bucket.
2. Set `SHOP_SALES_OPEN: "true"` and deploy. The sitemap entry and the links from
   `/calculators`, `/free-hyrox-plan` and `/hyrox-rule-changes-2026` appear with
   this rollout.
3. Make one real £5 purchase and refund it.

## How it fits together

- `src/lib/shop/config.ts`: events, files, offers, prices, consent, policies. Client-safe.
- `src/lib/shop/env.ts`: environment settings and the sales state.
- `checkout.ts`: creates the Checkout Session; the price is chosen and checked server-side.
- `orders.ts`: `fulfilOrder()`, idempotent, called from the thanks page and the webhook; refunds and disputes.
- `downloads.ts`, `storage.ts`, `products.ts`: limits, signed URLs, current versions.
- `resend.ts`, `email.ts`: transactional email only. No list signup.
- Routes: `/api/shop/{checkout,stripe-webhook,download,resend}`. Pages:
  `/hyrox-glasgow-2027`, `/hyrox-glasgow-2027/thanks`, `/d/[token]`, `/resend`, `/shop-terms`.

Download tokens and session ids are bearer secrets. Middleware sets
`no-referrer`, `no-store` and `noindex` on `/d/` and the thanks page, robots.txt
disallows `/d/`, and Google Analytics records them as `/d/[token]` with
`session_id` and `token` stripped.

**A second event** is a new `SHOP_EVENTS` entry (event-prefixed keys, its own
`priceEnv` names), its previews under `public/shop/<slug>/`, a landing page and a
three-line thanks page that renders `ShopThanks`.

## Free sample, split calculator and FAQ

The landing page also carries three things that work whether or not sales are open:

- **Free run split calculator** (`src/components/shop/SplitPreview.tsx`). It uses the
  Pacing Pack's own division profiles (`src/lib/shop/glasgow-2027-pacing.ts`), so
  its numbers match the pack. It shows the eight runs, the halfway clock and the
  totals. The station-by-station targets stay in the pack.
  `glasgow-pacing.test.ts` checks it against the printed tables. If the pack's
  tables change, re-measure the shares as that file describes.
- **Free sample pages** (Guide p5 and p9, Pack p8) through the existing magnet
  machinery: slug `hyrox_glasgow_2027_sample`, confirmed opt-in, file
  `private/hyrox-glasgow-2027-sample.pdf`, confirm page `/hyrox-glasgow-2027/sample`.
  Confirming adds the address to the mailing list, and the form says so. This
  follows the site's other magnets rather than the brief's optional checkbox.
  **Set up the follow-up in the console** at `/admin/marketing/studio` on
  app.hybridx.club, naming the funnel `hyrox_glasgow_2027_sample`. Before race
  week, a short drip is where the sample turns into sales: the benchmark tests in
  Week 1, the half simulation in Week 9, and race week logistics. If the PDFs
  change, rebuild the sample from the same three pages.
- **FAQ** with `FAQPage` structured data, and a "where to start in the plan" line
  that states the current plan week. The download page shows the same line to
  Guide buyers, and mentions the other PDF to anyone who bought only one.

## Not built yet (phase 2)

Server-side `shop_purchase` event, per-buyer PDF
stamp, `scripts/notify-buyers.ts`, promo codes.
