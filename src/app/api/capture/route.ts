import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { runCapture } from "@/lib/capture/run";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-capture-secret");
  const expected = process.env.CAPTURE_SECRET;
  const secretOk = !!secret && secret === expected;

  const member = await getCurrentMember();
  if (!secretOk && !member) {
    // TEMPORARY debug info to diagnose a secret mismatch — no secret values are
    // exposed, only lengths/whitespace/case comparisons. Remove once resolved.
    return NextResponse.json(
      {
        error: "Unauthorized",
        debug: {
          headerPresent: secret !== null,
          receivedLength: secret?.length ?? 0,
          expectedLength: expected?.length ?? 0,
          matchesTrimmed: !!secret && !!expected && secret.trim() === expected.trim(),
          matchesCaseInsensitive: !!secret && !!expected && secret.toLowerCase() === expected.toLowerCase(),
        },
      },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.type || !body?.content) {
    return NextResponse.json({ error: "type and content are required" }, { status: 400 });
  }
  if (!["text", "image", "email"].includes(body.type)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  const from = member ? member.name : body.from || "Shortcut";

  try {
    const result = await runCapture({ type: body.type, content: body.content, from });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Capture failed" },
      { status: 500 }
    );
  }
}
