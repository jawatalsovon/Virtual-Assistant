import crypto from "crypto";
import { supabaseAdmin } from "./supabase";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generates a new Shortcut/automation token for the user, replacing any
 * existing one (one active token per user). Returns the plaintext token,
 * which is shown to the user exactly once -- only its hash is stored.
 */
export async function generateApiToken(userId: string, name = "Shortcut"): Promise<string> {
  const token = `nova_${crypto.randomBytes(24).toString("hex")}`;
  const token_hash = hashToken(token);

  await supabaseAdmin.from("api_tokens").delete().eq("user_id", userId);

  const { error } = await supabaseAdmin.from("api_tokens").insert({ user_id: userId, token_hash, name });
  if (error) {
    throw new Error("Failed to generate token: " + error.message);
  }

  return token;
}

export async function hasApiToken(userId: string): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from("api_tokens")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}

export async function revokeApiToken(userId: string): Promise<void> {
  await supabaseAdmin.from("api_tokens").delete().eq("user_id", userId);
}

export interface TokenUser {
  id: string;
  name: string;
}

/** Verifies a bearer token and returns the associated user, or null if invalid/revoked. */
export async function verifyApiToken(token: string): Promise<TokenUser | null> {
  const token_hash = hashToken(token);
  const { data, error } = await supabaseAdmin
    .from("api_tokens")
    .select("id, user_id")
    .eq("token_hash", token_hash)
    .maybeSingle();

  if (error || !data) return null;

  // Best-effort, non-blocking -- not worth failing the request over.
  supabaseAdmin
    .from("api_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  const { data: user } = await supabaseAdmin
    .schema("next_auth")
    .from("users")
    .select("id, name")
    .eq("id", data.user_id)
    .single();

  if (!user) return null;
  return { id: user.id, name: user.name || "User" };
}
