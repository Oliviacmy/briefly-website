// Vercel serverless function: Stripe webhook handler.
//
// Handles `checkout.session.completed`:
//   1. Adds/updates the subscriber in a Brevo contact list.
//   2. Sends a branded confirmation email via Brevo transactional email.
//
// Required environment variables:
//   STRIPE_SECRET_KEY       - Stripe secret key
//   STRIPE_WEBHOOK_SECRET   - Signing secret for this webhook endpoint (whsec_...)
//   BREVO_API_KEY           - Brevo (Sendinblue) API v3 key
//   BREVO_LIST_ID           - Numeric Brevo list ID to add subscribers to
//   BREVO_SENDER_EMAIL      - Verified Brevo sender email
//   BREVO_SENDER_NAME       - Sender display name
//
// The raw request body is required for Stripe signature verification,
// so Vercel's automatic body parsing is disabled below.

const Stripe = require("stripe");
const getRawBody = require("raw-body");

module.exports.config = {
  api: { bodyParser: false }
};

const BREVO_BASE = "https://api.brevo.com/v3";

// Brevo rejects an entire contact upsert with HTTP 400 if it references a
// custom attribute that has not been defined on the account. We declare the
// attributes we use here so we can create them on the fly (idempotently) and
// know which keys are safe to send.
const BREVO_ATTRIBUTES = [
  { name: "AGE", type: "float" },
  { name: "EDUCATION", type: "text" },
  { name: "PLAN", type: "text" }
];

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function confirmationEmailHtml({ name, plan, senderEmail }) {
  const safeName = escapeHtml((name || "").trim().split(/\s+/)[0] || "there");
  const planLabel =
    plan === "yearly"
      ? "Yearly plan · HKD 252/year"
      : plan === "monthly"
      ? "Monthly plan · HKD 29/month"
      : "";
  const senderLine = senderEmail
    ? `Add <strong>${escapeHtml(senderEmail)}</strong> to your contacts`
    : "Add our sender address to your contacts";
  const planRow = planLabel
    ? `<tr>
                    <td style="padding:14px 20px;font-size:14px;line-height:1.5;color:#684715;border-bottom:1px solid #F0D6AE;">
                      <span style="color:#B89152;">Your plan</span><br />
                      <strong style="color:#2A1B0A;">${escapeHtml(planLabel)}</strong>
                    </td>
                  </tr>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Welcome to Briefly</title>
    <style>
      /* Preview text — hidden in the body, shown in inbox preview lines. */
      .preview { display:none !important; visibility:hidden; opacity:0; height:0; width:0; overflow:hidden; mso-hide:all; }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#FFF7E9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2A1B0A;">
    <div class="preview">You're subscribed to Briefly. Your first morning briefing arrives at 7:00am HKT on the next weekday.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7E9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFBF1;border:1px solid #F0D6AE;border-radius:22px;overflow:hidden;">
            <tr>
              <td style="background:#5D17EA;padding:28px 32px;">
                <span style="display:inline-block;color:#FFFFFF;font-size:22px;font-weight:800;letter-spacing:-0.01em;">Briefly</span>
                <span style="display:block;margin-top:4px;color:#D9C2FF;font-size:13px;">Daily Hong Kong &amp; global news, in professional English</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 32px 8px;">
                <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#2A1B0A;">You're in, ${safeName}.</h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#684715;">
                  Your subscription to <strong>Briefly</strong> is confirmed. From now on you'll get one calm, professional briefing every weekday morning — Hong Kong and global news in clear English, with full Traditional Chinese support.
                </p>
              </td>
            </tr>
            ${planRow ? `<tr><td style="padding:0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FEE8C4;border-radius:14px;">${planRow}</table></td></tr>` : ""}
            <tr>
              <td style="padding:24px 32px 8px;">
                <h2 style="margin:0 0 12px;font-size:15px;font-weight:800;color:#B89152;text-transform:uppercase;letter-spacing:0.04em;">What happens next</h2>
                <p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#684715;">
                  Your first edition arrives at <strong>7:00am HKT</strong> on the next weekday. Each briefing takes about <strong>10–15 minutes</strong> to read.
                </p>
                <p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#684715;">
                  News is locked as of 6:00am HKT. Between 6:00 and 7:00am, professional editors review every story selection, source, translation and "Why it matters" note before the briefing is sent — AI assists with drafting, but a human signs off.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 0;background:#FEE8C4;border-radius:14px;">
                  <tr>
                    <td style="padding:16px 20px;font-size:15px;line-height:1.6;color:#684715;">
                      📬 ${senderLine} so Briefly always lands in your inbox, not your spam folder.
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 0;font-size:15px;line-height:1.6;color:#684715;">
                  Questions or feedback? Just reply to this email — we read every message.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #F0D6AE;font-size:13px;color:#B89152;">
                © 2026 Briefly. Made in Hong Kong.<br />
                Professional Hong Kong and global news, with Traditional Chinese translation.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Idempotently ensure each custom attribute exists. Brevo returns 201 on
// create and 400 ("attribute already exist") if it is already there — both are
// fine. We never throw here: if attribute creation is not permitted, we fall
// back to upserting the contact without those attributes so the subscriber
// still lands in the list.
async function brevoEnsureAttributes(apiKey) {
  const available = new Set();
  for (const attr of BREVO_ATTRIBUTES) {
    try {
      const res = await fetch(
        `${BREVO_BASE}/contacts/attributes/normal/${encodeURIComponent(attr.name)}`,
        {
          method: "POST",
          headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ type: attr.type })
        }
      );
      if (res.status === 201 || res.status === 204) {
        available.add(attr.name);
      } else if (res.status === 400) {
        // Already exists (or invalid) — assume present and usable.
        available.add(attr.name);
      } else {
        const text = await res.text().catch(() => "");
        console.error(`Brevo attribute ensure for ${attr.name} returned ${res.status}: ${text}`);
      }
    } catch (err) {
      console.error(`Brevo attribute ensure for ${attr.name} threw:`, err && err.message ? err.message : err);
    }
  }
  return available;
}

async function brevoPostContact({ apiKey, listId, email, attributes }) {
  return fetch(`${BREVO_BASE}/contacts`, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      email,
      attributes,
      listIds: listId ? [Number(listId)] : undefined,
      updateEnabled: true
    })
  });
}

// Upsert the contact and add it to the list. To guarantee the subscriber lands
// in the list even when an attribute is misconfigured, we try with attributes
// first and, on a 400, retry with only the list membership (no attributes).
async function brevoUpsertContact({ apiKey, listId, email, name, age, education, plan, allowedAttributes }) {
  const attributes = {};
  if (name) attributes.FIRSTNAME = name;
  const ageNum = Number(age);
  if (Number.isFinite(ageNum) && ageNum > 0 && (!allowedAttributes || allowedAttributes.has("AGE"))) {
    attributes.AGE = ageNum;
  }
  if (education && (!allowedAttributes || allowedAttributes.has("EDUCATION"))) {
    attributes.EDUCATION = education;
  }
  if (plan && (!allowedAttributes || allowedAttributes.has("PLAN"))) {
    attributes.PLAN = plan;
  }

  let res = await brevoPostContact({ apiKey, listId, email, attributes });

  // 201 created, 204 updated.
  if (res.status === 201 || res.status === 204) return;

  // On a 400 (often a rejected attribute), retry with just FIRSTNAME so the
  // contact still gets created and added to the list.
  if (res.status === 400) {
    const firstText = await res.text().catch(() => "");
    console.error(`Brevo upsert with attributes failed (400): ${firstText}. Retrying without optional attributes.`);
    const minimal = {};
    if (name) minimal.FIRSTNAME = name;
    res = await brevoPostContact({ apiKey, listId, email, attributes: minimal });
    if (res.status === 201 || res.status === 204) return;
  }

  const text = await res.text().catch(() => "");
  throw new Error(`Brevo contact upsert failed (${res.status}): ${text}`);
}

async function brevoSendConfirmation({ apiKey, senderEmail, senderName, email, name, plan }) {
  const res = await fetch(`${BREVO_BASE}/smtp/email`, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName || "Briefly" },
      to: [{ email, name: name || undefined }],
      replyTo: { email: senderEmail, name: senderName || "Briefly" },
      subject: "Welcome to Briefly — your morning briefing starts soon",
      htmlContent: confirmationEmailHtml({ name, plan, senderEmail })
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Brevo email send failed (${res.status}): ${text}`);
  }
}

// Pull subscriber fields from the session, preferring the metadata we set at
// checkout creation and falling back to Stripe's own customer_details.
function extractSubscriber(session) {
  const metadata = session.metadata || {};
  const details = session.customer_details || {};
  const email = (metadata.email || details.email || session.customer_email || "").trim();
  const name = (metadata.name || details.name || "").trim();
  const age = metadata.age || "";
  const education = metadata.education || "";
  const plan = metadata.plan || "";
  return { email, name, age, education, plan };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    console.error("Missing Stripe webhook configuration (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET).");
    return res.status(500).json({ error: "Webhook not configured." });
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

  let event;
  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err && err.message ? err.message : err);
    return res.status(400).json({ error: "Invalid signature." });
  }

  if (event.type !== "checkout.session.completed") {
    return res.status(200).json({ received: true, ignored: event.type });
  }

  const session = event.data.object || {};
  const { email, name, age, education, plan } = extractSubscriber(session);

  // Mask the email in logs (a***@domain) so we can trace events without
  // writing full PII to the log stream.
  const maskedEmail = email ? email.replace(/^(.).*(@.*)$/, "$1***$2") : "(none)";
  console.log(`checkout.session.completed received: email=${maskedEmail} plan=${plan || "(none)"}`);

  if (!email) {
    console.error("checkout.session.completed missing email; cannot sync subscriber.");
    return res.status(200).json({ received: true, warning: "no email" });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("BREVO_API_KEY not set; skipping subscriber sync and confirmation email.");
    return res.status(200).json({ received: true, warning: "brevo not configured" });
  }

  const listId = process.env.BREVO_LIST_ID;
  if (!listId) {
    console.error("BREVO_LIST_ID not set; contact will be created but not added to any list.");
  }

  const result = { received: true, contactSynced: false, emailSent: false };

  try {
    const allowedAttributes = await brevoEnsureAttributes(apiKey);
    await brevoUpsertContact({
      apiKey,
      listId,
      email,
      name,
      age,
      education,
      plan,
      allowedAttributes
    });
    result.contactSynced = true;
    console.log(`Brevo contact upserted for ${maskedEmail}` + (listId ? ` and added to list ${listId}.` : "."));
  } catch (err) {
    console.error("Brevo contact sync failed:", err && err.message ? err.message : err);
  }

  try {
    if (process.env.BREVO_SENDER_EMAIL) {
      await brevoSendConfirmation({
        apiKey,
        senderEmail: process.env.BREVO_SENDER_EMAIL,
        senderName: process.env.BREVO_SENDER_NAME,
        email,
        name,
        plan
      });
      result.emailSent = true;
      console.log(`Confirmation email sent to ${maskedEmail}.`);
    } else {
      console.error("BREVO_SENDER_EMAIL not set; skipping confirmation email.");
    }
  } catch (err) {
    console.error("Brevo confirmation email failed:", err && err.message ? err.message : err);
  }

  // Always 200 once the signature is valid, so Stripe does not retry
  // indefinitely for downstream (Brevo) hiccups we've already logged.
  return res.status(200).json(result);
};
