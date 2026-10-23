// Creates (or promotes) an admin account. Run with:
//   npm run create-admin -- admin@example.com 'a-strong-password'
import { readFileSync } from "fs";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.error("Usage: npm run create-admin -- <email> <password (min 8 chars)>");
  process.exit(1);
}

const MONGODB_URI =
  process.env.MONGODB_URI ??
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .match(/^MONGODB_URI=(.+)$/m)?.[1]
    ?.trim();
if (!MONGODB_URI) throw new Error("MONGODB_URI not found in .env.local");

await mongoose.connect(MONGODB_URI);
const users = mongoose.connection.collection("users");
const normalized = email.trim().toLowerCase();
const passwordHash = await bcrypt.hash(password, 12);

const existing = await users.findOne({ email: normalized });
if (existing) {
  await users.updateOne(
    { _id: existing._id },
    { $set: { role: "admin", passwordHash, isBlocked: false, updatedAt: new Date() } }
  );
  console.log(`Promoted existing user ${normalized} to admin (password reset).`);
} else {
  const now = new Date();
  await users.insertOne({
    email: normalized, passwordHash, role: "admin", name: "Admin", phone: "",
    location: "Chennai, Tamilnadu", addresses: [],
    prefs: { holdUpdates: true, offers: true, newStores: true },
    isBlocked: false, resetCodeHash: null, resetCodeExpiry: null,
    createdAt: now, updatedAt: now,
  });
  console.log(`Created admin ${normalized}.`);
}
await mongoose.disconnect();
