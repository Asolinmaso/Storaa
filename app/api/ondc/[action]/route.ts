import { NextResponse } from "next/server";
import { runInBackground } from "@/lib/background";
import { ondcConfig, OndcConfigError, requireConfig } from "@/lib/ondc/config";
import { decryptChallenge } from "@/lib/ondc/crypto";
import { contextProblem, processAndCallback } from "@/lib/ondc/handlers";
import {
  ERR,
  INBOUND_ACTIONS,
  type BecknError,
  type BecknRequest,
  type InboundAction,
} from "@/lib/ondc/types";
import { verifyInbound } from "@/lib/ondc/verify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Callbacks to the buyer app run after the ACK; give them room to finish.
export const maxDuration = 60;

// Valid ONDC retail actions this seller app does not implement (yet): answer clearly rather than 404.
const UNSUPPORTED_ACTIONS = ["issue", "issue_status", "receiver_recon"];

const ack = () => ({ message: { ack: { status: "ACK" } } });

function nack(error: BecknError, status: number) {
  return NextResponse.json(
    { message: { ack: { status: "NACK" } }, error },
    { status }
  );
}

/** Registry challenge during /subscribe: decrypt and echo it back as `answer`. */
async function onSubscribe(req: Request) {
  try {
    const cfg = requireConfig(["encPrivateKey", "registryEncPublicKey"]);
    const { challenge } = await req.json();
    if (typeof challenge !== "string") {
      return NextResponse.json({ error: "challenge is required" }, { status: 400 });
    }
    const answer = decryptChallenge(challenge, cfg.encPrivateKey, cfg.registryEncPublicKey);
    return NextResponse.json({ answer });
  } catch (err) {
    console.error("[ONDC] on_subscribe failed:", err);
    return NextResponse.json({ error: "Challenge could not be decrypted" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { action: string } }
) {
  const cfg = ondcConfig();
  if (!cfg.enabled) {
    return NextResponse.json({ error: "ONDC is not enabled" }, { status: 404 });
  }
  if (params.action === "on_subscribe") return onSubscribe(req);

  const action = params.action as InboundAction;
  if (UNSUPPORTED_ACTIONS.includes(params.action)) {
    return nack(
      { type: "POLICY-ERROR", code: "60001", message: `${params.action} is not supported by this seller app yet` },
      501
    );
  }
  if (!INBOUND_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    requireConfig(["subscriberId", "subscriberUrl", "uniqueKeyId", "signingPrivateKey"]);
  } catch (err) {
    if (err instanceof OndcConfigError) console.error("[ONDC]", err.message);
    return NextResponse.json({ error: "ONDC is not configured" }, { status: 503 });
  }

  // The signature covers the exact bytes received, so verify before parsing.
  const raw = await req.text();
  let body: BecknRequest;
  try {
    body = JSON.parse(raw);
  } catch {
    return nack(ERR.badRequest("Body is not valid JSON"), 400);
  }

  const problem = contextProblem(body?.context, action);
  if (problem) return nack(ERR.badContext(problem), 400);

  const authorised = await verifyInbound({
    header: req.headers.get("authorization"),
    body: raw,
    expectedSubscriberId: body.context.bap_id,
    domain: body.context.domain,
  });
  if (!authorised) return nack(ERR.invalidSignature, 401);

  // Discovery arrives via the ONDC gateway, which signs it too.
  const gatewayHeader = req.headers.get("x-gateway-authorization");
  if (action === "search" && gatewayHeader) {
    const gatewayOk = await verifyInbound({
      header: gatewayHeader,
      body: raw,
      domain: body.context.domain,
    });
    if (!gatewayOk) return nack(ERR.invalidSignature, 401);
  }

  // ACK now; the real answer is a signed POST to the buyer app's on_{action}.
  runInBackground(processAndCallback(action, body));
  return NextResponse.json(ack());
}
