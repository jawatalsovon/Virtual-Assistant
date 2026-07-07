import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/telegram";
import { transcribeAudio } from "@/lib/groq";
import { runAgent } from "@/lib/agent";
import { getSessionHistory, addToSession } from "@/lib/session";
import type { TelegramUpdate } from "@/lib/types";

// Vercel serverless function timeout (seconds).
// Free tier allows up to 60s; needed for voice → transcribe → LLM pipeline.
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const update: TelegramUpdate = await request.json();

    // Only handle messages (ignore edited_message, channel_post, etc.)
    if (!update.message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text;
    const voice = update.message.voice;
    const sessionId = `telegram:${chatId}`;

    let userMessage: string | null = null;

    if (voice) {
      // Voice message → transcribe via Groq Whisper
      try {
        await sendMessage(chatId, "🎙️ Transcribing your voice note...");
        userMessage = await transcribeAudio(voice.file_id);
        console.log("Transcription:", userMessage);
      } catch (error) {
        console.error("Transcription error:", error);
        await sendMessage(chatId, "❌ Sorry, I couldn't transcribe that voice note. Please try again or type your message.");
        return NextResponse.json({ ok: true });
      }
    } else if (text) {
      // Text message → use directly
      userMessage = text;
    }

    if (userMessage) {
      // Get conversation history for this Telegram chat
      const history = getSessionHistory(sessionId);

      // Add user message to session
      addToSession(sessionId, { role: "user", content: userMessage });

      try {
        const reply = await runAgent(userMessage, history);

        // Add assistant reply to session
        addToSession(sessionId, { role: "assistant", content: reply });

        await sendMessage(chatId, reply);
      } catch (error) {
        console.error("LLM error:", error);
        await sendMessage(chatId, "❌ Sorry, I encountered an error processing your request. Please try again.");
      }
    } else {
      // Unsupported message type (sticker, photo, etc.)
      await sendMessage(chatId, "I can handle text and voice messages. Please send one of those!");
    }

    // Always return 200 quickly — Telegram retries on non-200 responses
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: true }); // Still return 200 to prevent Telegram retries
  }
}
