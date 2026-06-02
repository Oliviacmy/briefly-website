// Vercel serverless function: create a Stripe Checkout subscription session.
//
// Required environment variables:
//   STRIPE_SECRET_KEY        - Stripe secret key (sk_live_... / sk_test_...)
//   STRIPE_MONTHLY_PRICE_ID  - Stripe Price ID for the monthly plan (price_...)
//   STRIPE_YEARLY_PRICE_ID   - Stripe Price ID for the yearly plan (price_...)
// Optional:
//   CHECKOUT_SUCCESS_URL     - overrides the default success redirect
//   CHECKOUT_CANCEL_URL      - overrides the default cancel redirect

const Stripe = require("stripe");

const EDUCATION_OPTIONS = [
  "Primary School",
  "Secondary School",
  "Bachelor's",
  "Postgraduate or above"
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function baseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceIds = {
    monthly: process.env.STRIPE_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_YEARLY_PRICE_ID
  };

  if (!secretKey || !priceIds.monthly || !priceIds.yearly) {
    console.error("Missing Stripe environment configuration.");
    return res.status(500).json({ error: "Checkout is not configured. Please try again later." });
  }

  // Body may arrive parsed (Vercel) or as a raw string.
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const plan = body.plan === "yearly" ? "yearly" : "monthly";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const ageRaw = body.age;
  const age = Number(ageRaw);
  const education = typeof body.education === "string" ? body.education : "";

  if (!name) {
    return res.status(400).json({ error: "Name is required." });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "A valid email address is required." });
  }
  if (!Number.isFinite(age) || age < 13 || age > 120) {
    return res.status(400).json({ error: "Age must be between 13 and 120." });
  }
  if (EDUCATION_OPTIONS.indexOf(education) === -1) {
    return res.status(400).json({ error: "Please choose a valid education level." });
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

  const metadata = {
    name,
    email,
    age: String(Math.trunc(age)),
    education,
    plan
  };

  const origin = baseUrl(req);
  const successUrl =
    process.env.CHECKOUT_SUCCESS_URL ||
    `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl =
    process.env.CHECKOUT_CANCEL_URL || `${origin}/?checkout=cancelled#subscribe`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceIds[plan], quantity: 1 }],
      customer_email: email,
      client_reference_id: email,
      allow_promotion_codes: true,
      metadata,
      subscription_data: { metadata },
      success_url: successUrl,
      cancel_url: cancelUrl
    });

    return res.status(200).json({ url: session.url, id: session.id });
  } catch (err) {
    console.error("Stripe session creation failed:", err && err.message ? err.message : err);
    return res.status(502).json({ error: "We couldn’t start checkout. Please try again." });
  }
};
