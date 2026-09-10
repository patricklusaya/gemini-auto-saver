const DEFAULT_FROM = "Gemini Auto Image Saver <onboarding@resend.dev>";

async function sendLicenseEmail({ to, licenseKey, orderId, source }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set.");

  const from = process.env.LICENSE_FROM_EMAIL || DEFAULT_FROM;
  const site = process.env.SITE_URL || "https://gemini-auto-saver.vercel.app";
  const paidVia = source ? ` Paid via ${source}.` : "";

  const text = [
    "Thanks for buying Gemini Auto Image Saver Pro.",
    "",
    "Your license key:",
    "",
    licenseKey,
    "",
    "How to activate",
    "1. Open the Gemini Auto Image Saver popup in Chrome or Edge.",
    "2. Go to Settings.",
    "3. Paste the key and click Activate license.",
    "",
    "Pro unlocks unlimited Batch prompts. Auto Save stays free.",
    `Order ${orderId}.${paidVia} Keep this email — the key is not stored by the payment provider.`,
    "",
    `Website: ${site}`,
    "",
    "If you did not make this purchase, you can ignore this email."
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your Gemini Auto Image Saver Pro license",
      text
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend failed (${response.status}): ${detail.slice(0, 400)}`);
  }
}

module.exports = { sendLicenseEmail };
