import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Lazy deletion
  await supabaseAdmin
    .from("tasks")
    .delete()
    .eq("user_id", session.user.id)
    .lt("expires_at", new Date().toISOString());

  const { data: tasks, error } = await supabaseAdmin
    .from("tasks")
    .select("id, content, category, is_done, expires_at, created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content, category, expires_at } = await req.json();
  if (!content) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const insertData: any = { user_id: session.user.id, content, category: category || "General" };
  if (expires_at) insertData.expires_at = expires_at;

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .insert(insertData)
    .select("id, content, category, is_done, expires_at, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }

  return NextResponse.json({ task: data });
}
