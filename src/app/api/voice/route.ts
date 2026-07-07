import { NextResponse } from "next/server";
import { transcribeAudioBuffer } from "@/lib/groq";
import { runAgent } from "@/lib/agent";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { createConversation } from "@/lib/conversation";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
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

    const formData = await request.formData();
    const file = formData.get("file") as Blob | null;
    const conversationId = formData.get("conversationId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const mimeType = file.type || "audio/webm";

    console.log("Transcribing audio from web UI...");
    const transcript = await transcribeAudioBuffer(arrayBuffer, mimeType);
    console.log("Transcription:", transcript);

    let currentConversationId = conversationId;
    if (!currentConversationId) {
      const conv = await createConversation(userId, transcript.substring(0, 30) + "...");
      currentConversationId = conv.id;
    }

    const reply = await runAgent(userId, userName, currentConversationId, transcript);
    
    return NextResponse.json({ transcript, reply, conversationId: currentConversationId });
  } catch (error: unknown) {
    console.error("Voice API error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

