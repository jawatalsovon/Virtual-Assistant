import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";
import { createConversation, getConversations } from "@/lib/conversation";
import { verifyApiToken } from "@/lib/apiTokens";

export const maxDuration = 60;

/**
 * Token-authenticated entry point for external automation (iOS Shortcuts,
 * Android Tasker, etc.) that can't hold a browser session cookie.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });
    }

    const user = await verifyApiToken(match[1]);
    if (!user) {
      return NextResponse.json({ error: "Invalid or revoked token" }, { status: 401 });
    }

    const body = await request.json();
    const { message } = body as { message: string };
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Shortcut runs are stateless one-off queries -- always continue the
    // user's most recent conversation rather than requiring the Shortcut
    // to track a conversationId (same pattern as the Telegram webhook).
    const conversations = await getConversations(user.id);
    let conversationId = conversations[0]?.id;
    if (!conversationId) {
      const conv = await createConversation(user.id, "Shortcut");
      conversationId = conv.id;
    }

    const reply = await runAgent(user.id, user.name, conversationId, message);
    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error("Shortcut API error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
