import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { telegramChatId } = await request.json();

    if (!telegramChatId || isNaN(Number(telegramChatId))) {
      return NextResponse.json({ error: "Invalid Telegram Chat ID" }, { status: 400 });
    }

    const userId = session.user.id;
    const chatId = parseInt(telegramChatId, 10);

    // Upsert the mapping
    const { error } = await supabaseAdmin
      .from("telegram_mappings")
      .upsert({ telegram_chat_id: chatId, user_id: userId }, { onConflict: "telegram_chat_id" });

    if (error) {
      console.error("Error saving Telegram mapping:", error);
      return NextResponse.json({ error: "Failed to link Telegram account" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram link API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
