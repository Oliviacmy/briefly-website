# Briefly — Landing site

A polished, single-page static landing site for **Briefly**, the daily Hong Kong and global news briefing in professional English with full Traditional Chinese translation.

## Project structure

```
briefly-website/
├── index.html            # All page content & sections
├── styles.css            # Editorial design system + responsive styles
├── script.js             # Stripe checkout links + reveal animations
├── assets/
│   └── briefly-logo.png  # Transparent wordmark
└── README.md             # This file
```

No build step. Open `index.html` directly, or serve the folder with any static server.

```bash
# Quick local preview
cd briefly-website
python3 -m http.server 8000
# → http://localhost:8000
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

## Connecting Stripe checkout

The page is set up for two subscription options:

- **Monthly**: HKD 29/month
- **Yearly**: HKD 252/year, equivalent to HKD 21/month

The checkout buttons are wired in `script.js` through `handleCheckout()`.

Current Stripe payment links:

```js
const STRIPE_CHECKOUT_URLS = {
  monthly: "https://buy.stripe.com/dRmaEWbtlgyv9wY7QV2Fa02",
  yearly: "https://buy.stripe.com/00w5kC2WP6XV8sUc7b2Fa03"
};
```

Buttons use `data-plan="monthly"` or `data-plan="yearly"`, so each button routes to the correct Stripe checkout URL.

## Editorial schedule

Briefly is positioned as a **7:00am HKT** morning briefing.

- News is locked as of **6:00am HKT**.
- AI assists with source scanning, story organisation, first-draft summaries and Traditional Chinese support.
- From **6:00am to 7:00am**, professional editors manually check story selection, source quality, wording, translation quality, “Why it matters” notes and Useful English.
- The newsletter is released at **7:00am HKT**.

## Connecting paid subscribers to Brevo

Recommended production flow:

1. Stripe Checkout collects payment and customer email.
2. Stripe webhook confirms successful subscription.
3. Your backend adds the subscriber to the correct Brevo list.
4. Brevo sends the daily newsletter.

Do not expose a Stripe secret key or Brevo API key in browser JavaScript. Keep payment and contact-sync logic server-side.

## QA / build checks run

- HTML structure validated by visual inspection — single `<main>`, no nested `<a>` anchors, all headings ordered, skip link, ARIA labels on key landmarks.
- CSS uses brand tokens only; no off-palette colours.
- Tested at desktop (1280 px) and mobile (375 px) widths via Playwright screenshots.
- Checkout buttons route to the correct Stripe URL once the pending URLs are replaced.
- `prefers-reduced-motion` honoured — reveals and smooth scroll disabled.
- All anchor links resolve to in-page sections.

There is no build system. The site is plain HTML/CSS/JS and is production-ready as-is.

## Deployment

The main agent will deploy via `deploy_website()` with `project_path=/home/user/workspace/briefly-website`. Entry point is `index.html`.
