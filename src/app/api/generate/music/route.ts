import { NextRequest, NextResponse } from "next/server";
import { createMusicTask } from "@/lib/kie/client";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    prompt,
    model = "V4_5",
    customMode = false,
    style,
    title,
    instrumental = false,
    vocalGender,
    negativeTags,
    styleWeight,
    weirdnessConstraint,
    audioWeight,
  } = await req.json();

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const task = await createMusicTask({
    prompt,
    model,
    customMode,
    style,
    title,
    instrumental,
    vocalGender,
    negativeTags,
    styleWeight,
    weirdnessConstraint,
    audioWeight,
  });

  if (task.code !== 200 || !task.data?.taskId) {
    return NextResponse.json({ error: task.msg ?? "Failed to start generation" }, { status: 500 });
  }

  return NextResponse.json({ taskId: task.data.taskId });
}
