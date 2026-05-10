import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [creditsRes, subRes] = await Promise.all([
    supabase
      .from("credits")
      .select("balance, total_earned, total_spent")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("subscriptions")
      .select("plan, status, current_period_end, monthly_credits")
      .eq("user_id", user.id)
      .single(),
  ]);

  return NextResponse.json({
    credits: creditsRes.data ?? { balance: 0, total_earned: 0, total_spent: 0 },
    subscription: subRes.data ?? { plan: "free", status: "active", monthly_credits: 50 },
  });
}
