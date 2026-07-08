import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getConversationMessages } from "@/lib/conversation";

export async function GET(
  request: Request,
  context: any
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // Fetch messages for the specific conversation
    const messages = await getConversationMessages(id);
    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: any
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { supabaseAdmin } = await import("@/lib/supabase");
    
    const { error } = await supabaseAdmin
      .from("conversations")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);
      
    if (error) {
      console.error("Delete conversation error:", error);
      return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete conversation exception:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
