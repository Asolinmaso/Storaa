import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

const PROTECTED_PATHS = [
  "/dashboard",
  "/select-role",
  "/home",
  "/categories",
  "/stores",
  "/products",
  "/holds",
  "/profile",
  "/vendor",
];
const AUTH_PATHS = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (isProtected && !session) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/select-role/:path*",
    "/home/:path*",
    "/categories/:path*",
    "/stores/:path*",
    "/products/:path*",
    "/holds/:path*",
    "/profile/:path*",
    "/vendor/:path*",
    "/login",
    "/signup",
  ],
};
