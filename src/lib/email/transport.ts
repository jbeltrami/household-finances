import nodemailer, { type Transporter } from "nodemailer";

let cachedTransport: Transporter | null = null;

// Lazy-initialized SMTP transport. Constructs on first call so a
// missing env var surfaces at send time (where it's actionable) rather
// than at module load. Subsequent calls reuse the same transporter so
// the SMTP connection pool is preserved across sends.
export function getTransport(): Transporter {
  if (cachedTransport) return cachedTransport;

  const host = process.env.SMTP_HOST;
  const portStr = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !portStr || !user || !pass) {
    throw new Error(
      "SMTP not configured: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD must be set"
    );
  }

  const port = Number(portStr);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid SMTP_PORT: ${portStr}`);
  }

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    // 465 = implicit TLS; everything else (587, 25) starts plaintext
    // and upgrades via STARTTLS, which nodemailer handles automatically
    // when secure=false.
    secure: port === 465,
    auth: { user, pass },
  });

  return cachedTransport;
}

// Construct the "From" header in `Name <email>` form. Falls back to
// the bare address if SMTP_FROM_NAME is unset.
export function getFromAddress(): string {
  const user = process.env.SMTP_USER;
  if (!user) {
    throw new Error("SMTP_USER not configured");
  }
  const name = process.env.SMTP_FROM_NAME;
  return name ? `${name} <${user}>` : user;
}
