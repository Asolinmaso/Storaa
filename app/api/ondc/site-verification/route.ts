import { NextResponse } from "next/server";
import { requireConfig } from "@/lib/ondc/config";
import { signBase64 } from "@/lib/ondc/crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Served at /ondc-site-verification.html (see next.config.mjs rewrites). */
export async function GET() {
  try {
    const cfg = requireConfig(["requestId", "signingPrivateKey"]);
    const signed = signBase64(cfg.requestId, cfg.signingPrivateKey);
    const html = `<html>
  <head>
    <meta name='ondc-site-verification' content='${signed}' />
  </head>
  <body>
    ONDC Site Verification Page
  </body>
</html>`;
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
