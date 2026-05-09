import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const IMAGE_SUFFIXES = [
  "dramatic lighting, golden hour, ultra detailed",
  "cinematic composition, 8k resolution, photorealistic",
  "professional photography, bokeh background, sharp focus",
  "vibrant colors, high contrast, stunning visuals",
];

const VIDEO_SUFFIXES = [
  "smooth camera motion, cinematic depth of field, 4K",
  "dynamic camera angles, dramatic lighting, film grain",
  "slow motion details, epic wide shot, cinematic color grade",
];

const AUDIO_SUFFIXES = [
  "rich instrumentation, emotional depth, professional production",
  "layered harmonies, dynamic range, studio quality",
  "atmospheric soundscape, melodic progression, masterful mixing",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function enhancePrompt(prompt: string, type: string): string {
  const trimmed = prompt.trim();
  if (type === "video") return `${trimmed}, ${pickRandom(VIDEO_SUFFIXES)}`;
  if (type === "audio") return `${trimmed}, ${pickRandom(AUDIO_SUFFIXES)}`;
  return `${trimmed}, ${pickRandom(IMAGE_SUFFIXES)}`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prompt, type = "image" } = await req.json();
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const enhanced = enhancePrompt(prompt, type);
  return NextResponse.json({ enhanced });
}
