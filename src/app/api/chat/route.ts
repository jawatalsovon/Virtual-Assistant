import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { createConversation } from "@/lib/conversation";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log("Chat API Session:", session);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized - Please sign out and sign back in." }, { status: 401 });
    }
    
    // Validate UUID format (stale session check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(session.user.id)) {
      return NextResponse.json({ error: "Stale session detected. Please sign out and sign back in." }, { status: 401 });
    }
    const userId = session.user.id;
    const userName = session.user.name || "User";

    const body = await request.json();
    const { message, conversationId } = body as { message: string; conversationId?: string };

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Ensure we have a conversation ID
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      const conv = await createConversation(userId, message.substring(0, 30) + "...");
      currentConversationId = conv.id;
    }

    const reply = await runAgent(userId, userName, currentConversationId, message);
    return NextResponse.json({ reply, conversationId: currentConversationId });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    require("fs").writeFileSync("error.log", "Chat API Error: " + (error instanceof Error ? error.stack : String(error)));
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

