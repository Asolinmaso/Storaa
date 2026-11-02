import { getSession } from "@/lib/auth";

/** True only for a signed-in admin. (Middleware also gates /api/admin; this is defence in depth.) */
export async function isAdmin(_req?: Request): Promise<boolean> {
  const session = await getSession();
  return session?.role === "admin";
}
