import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/crypto";

const PUBLIC_PATHS = [
  "/login",
  "/offline.html",
  "/manifest.webmanifest",
  "/sw.js",
  "/api/auth",
  "/api/capture",
  "/api/cron",
  "/api/admin",
];

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  if (pathname.startsWith("/icons") || pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return true;
  }
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get("hi_session")?.value;
  const secret = process.env.CAPTURE_SECRET ?? "dev-insecure-secret-change-me";
  const payload = await verifyToken<{ memberId: string }>(token, secret);

  if (!payload) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
