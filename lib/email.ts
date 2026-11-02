/**
 * Sends transactional email through Resend's HTTP API (https://resend.com).
 * Needs RESEND_API_KEY and EMAIL_FROM. Without them, development logs the message;
 * production throws so the failure is visible.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email is not configured (RESEND_API_KEY / EMAIL_FROM)");
    }
    console.log(`[Storaa email -> ${to}] ${subject}\n${text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!res.ok) throw new Error(`Email send failed (${res.status}): ${await res.text()}`);
}
