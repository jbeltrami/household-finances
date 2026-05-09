// Twilio WhatsApp sender. Hits the REST Messages endpoint directly
// rather than pulling in the `twilio` SDK — we send a single message
// shape (a free-form text body to a sandbox-joined recipient) and
// don't need the SDK's broader surface. Env vars are validated at
// call time so a missing setting surfaces where it's actionable.
//
// Sandbox note: Twilio's WhatsApp Sandbox accepts free-form text to
// any number that has sent `join <code>` to the sandbox From-number.
// In production (a real WhatsApp Business sender), free-form text is
// only allowed inside a 24-hour conversation window — outside of
// that, you must send a Meta-approved Content Template SID. We'll
// only need that change if/when we graduate from sandbox.

type TwilioCreds = {
  accountSid: string;
  authToken: string;
  from: string;
};

function getCreds(): TwilioCreds {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    throw new Error(
      "Twilio not configured: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM must be set"
    );
  }

  // Twilio expects the From/To values to be prefixed with "whatsapp:"
  // for WhatsApp messages. Be forgiving if the env var omits it.
  const normalizedFrom = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;

  return { accountSid, authToken, from: normalizedFrom };
}

// Send a single WhatsApp text message. `toE164` is the recipient's
// phone in E.164 form (e.g. "+5511987654321") — the "whatsapp:"
// prefix is added here. Throws on any non-2xx response from Twilio
// so the caller can decide what to do (log, retry, etc.).
export async function sendWhatsAppText(
  toE164: string,
  body: string
): Promise<{ sid: string }> {
  const { accountSid, authToken, from } = getCreds();

  const params = new URLSearchParams();
  params.set("From", from);
  params.set("To", `whatsapp:${toE164}`);
  params.set("Body", body);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Twilio send failed (${res.status}): ${errBody}`);
  }

  const json = (await res.json()) as { sid: string };
  return { sid: json.sid };
}
