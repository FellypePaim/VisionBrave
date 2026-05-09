import { NextRequest, NextResponse } from "next/server";
import { getMusicStatus, SunoStatus } from "@/lib/kie/client";

const PENDING: SunoStatus[] = ["PENDING", "TEXT_SUCCESS", "FIRST_SUCCESS"];
const FAILED: SunoStatus[] = ["CREATE_TASK_FAILED", "GENERATE_AUDIO_FAILED", "SENSITIVE_WORD_DETECTED"];

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  const result = await getMusicStatus(taskId);

  if (result.code !== 200 || !result.data) {
    return NextResponse.json({ error: result.msg ?? "Failed" }, { status: 500 });
  }

  const { status, response, errorMessage } = result.data;

  if (status === "SUCCESS") {
    const tracks = (response?.sunoData ?? []).map((t) => ({
      id: t.id,
      audioUrl: t.audioUrl,
      imageUrl: t.imageUrl,
      title: t.title,
      tags: t.tags,
      duration: t.duration,
    }));
    return NextResponse.json({ status: "SUCCESS", tracks });
  }

  if (FAILED.includes(status)) {
    return NextResponse.json({ status: "FAILED", error: errorMessage ?? "Generation failed" });
  }

  if (PENDING.includes(status)) {
    // FIRST_SUCCESS means at least one track is ready — return partial results
    if (status === "FIRST_SUCCESS" && response?.sunoData?.length) {
      const tracks = response.sunoData.map((t) => ({
        id: t.id,
        audioUrl: t.audioUrl,
        imageUrl: t.imageUrl,
        title: t.title,
        tags: t.tags,
        duration: t.duration,
      }));
      return NextResponse.json({ status: "FIRST_SUCCESS", tracks });
    }
    return NextResponse.json({ status });
  }

  return NextResponse.json({ status: "PENDING" });
}
