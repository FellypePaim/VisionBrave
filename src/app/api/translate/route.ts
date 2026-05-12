import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Traduz texto PT → EN via MyMemory (gratuito, sem chave, 1000 palavras/dia por IP).
 * Usado internamente para converter campos de vestuário/descrição do ensaio fotográfico.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ translated: "" });

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.trim())}&langpair=pt|en`;
    const res  = await fetch(url, { next: { revalidate: 0 } });

    if (!res.ok) throw new Error("translate_api_error");

    const data = await res.json();
    const translated: string = data.responseData?.translatedText ?? text;

    // MyMemory às vezes retorna em maiúsculo se a confiança for baixa — normaliza
    const cleaned = translated.charAt(0).toLowerCase() + translated.slice(1);

    return NextResponse.json({ translated: cleaned, confidence: data.responseData?.match ?? 0 });
  } catch {
    // Fallback silencioso: retorna o texto original
    return NextResponse.json({ translated: text, fallback: true });
  }
}
