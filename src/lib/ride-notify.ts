import { db } from "@/db";
import { members, externalDrivers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendRideInvite } from "@/lib/ride-invite";
import { sendPushToMember } from "@/lib/push";
import type { RideRecord } from "@/components/rides/types";

type DriverRef = { driverType: RideRecord["driverType"]; driverId: string | null };

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

/**
 * Sends the cancel/request calendar invites (and a push notification) for a
 * ride's driver changing. `prev` is null for a brand-new ride (nothing to
 * cancel). Returns any email failures as human-readable warning strings so
 * callers can surface them instead of failing silently.
 */
export async function notifyRideDriverChange(
  ride: RideRecord,
  prev: DriverRef | null,
  next: DriverRef
): Promise<string[]> {
  const warnings: string[] = [];

  const prevContact = prev ? await resolveDriverContact(prev.driverType, prev.driverId) : null;
  const nextContact = await resolveDriverContact(next.driverType, next.driverId);

  if (prevContact && prevContact.email !== nextContact?.email) {
    const result = await sendRideInvite(ride, prevContact.email, prevContact.name, "CANCEL");
    if (!result.ok && !result.skipped) warnings.push(`Couldn't email ${prevContact.name} the cancellation: ${result.error}`);
  }
  if (nextContact) {
    const result = await sendRideInvite(ride, nextContact.email, nextContact.name, "REQUEST");
    if (!result.ok && !result.skipped) warnings.push(`Couldn't email ${nextContact.name} the invite: ${result.error}`);
  }
  if (next.driverType === "member" && next.driverId) {
    await sendPushToMember(next.driverId, {
      title: "New ride assignment",
      body: `${ride.from} -> ${ride.to} on ${ride.date} at ${ride.time}`,
      url: "/rides",
    });
  }

  return warnings;
}

/**
 * Sends a cancellation invite for a ride that's being removed entirely (event
 * cancelled, recurring occurrence skipped, series deleted, etc.) — a no-op if
 * nobody real was assigned to it.
 */
export async function notifyRideCancelled(ride: RideRecord): Promise<string[]> {
  if (ride.driverType === "unassigned") return [];
  const contact = await resolveDriverContact(ride.driverType, ride.driverId);
  if (!contact) return [];
  const result = await sendRideInvite(ride, contact.email, contact.name, "CANCEL");
  if (!result.ok && !result.skipped) return [`Couldn't email ${contact.name} the cancellation: ${result.error}`];
  return [];
}
