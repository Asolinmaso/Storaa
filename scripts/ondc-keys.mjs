// Generates the ONDC key pairs and IDs as .env lines.
//   npm run ondc:keys            print to the terminal
//   npm run ondc:keys -- --write append to .env.local (refuses if keys already exist there)
import crypto from "node:crypto";
import fs from "node:fs";

const b64 = (b) => b.toString("base64");
const tail = (der, n) => der.subarray(der.length - n);

const ed = crypto.generateKeyPairSync("ed25519");
const edPriv = tail(ed.privateKey.export({ format: "der", type: "pkcs8" }), 32);
const edPub = tail(ed.publicKey.export({ format: "der", type: "spki" }), 32);
const x = crypto.generateKeyPairSync("x25519");
const xPriv = tail(x.privateKey.export({ format: "der", type: "pkcs8" }), 32);
const xPubDer = x.publicKey.export({ format: "der", type: "spki" });

const lines = `
# --- ONDC (generated ${new Date().toISOString().slice(0, 10)}) ---
ONDC_ENABLED=false
# Replace with the domain Stora will be deployed on
ONDC_SUBSCRIBER_ID=stora.example.com
ONDC_SUBSCRIBER_URL=https://stora.example.com/api/ondc
ONDC_PUBLIC_BASE_URL=https://stora.example.com
ONDC_UNIQUE_KEY_ID=${crypto.randomUUID()}
ONDC_REQUEST_ID=${crypto.randomUUID()}
# Signing pair (Ed25519): public key goes to ONDC in /subscribe
ONDC_SIGNING_PRIVATE_KEY=${b64(Buffer.concat([edPriv, edPub]))}
ONDC_SIGNING_PUBLIC_KEY=${b64(edPub)}
# Encryption pair (X25519): public key goes to ONDC in /subscribe
ONDC_ENCRYPTION_PRIVATE_KEY=${b64(xPriv)}
ONDC_ENCRYPTION_PUBLIC_KEY=${b64(xPubDer)}
# Pre-prod registry. Check the key against ONDC's onboarding docs before use.
ONDC_REGISTRY_URL=https://preprod.registry.ondc.org
ONDC_REGISTRY_ENC_PUBLIC_KEY=MCowBQYDK2VuAyEARa/WcMCzNQp4DWjvTI4DK7vHL6EdaHqN4GjFIu9wxxM=
ONDC_CITY_CODE=*
ONDC_SELLER_APP_NAME=Stora
ONDC_DEFAULT_GPS=
ONDC_SUPPORT_PHONE=
ONDC_SUPPORT_EMAIL=
ONDC_SUPPORT_URI=
`;

if (process.argv.includes("--write")) {
  const file = ".env.local";
  const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (existing.includes("ONDC_SIGNING_PRIVATE_KEY")) {
    console.error(`${file} already has ONDC keys; not overwriting.`);
    process.exit(1);
  }
  fs.appendFileSync(file, (existing && !existing.endsWith("\n") ? "\n" : "") + lines);
  console.log(`Appended ONDC settings to ${file} (ONDC_ENABLED=false). Replace the example.com values with your domain.`);
} else {
  console.log(lines);
}
