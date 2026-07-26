import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rides, members, externalDrivers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendRideInvite } from "@/lib/ride-invite";
import { sendPushToMember } from "@/lib/push";
import type { RideRecord } from "@/components/rides/types";

async function resolveDriverContact(
  driverType: RideRecord["driverType"],
  driverId: string | null
): Promise<{ email: string; name: string } | null> {
  if (driverType === "member" && driverId) {
    const m = await db.query.members.findFirst({ where: eq(members.id, driverId) });
    const email = m?.inviteEmail || m?.emails?.[0];
    if (m && email) return { email, name: m.name };
  }
  if (driverType === "external" && driverId) {
    const d = await db.query.externalDrivers.findFirst({ where: eq(externalDrivers.id, driverId) });
    if (d?.email) return { email: d.email, name: d.label };
  }
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const before = await db.query.rides.findFirst({ where: eq(rides.id, id) });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const patch: Partial<typeof rides.$inferInsert> = { updatedAt: new Date() };
  if (body.date !== undefined) patch.date = body.date;
  if (body.time !== undefined) patch.time = body.time;
  if (body.kind !== undefined) patch.kind = body.kind;
  if (body.kidIds !== undefined) patch.kidIds = body.kidIds;
  if (body.from !== undefined) patch.from = body.from;
  if (body.to !== undefined) patch.to = body.to;
  if (body.confirmed !== undefined) patch.confirmed = body.confirmed;

  const driverChanged =
    body.driverType !== undefined && (body.driverType !== before.driverType || body.driverId !== before.driverId);

  if (body.driverType !== undefined) patch.driverType = body.driverType;
  if (body.driverId !== undefined) patch.driverId = body.driverId || null;
  if (driverChanged) patch.icsSequence = (before.icsSequence ?? 0) + 1;

  const [updated] = await db.update(rides).set(patch).where(eq(rides.id, id)).returning();
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (driverChanged) {
    const prevContact = await resolveDriverContact(before.driverType, before.driverId);
    const nextContact = await resolveDriverContact(updated.driverType, updated.driverId);

    if (prevContact && prevContact.email !== nextContact?.email) {
      await sendRideInvite(updated, prevContact.email, prevContact.name, "CANCEL");
    }
    if (nextContact) {
      await sendRideInvite(updated, nextContact.email, nextContact.name, "REQUEST");
    }
    if (updated.driverType === "member" && updated.driverId) {
      await sendPushToMember(updated.driverId, {
        title: "New ride assignment",
        body: `${updated.from} -> ${updated.to} on ${updated.date} at ${updated.time}`,
        url: "/rides",
      });
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(rides).where(eq(rides.id, id));
  return NextResponse.json({ ok: true });
}
