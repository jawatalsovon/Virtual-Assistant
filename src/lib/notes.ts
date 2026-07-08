import { supabaseAdmin } from "./supabase";

export async function saveNote(userId: string, content: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("notes")
    .insert({ user_id: userId, content })
    .select("id")
    .single();

  if (error) {
    console.error("Error saving note:", error);
    throw new Error("Failed to save note");
  }

  return "Note saved successfully.";
}

export async function searchNotes(userId: string, query: string): Promise<string[]> {
  // Simple text search for now
  const { data, error } = await supabaseAdmin
    .from("notes")
    .select("content, created_at")
    .eq("user_id", userId)
    .ilike("content", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error searching notes:", error);
    throw new Error("Failed to search notes");
  }

  return data.map((n) => `[${new Date(n.created_at).toLocaleDateString()}] ${n.content}`);
}
