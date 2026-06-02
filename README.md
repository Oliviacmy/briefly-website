# Briefly — Landing site

A polished, single-page static landing site for **Briefly**, the daily Hong Kong and global news briefing in professional English with full Traditional Chinese translation.

## Project structure

```
briefly-website/
├── index.html                       # All page content & sections + checkout form modal
├── styles.css                       # Editorial design system + responsive styles
├── script.js                        # Checkout form handling + reveal animations
├── api/
│   ├── create-checkout-session.js   # Creates a Stripe Checkout subscription session
│   └── stripe-webhook.js            # Stripe webhook → Brevo sync + confirmation email
├── assets/
│   └── briefly-logo.png             # Transparent wordmark
├── package.json                     # Serverless dependencies (stripe, raw-body)
├── vercel.json                      # Vercel config
├── .env.example                     # Environment variable template
└── README.md                        # This file
```

The **static site** (HTML/CSS/JS) has no build step. The **checkout flow** requires
serverless functions in `api/`, which need a backend host such as **Vercel**.

```bash
# Quick static-only preview (checkout API will not run here)
python3 -m http.server 8000
# → http://localhost:8000

# Full preview with the API routes (requires the Vercel CLI + .env.local)
npm install
npx vercel dev
# → http://localhost:3000
```

## Editing copy

All marketing copy lives in `index.html`. Sections are clearly commented:

- `<!-- HERO -->` — headline, lede, pricing CTAs
- `<!-- WHAT YOU GET -->` — six-card feature grid
- `<!-- EDITORIAL PROCESS -->` — AI-assisted workflow and manual editor check
- `<!-- SAMPLE BRIEFING -->` — one HK story and one global story with translation, “Why it matters”, and a Useful English table
- `<!-- WHY DIFFERENT -->` — six-card differentiator grid on the purple section
- `<!-- WHO IT'S FOR -->` — audience grid
- `<!-- SOCIAL PROOF / TESTER CTA -->` — beta testers card with reader quotes
- `<!-- FINAL SUBSCRIBE -->` — closing CTA with monthly and yearly pricing cards
- `<!-- FOOTER -->` — footer

The site copy follows the Briefly editorial voice guidelines (Editorial, Clear, Calm, Contextual, Respectful). It is intentionally media-first, never classroom-tone.

## Editing colours

All colour tokens are defined as CSS custom properties at the top of `styles.css`:

```css
:root {
  --c-purple:       #5D17EA;  /* Primary brand */
  --c-cream:        #FEE8C4;  /* Warm highlight */
  --c-off-white:    #FFF7E9;  /* Body background */
  --c-sand:         #B89152;  /* Accent / labels */
  --c-brown:        #684715;  /* Editorial text */
  --c-brown-deep:   #2A1B0A;  /* Primary text */
  --c-border-cream: #F0D6AE;  /* Card borders / dividers */
  --c-white:        #FFFFFF;  /* Translation surfaces */
}
```

Change a hex value and every component that uses that role updates.

## Replacing the logo

Drop a new transparent PNG at `assets/briefly-logo.png` and the header and footer will pick it up. Recommended widths per the brand guide:

- Desktop nav: 130–170 px
- Mobile nav: 110–140 px
- Footer logo: ~140 px

In `styles.css`, the `.brand-logo` and `.footer-logo` rules control on-page width.

## Checkout flow

The page is set up for two subscription options:

- **Monthly**: HKD 29/month
- **Yearly**: HKD 252/year, equivalent to HKD 21/month

Pricing buttons (`data-plan="monthly"` / `data-plan="yearly"`) no longer redirect
directly to Stripe payment links. Instead they open a **subscriber form** that
collects, before checkout:

- **Name**
- **Email**
- **Age** (13–120)
- **Education** — one of: Primary School, Secondary School, Bachelor's, Postgraduate or above

On valid submission, `script.js` POSTs the form to `POST /api/create-checkout-session`,
which validates the input server-side, creates a **Stripe Checkout subscription
session**, stores the form fields in both the **session metadata** and the
**subscription metadata**, and returns the hosted checkout URL for redirect.

After payment, Stripe fires `checkout.session.completed` to
`POST /api/stripe-webhook`, which adds/updates the subscriber in **Brevo** and
sends a branded confirmation email.

### Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (and in a
local `.env.local` for `vercel dev`). See `.env.example` for a template. Never
commit real secrets.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | both API routes | Stripe secret key (`sk_live_...` / `sk_test_...`) |
| `STRIPE_MONTHLY_PRICE_ID` | create-checkout-session | Stripe **Price** ID for the monthly plan |
| `STRIPE_YEARLY_PRICE_ID` | create-checkout-session | Stripe **Price** ID for the yearly plan |
| `STRIPE_WEBHOOK_SECRET` | stripe-webhook | Signing secret for the webhook endpoint (`whsec_...`) |
| `BREVO_API_KEY` | stripe-webhook | Brevo API v3 key |
| `BREVO_LIST_ID` | stripe-webhook | Numeric Brevo list ID to add subscribers to |
| `BREVO_SENDER_EMAIL` | stripe-webhook | Verified Brevo sender email |
| `BREVO_SENDER_NAME` | stripe-webhook | Sender display name (e.g. `Briefly`) |
| `CHECKOUT_SUCCESS_URL` *(optional)* | create-checkout-session | Override success redirect |
| `CHECKOUT_CANCEL_URL` *(optional)* | create-checkout-session | Override cancel redirect |

> **Migration note:** the previous direct payment links
> (`buy.stripe.com/dRmaEWbtlgyv9wY7QV2Fa02` monthly,
> `buy.stripe.com/00w5kC2WP6XV8sUc7b2Fa03` yearly) are replaced by Checkout
> Sessions. Create **recurring Prices** in Stripe (HKD 29/month and HKD 252/year)
> and use their `price_...` IDs for `STRIPE_MONTHLY_PRICE_ID` /
> `STRIPE_YEARLY_PRICE_ID`.

### Stripe webhook setup

1. In the Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://YOUR_DOMAIN/api/stripe-webhook`.
3. Subscribe to the event **`checkout.session.completed`**.
4. Copy the endpoint's **Signing secret** into `STRIPE_WEBHOOK_SECRET`.

The webhook reads the **raw** request body for signature verification, so
Vercel's automatic body parsing is disabled for that route via the exported
`config = { api: { bodyParser: false } }`.

### Testing the webhook

Use the [Stripe CLI](https://stripe.com/docs/stripe-cli) to exercise the
endpoint without making a real payment:

```bash
# 1. Forward live events to your deployed (or local) endpoint and print the
#    signing secret to use as STRIPE_WEBHOOK_SECRET while testing.
stripe listen --forward-to https://YOUR_DOMAIN/api/stripe-webhook

# 2. In another terminal, trigger a completed checkout with subscriber metadata.
stripe trigger checkout.session.completed \
  --add checkout_session:metadata.name="Test Reader" \
  --add checkout_session:metadata.email="you@example.com" \
  --add checkout_session:metadata.age="34" \
  --add checkout_session:metadata.education="Bachelor's" \
  --add checkout_session:metadata.plan="monthly"
```

The handler logs each step to the Vercel function logs
(**Vercel → Project → Logs**, filter by `/api/stripe-webhook`). Emails are
**masked** in logs (`t***@example.com`) and the JSON response reports what ran:

```json
{ "received": true, "contactSynced": true, "emailSent": true }
```

If `contactSynced` or `emailSent` is `false`, the cause is logged on the same
invocation. A real end-to-end test (open the site → submit the form → complete a
test-mode card `4242 4242 4242 4242`) is the most faithful check.

### Why Brevo did not update — troubleshooting checklist

If a new subscriber never appears in the Brevo list or no confirmation email
arrives, work down this list (most common first):

1. **Webhook not wired up.** Confirm the endpoint exists in Stripe →
   Developers → Webhooks, points at `/api/stripe-webhook`, and is subscribed to
   **`checkout.session.completed`**. Check the endpoint's recent deliveries for
   non-2xx responses.
2. **Wrong / missing `STRIPE_WEBHOOK_SECRET`.** A mismatched signing secret
   makes the handler return **400 Invalid signature** before Brevo is ever
   called. Each endpoint (and the Stripe CLI) has its **own** secret — copy the
   right one into the matching environment.
3. **Brevo env vars not set in Production.** `BREVO_API_KEY`, `BREVO_LIST_ID`
   and `BREVO_SENDER_EMAIL` must be set for the **Production** environment in
   Vercel, then **redeploy** (env changes don't apply to existing deploys). If
   `BREVO_API_KEY` is missing the handler logs `brevo not configured`.
4. **Custom attribute rejected (historical cause).** Brevo returns **400** for
   the whole contact upsert if it references an attribute (`AGE`, `EDUCATION`,
   `PLAN`) that isn't defined on the account. The webhook now **creates these
   attributes idempotently** on each run and, if it still gets a 400, **retries
   without the optional attributes** so the contact is added to the list
   regardless. To store the structured fields, make sure the attributes exist:
   Brevo → Contacts → Settings → Contact attributes (`AGE` = Number,
   `EDUCATION` = Text, `PLAN` = Text).
5. **Sender not verified.** The confirmation email send returns **400** if
   `BREVO_SENDER_EMAIL` is not a verified sender/domain in Brevo. The contact
   can still sync even when the email fails — they're independent steps.
6. **`BREVO_LIST_ID` not numeric or wrong list.** It must be the numeric list
   ID (e.g. `2`), not the list name. A missing list ID still creates the
   contact but adds it to no list (logged as a warning).
7. **Confirmation email in spam.** Check the recipient's spam folder and
   Brevo → Transactional → Logs/Statistics to confirm the send and delivery.

The webhook always returns **HTTP 200** once the Stripe signature is valid (so
Stripe won't retry forever for downstream Brevo hiccups). This means a Brevo
failure does **not** surface as a failed webhook delivery in Stripe — check the
**Vercel function logs** and the JSON response (`contactSynced` / `emailSent`)
to see what actually happened.

### Brevo setup

1. Create (or pick) a **contact list** and note its numeric ID → `BREVO_LIST_ID`.
2. Verify a **sender** address in Brevo → `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME`.
3. Generate an **API v3 key** → `BREVO_API_KEY`.
4. Contact attributes `AGE` (Number), `EDUCATION` (Text) and `PLAN` (Text) are
   **created automatically** by the webhook the first time it runs. You can also
   pre-create them in Brevo → Contacts → Settings → Contact attributes. If they
   can't be created, the webhook still adds the contact to the list without
   those optional fields.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import the project in Vercel (no framework preset needed — it's static + `api/`).
3. Add all environment variables above for the Production environment.
4. Deploy. Static assets are served from the repo root; functions are served from `api/`.
5. Add the Stripe webhook endpoint pointing at your deployed `/api/stripe-webhook`.

> **GitHub Pages note:** GitHub Pages can host the static site (`index.html`,
> `styles.css`, `script.js`, `assets/`) but **cannot run the `api/` serverless
> functions**, because it serves static files only and cannot hold secrets.
> The checkout/webhook backend must run on Vercel (or another Node backend host).
> On a static-only host the pricing form will open, but submitting it will fail
> because `/api/create-checkout-session` won't exist.

## Editorial schedule

Briefly is positioned as a **7:00am HKT** morning briefing.

- News is locked as of **6:00am HKT**.
- AI assists with source scanning, story organisation, first-draft summaries and Traditional Chinese support.
- From **6:00am to 7:00am**, professional editors manually check story selection, source quality, wording, translation quality, “Why it matters” notes and Useful English.
- The newsletter is released at **7:00am HKT**.

## Subscriber data flow

```
Pricing button → form (name, email, age, education)
   → POST /api/create-checkout-session  (validates, creates Stripe session, stores metadata)
   → Stripe Checkout (hosted payment)
   → checkout.session.completed → POST /api/stripe-webhook
       → Brevo: upsert contact (+ list) using session metadata
       → Brevo: send branded confirmation email
```

The Stripe secret key and Brevo API key are read from environment variables and
are **never** exposed in browser JavaScript — all payment and contact-sync logic
runs in the serverless functions.

## QA / checks run

- `node --check` passes on `script.js`, `api/create-checkout-session.js`, and `api/stripe-webhook.js`.
- `package.json` and `vercel.json` parse as valid JSON.
- Form validates name, email format, age 13–120, and education against the exact allowed options on both client and server.
- Education options match exactly: Primary School, Secondary School, Bachelor's, Postgraduate or above.
- Modal preserves the selected plan (monthly/yearly) via a hidden field.
- CSS uses brand tokens only; no off-palette colours.
- `prefers-reduced-motion` honoured — reveals and smooth scroll disabled.
- All anchor links resolve to in-page sections.

The static site has no build system. The serverless functions require `npm install` of the listed dependencies, which Vercel handles automatically on deploy.
