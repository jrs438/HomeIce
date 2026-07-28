import { db } from "@/db";
import { members, externalDrivers, rides } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendRideInvite } from "@/lib/ride-invite";
import { sendPushToMember } from "@/lib/push";
import { utcToZonedParts } from "@/lib/dates";
import { FAMILY_TIMEZONE } from "@/lib/family-constants";
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

/**
 * Sends an updated invite (same UID, higher SEQUENCE — calendar clients show
 * this as an update, not a duplicate) for a ride whose date/time/location
 * changed but whose driver didn't. No-op if nobody real is assigned.
 */
export async function notifyRideDetailsChanged(ride: RideRecord): Promise<string[]> {
  if (ride.driverType === "unassigned") return [];
  const contact = await resolveDriverContact(ride.driverType, ride.driverId);
  if (!contact) return [];
  const result = await sendRideInvite(ride, contact.email, contact.name, "REQUEST");
  if (!result.ok && !result.skipped) return [`Couldn't email ${contact.name} the updated time: ${result.error}`];
  return [];
}

/**
 * Keeps a per-instance ride (rides.eventId) in step with its event: when the
 * event's time or location changes, the linked ride's date/time move with it
 * (drop-off tracks the start, pick-up tracks the end), and — since the whole
 * point is nobody should be left driving to a stale time — sends an updated
 * invite if a real driver is already assigned.
 */
export async function syncLinkedRidesToEvent(
  eventId: string,
  newStart: Date,
  newEnd: Date | null,
  newLocation: string | null
): Promise<string[]> {
  const linkedRides = await db.query.rides.findMany({ where: eq(rides.eventId, eventId) });
  const warnings: string[] = [];

  for (const ride of linkedRides) {
    const isDropoff = ride.kind === "activity_dropoff";
    const refInstant = isDropoff ? newStart : (newEnd ?? newStart);
    const { date, time } = utcToZonedParts(refInstant, FAMILY_TIMEZONE);

    const patch: Partial<typeof rides.$inferInsert> = { date, time, updatedAt: new Date() };
    if (newLocation) {
      if (isDropoff) patch.to = newLocation;
      else patch.from = newLocation;
    }
    if (ride.driverType !== "unassigned") patch.icsSequence = (ride.icsSequence ?? 0) + 1;

    const [updated] = await db.update(rides).set(patch).where(eq(rides.id, ride.id)).returning();
    if (updated.driverType !== "unassigned") {
      warnings.push(...(await notifyRideDetailsChanged(updated)));
    }
  }

  return warnings;
}
