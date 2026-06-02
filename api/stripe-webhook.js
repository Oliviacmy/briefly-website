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

function confirmationEmailHtml(name) {
  const safeName = (name || "there").replace(/[<>&]/g, "");
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#FFF7E9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2A1B0A;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7E9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFBF1;border:1px solid #F0D6AE;border-radius:22px;overflow:hidden;">
            <tr>
              <td style="background:#5D17EA;padding:28px 32px;">
                <span style="display:inline-block;color:#FFFFFF;font-size:22px;font-weight:800;letter-spacing:-0.01em;">Briefly</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px;font-size:24px;font-weight:800;color:#2A1B0A;">You're in, ${safeName}.</h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#684715;">
                  Thank you for subscribing to <strong>Briefly</strong> — your daily Hong Kong and global news briefing in professional English, with full Traditional Chinese support.
                </p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#684715;">
                  Your first edition arrives at <strong>7:00am HKT</strong> on the next weekday. Each briefing takes 10–15 minutes to read and is checked by professional editors before it's sent.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#FEE8C4;border-radius:14px;">
                  <tr>
                    <td style="padding:16px 20px;font-size:15px;line-height:1.6;color:#684715;">
                      Add <strong>your sender address</strong> to your contacts so Briefly always lands in your inbox, not your spam folder.
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#684715;">
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

async function brevoUpsertContact({ apiKey, listId, email, name, age, education, plan }) {
  const attributes = {};
  if (name) attributes.FIRSTNAME = name;
  if (age) attributes.AGE = Number(age);
  if (education) attributes.EDUCATION = education;
  if (plan) attributes.PLAN = plan;

  const res = await fetch(`${BREVO_BASE}/contacts`, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      email,
      attributes,
      listIds: listId ? [Number(listId)] : undefined,
      updateEnabled: true
    })
  });

  // 201 created, 204 updated. Anything else is an error worth logging.
  if (res.status !== 201 && res.status !== 204) {
    const text = await res.text().catch(() => "");
    throw new Error(`Brevo contact upsert failed (${res.status}): ${text}`);
  }
}

async function brevoSendConfirmation({ apiKey, senderEmail, senderName, email, name }) {
  const res = await fetch(`${BREVO_BASE}/smtp/email`, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { email: senderEmail, name: senderName || "Briefly" },
      to: [{ email, name: name || undefined }],
      subject: "Welcome to Briefly — your morning briefing starts tomorrow",
      htmlContent: confirmationEmailHtml(name)
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Brevo email send failed (${res.status}): ${text}`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    console.error("Missing Stripe webhook configuration.");
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
  const metadata = session.metadata || {};
  const email = metadata.email || session.customer_details?.email || session.customer_email;
  const name = metadata.name || session.customer_details?.name || "";

  if (!email) {
    console.error("checkout.session.completed missing email; cannot sync subscriber.");
    return res.status(200).json({ received: true, warning: "no email" });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("BREVO_API_KEY not set; skipping subscriber sync.");
    return res.status(200).json({ received: true, warning: "brevo not configured" });
  }

  try {
    await brevoUpsertContact({
      apiKey,
      listId: process.env.BREVO_LIST_ID,
      email,
      name,
      age: metadata.age,
      education: metadata.education,
      plan: metadata.plan
    });
  } catch (err) {
    console.error(err.message);
  }

  try {
    if (process.env.BREVO_SENDER_EMAIL) {
      await brevoSendConfirmation({
        apiKey,
        senderEmail: process.env.BREVO_SENDER_EMAIL,
        senderName: process.env.BREVO_SENDER_NAME,
        email,
        name
      });
    } else {
      console.error("BREVO_SENDER_EMAIL not set; skipping confirmation email.");
    }
  } catch (err) {
    console.error(err.message);
  }

  // Always 200 once the signature is valid, so Stripe does not retry
  // indefinitely for downstream (Brevo) hiccups we've already logged.
  return res.status(200).json({ received: true });
};
