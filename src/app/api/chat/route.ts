import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";
import type { ChatMessage } from "@/lib/agent";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, history } = body as { message: string; history?: ChatMessage[] };

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Filter history to only include user/assistant messages (no system/tool)
    const conversationHistory: ChatMessage[] = (history || [])
      .filter((m: ChatMessage) => m.role === "user" || m.role === "assistant")
      .map((m: ChatMessage) => ({ role: m.role, content: m.content }));

    const reply = await runAgent(message, conversationHistory);
    return NextResponse.json({ reply });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
