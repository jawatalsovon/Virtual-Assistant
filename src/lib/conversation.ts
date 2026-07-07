import { supabaseAdmin } from "./supabase";
import type { ChatMessage } from "./agent";

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export async function createConversation(userId: string, title: string = "New Conversation"): Promise<Conversation> {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .insert([{ user_id: userId, title }])
    .select()
    .single();

  if (error || !data) {
    console.error("Error creating conversation:", error);
    throw new Error(`Failed to create conversation: ${error?.message || "No data returned"}`);
  }

  return data as Conversation;
}

export async function getConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching conversations:", error);
    return [];
  }

  return data as Conversation[];
}

export async function getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  return data.map((msg: any) => ({
    role: msg.role as ChatMessage["role"],
    content: msg.content,
    name: msg.name,
    tool_calls: msg.tool_calls,
    tool_call_id: msg.tool_call_id,
  }));
}

export async function addMessage(conversationId: string, message: ChatMessage): Promise<void> {
  const { error } = await supabaseAdmin
    .from("messages")
    .insert([{
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      name: message.name,
      tool_calls: message.tool_calls,
      tool_call_id: message.tool_call_id,
    }]);

  if (error) {
    console.error("Error adding message:", error);
    throw new Error("Failed to add message");
  }

  // Update conversation updated_at
  await supabaseAdmin
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("conversations")
    .delete()
    .eq("id", conversationId);

  if (error) {
    console.error("Error deleting conversation:", error);
    throw new Error("Failed to delete conversation");
  }
}
