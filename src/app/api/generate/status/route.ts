import { NextRequest, NextResponse } from "next/server";
import { getTaskStatus } from "@/lib/kie/client";

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  const result = await getTaskStatus(taskId);
  if (result.code !== 200 || !result.data) {
    return NextResponse.json({ error: result.msg ?? "Failed" }, { status: 500 });
  }

  const { state, resultJson, failMsg } = result.data;

  if (state === "success" && resultJson) {
    let imageUrl: string | null = null;
    try {
      const parsed = JSON.parse(resultJson);
      // KIE.AI returns different shapes per model — try common paths
      imageUrl =
        parsed?.images?.[0]?.url ??
        parsed?.image_url ??
        parsed?.output?.[0] ??
        parsed?.url ??
        null;
    } catch {
      imageUrl = null;
    }
    return NextResponse.json({ state: "success", imageUrl });
  }

  if (state === "fail") {
    return NextResponse.json({ state: "fail", error: failMsg ?? "Generation failed" });
  }

  return NextResponse.json({ state });
}
