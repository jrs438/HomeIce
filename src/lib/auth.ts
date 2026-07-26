import { cookies } from "next/headers";
import { signToken, verifyToken } from "./crypto";
import { db } from "@/db";
import { members } from "@/db/schema";
import { eq } from "drizzle-orm";

const SESSION_COOKIE = "hi_session";
const PW_COOKIE = "hi_pw";
const SESSION_DAYS = 90;

function secret() {
  // Reuse the already-provisioned CAPTURE_SECRET so no extra env var is required.
  return process.env.CAPTURE_SECRET ?? "dev-insecure-secret-change-me";
}

export type SessionPayload = { memberId: string; exp: number };

export async function createPasswordProofCookie() {
  const token = await signToken({ ok: true, exp: Date.now() + 10 * 60 * 1000 }, secret());
  const store = await cookies();
  store.set(PW_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
}

export async function hasPasswordProof(): Promise<boolean> {
  const store = await cookies();
  const payload = await verifyToken<{ ok: boolean }>(store.get(PW_COOKIE)?.value, secret());
  return !!payload?.ok;
}

export async function createSession(memberId: string) {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const token = await signToken({ memberId, exp } satisfies SessionPayload, secret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  store.delete(PW_COOKIE);
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifyToken<SessionPayload>(store.get(SESSION_COOKIE)?.value, secret());
}

export async function getCurrentMember() {
  const session = await getSession();
  if (!session) return null;
  const member = await db.query.members.findFirst({ where: eq(members.id, session.memberId) });
  return member ?? null;
}
