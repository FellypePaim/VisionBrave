import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const limit = Math.min(Number(searchParams.get("limit") ?? 24), 100);
  const offset = Number(searchParams.get("offset") ?? 0);

  let query = supabase
    .from("generations")
    .select("id, type, prompt, model, public_url, external_url, metadata, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq("type", type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Counts per type (small extra query, runs in parallel)
  const [imgCount, vidCount, audCount] = await Promise.all([
    supabase.from("generations").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("type", "image"),
    supabase.from("generations").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("type", "video"),
    supabase.from("generations").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("type", "audio"),
  ]);

  return NextResponse.json({
    items: data,
    hasMore: (data?.length ?? 0) === limit,
    counts: {
      image: imgCount.count ?? 0,
      video: vidCount.count ?? 0,
      audio: audCount.count ?? 0,
      all: (imgCount.count ?? 0) + (vidCount.count ?? 0) + (audCount.count ?? 0),
    },
  });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Get storage path before deleting
  const { data: record } = await supabase
    .from("generations")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (record?.storage_path) {
    await supabase.storage.from("generations").remove([record.storage_path]);
  }

  const { error } = await supabase
    .from("generations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
