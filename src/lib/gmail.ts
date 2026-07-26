const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const PROCESSED_LABEL = "HomeIce/Processed";

export function gmailConfigured(): boolean {
  return !!(
    process.env.GMAIL_OAUTH_CLIENT_ID &&
    process.env.GMAIL_OAUTH_CLIENT_SECRET &&
    process.env.GMAIL_OAUTH_REFRESH_TOKEN
  );
}

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_OAUTH_CLIENT_ID!,
      client_secret: process.env.GMAIL_OAUTH_CLIENT_SECRET!,
      refresh_token: process.env.GMAIL_OAUTH_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Gmail token refresh failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
}

async function ensureProcessedLabelId(token: string): Promise<string> {
  const res = await fetch(`${GMAIL_API}/labels`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  const existing = (data.labels ?? []).find((l: { name: string }) => l.name === PROCESSED_LABEL);
  if (existing) return existing.id;

  const created = await fetch(`${GMAIL_API}/labels`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: PROCESSED_LABEL, labelListVisibility: "labelHide", messageListVisibility: "hide" }),
  });
  const createdData = await created.json();
  return createdData.id as string;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function extractPlainText(payload: {
  mimeType?: string;
  body?: { data?: string };
  parts?: { mimeType?: string; body?: { data?: string }; parts?: unknown[] }[];
}): string {
  if (payload.mimeType === "text/plain" && payload.body?.data) return decodeBase64Url(payload.body.data);
  if (payload.parts) {
    for (const part of payload.parts) {
      const found = extractPlainText(part as typeof payload);
      if (found) return found;
    }
  }
  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  return "";
}

export type FetchedEmail = { id: string; from: string; subject: string; body: string };

export async function pollAllowlistedEmails(allowlist: string[]): Promise<FetchedEmail[]> {
  if (!gmailConfigured() || allowlist.length === 0) return [];

  const token = await getAccessToken();
  const labelId = await ensureProcessedLabelId(token);

  const fromQuery = allowlist.map((e) => `from:${e}`).join(" OR ");
  const query = `(${fromQuery}) -label:"${PROCESSED_LABEL}"`;
  const listRes = await fetch(
    `${GMAIL_API}/messages?q=${encodeURIComponent(query)}&maxResults=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const listData = await listRes.json();
  const ids: string[] = (listData.messages ?? []).map((m: { id: string }) => m.id);

  const results: FetchedEmail[] = [];
  for (const id of ids) {
    const msgRes = await fetch(`${GMAIL_API}/messages/${id}?format=full`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const msg = await msgRes.json();
    const headers: { name: string; value: string }[] = msg.payload?.headers ?? [];
    const from = headers.find((h) => h.name === "From")?.value ?? "";
    const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
    const body = extractPlainText(msg.payload ?? {}) || msg.snippet || "";
    results.push({ id, from, subject, body: `${subject}\n\n${body}` });

    await fetch(`${GMAIL_API}/messages/${id}/modify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ addLabelIds: [labelId] }),
    });
  }

  return results;
}
