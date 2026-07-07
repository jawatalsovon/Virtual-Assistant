import { NextResponse } from "next/server";
import { transcribeAudioBuffer } from "@/lib/groq";
import { runAgent } from "@/lib/agent";
import type { ChatMessage } from "@/lib/agent";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;
    const historyJson = formData.get("history") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const mimeType = file.type || "audio/webm";

    console.log("Transcribing audio from web UI...");
    const transcript = await transcribeAudioBuffer(arrayBuffer, mimeType);
    console.log("Transcription:", transcript);

    // Parse conversation history if provided
    let conversationHistory: ChatMessage[] = [];
    if (historyJson) {
      try {
        const parsed = JSON.parse(historyJson) as ChatMessage[];
        conversationHistory = parsed
          .filter((m: ChatMessage) => m.role === "user" || m.role === "assistant")
          .map((m: ChatMessage) => ({ role: m.role, content: m.content }));
      } catch {
        // Ignore invalid history JSON
      }
    }

    const reply = await runAgent(transcript, conversationHistory);
    
    return NextResponse.json({ transcript, reply });
  } catch (error: unknown) {
    console.error("Voice API error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
