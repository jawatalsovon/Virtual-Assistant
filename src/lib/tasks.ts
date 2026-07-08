import { supabaseAdmin } from "./supabase";

export interface Task {
  id: string;
  content: string;
  category: string;
  is_done: boolean;
  expires_at?: string;
  created_at: string;
}

export async function addTask(userId: string, content: string, category: string = "General", expires_at?: string): Promise<string> {
  const insertData: any = { user_id: userId, content, category };
  
  if (expires_at) {
    const parsedDate = new Date(expires_at);
    if (isNaN(parsedDate.getTime())) {
      console.warn(`Invalid expires_at provided: ${expires_at}. Defaulting to end of today.`);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      insertData.expires_at = endOfToday.toISOString();
    } else {
      insertData.expires_at = parsedDate.toISOString();
    }
  }

  const { error } = await supabaseAdmin
    .from("tasks")
    .insert(insertData);

  if (error) {
    console.error("Error adding task:", error);
    throw new Error("Failed to add task");
  }
  return `Task added successfully under category "${category}".`;
}

export async function getTasks(userId: string, query?: string): Promise<string> {
  // Lazy deletion: delete expired tasks first
  await supabaseAdmin
    .from("tasks")
    .delete()
    .eq("user_id", userId)
    .lt("expires_at", new Date().toISOString());

  let q = supabaseAdmin
    .from("tasks")
    .select("id, content, category, is_done, expires_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (query) {
    q = q.ilike("content", `%${query}%`);
  }

  const { data, error } = await q;
  if (error) throw new Error("Failed to fetch tasks");

  if (!data || data.length === 0) {
    return query ? `No tasks found matching "${query}".` : "You have no tasks yet.";
  }

  const grouped: Record<string, Task[]> = {};
  data.forEach((t: Task) => {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  });

  return Object.entries(grouped)
    .map(([cat, tasks]) =>
      `**${cat}:**\n` +
      tasks.map(t => `- [${t.is_done ? "x" : " "}] (id:${t.id}) ${t.content}`).join("\n")
    )
    .join("\n\n");
}

export async function updateTask(userId: string, taskId: string, updates: { content?: string; is_done?: boolean; category?: string }): Promise<string> {
  const { error } = await supabaseAdmin
    .from("tasks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) throw new Error("Failed to update task");
  
  if (updates.is_done !== undefined) {
    return updates.is_done ? "Task marked as done!" : "Task marked as not done.";
  }
  return "Task updated successfully.";
}

export async function deleteTask(userId: string, taskId: string): Promise<string> {
  const { error } = await supabaseAdmin
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) throw new Error("Failed to delete task");
  return "Task deleted successfully.";
}

export async function deleteNote(userId: string, noteId: string): Promise<string> {
  const { error } = await supabaseAdmin
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", userId);

  if (error) throw new Error("Failed to delete note");
  return "Note deleted successfully.";
}

export async function deleteNoteByContent(userId: string, query: string): Promise<string> {
  // Find note matching query then delete
  const { data, error: findError } = await supabaseAdmin
    .from("notes")
    .select("id, content")
    .eq("user_id", userId)
    .ilike("content", `%${query}%`)
    .limit(1)
    .single();

  if (findError || !data) {
    return `No note found matching "${query}".`;
  }

  const { error } = await supabaseAdmin
    .from("notes")
    .delete()
    .eq("id", data.id)
    .eq("user_id", userId);

  if (error) throw new Error("Failed to delete note");
  return `Note deleted: "${data.content.substring(0, 60)}..."`;
}
