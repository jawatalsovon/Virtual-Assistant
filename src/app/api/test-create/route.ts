import { NextResponse } from "next/server";
import { createConversation } from "@/lib/conversation";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { data: users, error: usersError } = await supabaseAdmin.schema('next_auth').from("users").select("id").limit(1);
    if (usersError || !users || users.length === 0) {
      return NextResponse.json({ error: "No users found", details: usersError }, { status: 500 });
    }

    const userId = users[0].id;
    const conv = await createConversation(userId, "Test via API");
    return NextResponse.json({ success: true, conv });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error", stack: error instanceof Error ? error.stack : undefined }, { status: 500 });
  }
}
