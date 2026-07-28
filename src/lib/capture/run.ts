import { db } from "@/db";
import { inboxItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { anthropic, CAPTURE_MODEL } from "@/lib/anthropic";
import { buildCaptureSystemPrompt } from "./context";
import { CAPTURE_TOOL, type CaptureAction, type CaptureResult } from "./schema";
import { applyAction, type ApplyOutcome, type CaptureContext } from "./apply";

export type CaptureInput = {
  type: "text" | "image" | "email";
  content: string;
  from?: string;
};

export type CaptureRunResult = {
  status: "applied" | "inbox";
  outcomes: ApplyOutcome[];
  clarification?: string;
  inboxItemId?: string;
};

function buildUserContent(input: CaptureInput) {
  if (input.type === "image") {
    const match = input.content.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (match) {
      return [
        {
          type: "image" as const,
          source: { type: "base64" as const, media_type: match[1] as "image/jpeg", data: match[2] },
        },
        { type: "text" as const, text: "Extract any family scheduling actions from this photo." },
      ];
    }
  }
  const prefix = input.type === "email" ? `Email from ${input.from ?? "unknown sender"}:\n\n` : "";
  return prefix + input.content;
}

export async function runCapture(input: CaptureInput): Promise<CaptureRunResult> {
  const [members, externalDrivers] = await Promise.all([
    db.query.members.findMany(),
    db.query.externalDrivers.findMany(),
  ]);

  const system = await buildCaptureSystemPrompt(input.from);

  let parsed: CaptureResult = { actions: [] };
  try {
    const response = await anthropic.messages.create({
      model: CAPTURE_MODEL,
      max_tokens: 4096,
      system,
      tools: [CAPTURE_TOOL],
      tool_choice: { type: "tool", name: "capture_actions" },
      messages: [{ role: "user", content: buildUserContent(input) as never }],
    });
    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (toolUse && toolUse.type === "tool_use") {
      parsed = toolUse.input as CaptureResult;
    }
  } catch {
    parsed = { actions: [] };
  }

  const actions = parsed.actions ?? [];
  const eventCount = actions.filter((a) => a.type === "add_event").length;
  const isBulkEmail = input.type === "email" && eventCount >= 3;
  const hasNothing = actions.length === 0 && !parsed.clarification_needed;

  if (hasNothing) {
    const [item] = await db
      .insert(inboxItems)
      .values({
        source: input.type === "image" ? "capture_image" : input.type === "email" ? "email" : "capture_text",
        raw: input.content.length > 5000 ? input.content.slice(0, 5000) : input.content,
        parsedActions: [{ type: "unknown" } as CaptureAction],
        status: "pending",
        fromLabel: input.from || null,
      })
      .returning();
    return { status: "inbox", outcomes: [], inboxItemId: item.id };
  }

  if (isBulkEmail) {
    const [item] = await db
      .insert(inboxItems)
      .values({
        source: "email",
        raw: input.content.length > 5000 ? input.content.slice(0, 5000) : input.content,
        parsedActions: actions,
        status: "pending",
        fromLabel: input.from || null,
      })
      .returning();
    return { status: "inbox", outcomes: [], inboxItemId: item.id, clarification: parsed.clarification_needed };
  }

  const outcomes: ApplyOutcome[] = [];
  const context: CaptureContext = {};
  for (const action of actions) {
    outcomes.push(await applyAction(action, members, externalDrivers, context));
  }

  if (parsed.clarification_needed) {
    const [item] = await db
      .insert(inboxItems)
      .values({
        source: input.type === "image" ? "capture_image" : input.type === "email" ? "email" : "capture_text",
        raw: input.content.length > 5000 ? input.content.slice(0, 5000) : input.content,
        parsedActions: [{ type: "unknown", note: parsed.clarification_needed } as CaptureAction],
        status: "pending",
        fromLabel: input.from || null,
      })
      .returning();
    return { status: "applied", outcomes, clarification: parsed.clarification_needed, inboxItemId: item.id };
  }

  return { status: "applied", outcomes };
}

export async function approveInboxItem(id: string) {
  const item = await db.query.inboxItems.findFirst({ where: (i, { eq }) => eq(i.id, id) });
  if (!item) return null;
  const [members, externalDrivers] = await Promise.all([
    db.query.members.findMany(),
    db.query.externalDrivers.findMany(),
  ]);
  const actions = (item.parsedActions as CaptureAction[]) ?? [];
  const outcomes: ApplyOutcome[] = [];
  const context: CaptureContext = {};
  for (const action of actions) {
    outcomes.push(await applyAction(action, members, externalDrivers, context));
  }
  await db.update(inboxItems).set({ status: "approved" }).where(eq(inboxItems.id, id));
  return outcomes;
}
