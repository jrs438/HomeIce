import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { runCapture } from "@/lib/capture/run";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-capture-secret");
  const secretOk = !!secret && secret === process.env.CAPTURE_SECRET;

  const member = await getCurrentMember();
  if (!secretOk && !member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
