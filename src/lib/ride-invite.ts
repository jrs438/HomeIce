import { mailerConfigured, getTransport } from "./mailer";
import { RIDE_KIND_LABELS } from "@/components/rides/types";
import type { RideRecord } from "@/components/rides/types";

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function rideDateTime(date: string, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d;
}

function buildIcs(ride: RideRecord, method: "REQUEST" | "CANCEL", title: string) {
  const start = rideDateTime(ride.date, ride.time);
  const end = new Date(start.getTime() + 15 * 60 * 1000);
  const status = method === "CANCEL" ? "CANCELLED" : "CONFIRMED";
  return [
    "BEGIN:VCALENDAR",
    "PRODID:-//HomeIce//Rides//EN",
    "VERSION:2.0",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${ride.icsUid ?? ride.id}`,
    `SEQUENCE:${ride.icsSequence ?? 0}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${title}`,
    `LOCATION:${ride.from} -> ${ride.to}`,
    `ORGANIZER:mailto:${process.env.GMAIL_USER}`,
    `STATUS:${status}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function sendRideInvite(
  ride: RideRecord,
  driverEmail: string,
  driverName: string,
  method: "REQUEST" | "CANCEL"
) {
  if (!mailerConfigured()) return;
  const title = `${RIDE_KIND_LABELS[ride.kind]}: ${ride.from} -> ${ride.to}`;
  const ics = buildIcs(ride, method, title);
  const verb = method === "CANCEL" ? "Cancelled" : "Ride assignment";

  try {
    await getTransport().sendMail({
      from: process.env.GMAIL_USER,
      to: driverEmail,
      subject: `${verb}: ${title} (${ride.date})`,
      text: `Hi ${driverName},\n\n${verb === "Cancelled" ? "This ride has been cancelled." : `You're on for: ${title} on ${ride.date} at ${ride.time}.`}\n\n— HomeIce`,
      icalEvent: {
        filename: "ride.ics",
        method,
        content: ics,
      },
    });
  } catch (err) {
    console.error("Failed to send ride invite", err);
  }
}
