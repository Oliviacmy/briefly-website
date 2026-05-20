# Briefly Webflow Transfer Guide

This guide explains how to rebuild the current Briefly landing page inside Webflow while preserving the same aesthetic, copy, pricing, Stripe links and editorial positioning.

## Important limitation

The connected Webflow API can list sites, publish sites, and manage CMS/ecommerce data. It does not provide Designer-level controls for importing custom HTML/CSS into a visual Webflow page or creating static layout sections. Because of that, the current static website cannot be automatically “pushed” into the Webflow Designer through the connector.

Use this package as the source of truth for manually rebuilding the site in Webflow.

## Existing Webflow site

- Site name: Briefly
- Site ID: `6a0b2d670fc2c2a1ac9c301f`
- Short name: `briefly-f38cb9`
- Time zone: Asia/Hong_Kong

## Files in this package

- `index.html`: Full current landing page copy and structure.
- `styles.css`: Complete visual system, colours, spacing, responsive styles.
- `script.js`: Stripe checkout button logic.
- `assets/briefly-logo.png`: Transparent Briefly logo.
- `README.md`: Editing notes for the static version.
- `WEBFLOW_TRANSFER_GUIDE.md`: This file.

## Brand tokens

Use these in Webflow as global swatches or variables:

| Role | Hex |
| --- | --- |
| Purple | `#5D17EA` |
| Purple deep | `#3B0BA8` |
| Cream | `#FEE8C4` |
| Off-white | `#FFF7E9` |
| Sand | `#B89152` |
| Brown | `#684715` |
| Deep brown | `#2A1B0A` |
| Border cream | `#F0D6AE` |
| White | `#FFFFFF` |

## Webflow build structure

Create one landing page with these sections in order:

1. **Navigation**
   - Left: Briefly transparent logo.
   - Right links: What you get, Today’s sample, Why Briefly, Who it’s for.
   - CTA: “Subscribe from HKD 21/mo”.

2. **Hero**
   - Eyebrow: “The 7am Hong Kong news briefing”.
   - Headline: “Stay informed in professional English, with Hong Kong context.”
   - Body copy: Use the exact hero paragraph from `index.html`.
   - CTA buttons:
     - Monthly · HKD 29
     - Yearly · HKD 252
   - Supporting line: “Less than one coffee a month on the yearly plan · Secure checkout by Stripe · Cancel anytime · Delivered every weekday at 7:00am HKT”.
   - Meta row:
     - 7:00am, HKT every weekday
     - 10–15 min, Read time
     - 10–16, Stories curated

3. **Sources strip**
   - Cross-checked daily across major Hong Kong and global outlets.
   - Include source pills from the current site.

4. **What you get**
   - Six feature cards from `index.html`.

5. **Editorial process**
   - Section title: “Powered by AI, quality checked manually by professional editors.”
   - Three cards:
     - News as of 6:00am
     - AI-assisted preparation
     - 6:00am–7:00am editor check

6. **Today’s sample**
   - Keep the current sample section only.
   - Use the existing Hong Kong story and global story cards from `index.html`.

7. **Why Briefly is different**
   - Purple background section.
   - Six cards from the current site.

8. **Who it’s for**
   - Audience cards from the current site.

9. **Beta / trust section**
   - Keep the current quotes and CTA language.

10. **Final subscribe / pricing**
   - Two cards:
     - Monthly: HKD 29/month.
     - Yearly: HKD 252/year, equivalent to HKD 21/month.
   - Include “less than one coffee a month” value message.

11. **Footer**
   - Logo, short positioning line, nav links.

## Stripe links

Use these links for buttons in Webflow:

- Monthly checkout: `https://buy.stripe.com/dRmaEWbtlgyv9wY7QV2Fa02`
- Yearly checkout: `https://buy.stripe.com/00w5kC2WP6XV8sUc7b2Fa03`

Button mapping:

- Monthly buttons should open the monthly checkout link.
- Yearly buttons should open the yearly checkout link.

## Manual editing recommendation

In Webflow, rebuild this as native Webflow sections rather than pasting the entire HTML into an Embed element. Native sections will be easier for you to edit manually later.

Recommended approach:

1. Create global colours using the brand tokens above.
2. Upload `assets/briefly-logo.png`.
3. Build the nav and hero first.
4. Create reusable card classes for feature cards, process cards, sample cards and pricing cards.
5. Copy text from `index.html` section by section.
6. Set Stripe buttons as regular Webflow links.
7. Publish the Webflow site after checking desktop and mobile.

## If you want the fastest Webflow version

Use a single Webflow page with custom code embeds:

1. Add custom CSS from `styles.css` in page settings or site-wide custom code.
2. Add the body content from `index.html` into an Embed element.
3. Add `script.js` before the closing body tag.

This is faster, but not recommended if you want to edit the page visually in Webflow later. Native Webflow sections are better for manual editing.
