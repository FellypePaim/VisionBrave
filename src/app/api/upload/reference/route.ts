import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const contentType = file.type || "application/octet-stream";
  const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const ext = contentType.includes("jpeg") ? "jpg"
    : contentType.includes("png")  ? "png"
    : contentType.includes("webp") ? "webp"
    : contentType.includes("mp4")  ? "mp4"
    : contentType.includes("mov")  ? "mov"
    : contentType.includes("mp3")  ? "mp3"
    : contentType.includes("wav")  ? "wav"
    : rawExt;

  const fileName = `${user.id}/refs/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("generations")
    .upload(fileName, bytes, { contentType, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage
    .from("generations")
    .getPublicUrl(fileName);

  return NextResponse.json({ url: publicUrl });
}
