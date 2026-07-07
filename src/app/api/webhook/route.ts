import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/telegram";
import { transcribeAudio } from "@/lib/groq";
import { runAgent } from "@/lib/agent";
import { supabaseAdmin } from "@/lib/supabase";
import { getConversations, createConversation } from "@/lib/conversation";
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

    // 1. Lookup user in telegram_mappings
    const { data: mapping, error: mappingError } = await supabaseAdmin
      .from("telegram_mappings")
      .select("user_id")
      .eq("telegram_chat_id", chatId)
      .single();

    if (mappingError || !mapping?.user_id) {
      // If the user isn't mapped, we can't use their Google Workspace or LLM (tied to them)
      await sendMessage(chatId, "⚠️ Your Telegram account is not linked. Please log in to the Web App and link your Telegram account to use the assistant.");
      return NextResponse.json({ ok: true });
    }

    const userId = mapping.user_id;

    // Fetch userName for agent prompt
    const { data: userData } = await supabaseAdmin
      .schema("next_auth")
      .from("users")
      .select("name")
      .eq("id", userId)
      .single();
    
    const userName = userData?.name || "User";
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
      // 2. Load or create conversation
      const conversations = await getConversations(userId);
      let conversationId = conversations.length > 0 ? conversations[0].id : null;
      
      if (!conversationId) {
        const newConv = await createConversation(userId, "Telegram Chat");
        conversationId = newConv.id;
      }

      try {
        const reply = await runAgent(userId, userName, conversationId, userMessage);
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

