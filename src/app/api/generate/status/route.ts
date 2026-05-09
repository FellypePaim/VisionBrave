import { NextRequest, NextResponse } from "next/server";
import { getTaskStatus, parseResultUrl } from "@/lib/kie/client";

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) {
    return NextResponse.json({ error: "taskId required" }, { status: 400 });
  }

  const result = await getTaskStatus(taskId);

  if (result.code !== 200 || !result.data) {
    return NextResponse.json(
      { error: result.msg ?? "Failed to get task status" },
      { status: 500 }
    );
  }

  const { state, resultJson, failMsg } = result.data;

  switch (state) {
    case "success": {
      const imageUrl = parseResultUrl(resultJson);
      return NextResponse.json({ state: "success", imageUrl });
    }
    case "fail":
      return NextResponse.json({ state: "fail", error: failMsg ?? "Generation failed" });
    case "waiting":
    case "queuing":
    case "generating":
      return NextResponse.json({ state });
    default:
      return NextResponse.json({ state: "waiting" });
  }
}
