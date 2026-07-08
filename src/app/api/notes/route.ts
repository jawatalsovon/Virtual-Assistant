import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: notes, error } = await supabaseAdmin
      .from("notes")
      .select("id, content, topic, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase Error fetching notes:", error);
      return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
    }

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("API Error fetching notes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
