import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, prompt, model, externalUrl, metadata = {} } = await req.json();
  if (!externalUrl || !type || !model) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Download the file from the external CDN URL
  let fileBuffer: ArrayBuffer;
  let contentType: string;
  try {
    const res = await fetch(externalUrl);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    fileBuffer = await res.arrayBuffer();
    contentType = res.headers.get("content-type") ?? "application/octet-stream";
  } catch (err) {
    // If download fails (URL expired), still save the record with just the external URL
    const { data: record } = await supabase
      .from("generations")
      .insert({ user_id: user.id, type, prompt, model, external_url: externalUrl, metadata })
      .select("id")
      .single();
    return NextResponse.json({ id: record?.id, publicUrl: externalUrl });
  }

  // Determine file extension from content type
  const ext = contentType.includes("mp4") ? "mp4"
    : contentType.includes("webm") ? "webm"
    : contentType.includes("mp3") || contentType.includes("mpeg") ? "mp3"
    : contentType.includes("png") ? "png"
    : "jpg";

  const fileName = `${user.id}/${Date.now()}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("generations")
    .upload(fileName, fileBuffer, { contentType, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage
    .from("generations")
    .getPublicUrl(fileName);

  // Insert record
  const { data: record, error: dbError } = await supabase
    .from("generations")
    .insert({
      user_id: user.id,
      type,
      prompt,
      model,
      storage_path: fileName,
      public_url: publicUrl,
      external_url: externalUrl,
      metadata,
    })
    .select("id")
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ id: record.id, publicUrl });
}
