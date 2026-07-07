import { google } from "googleapis";
import { supabaseAdmin } from "./supabase";

/**
 * Build the OAuth2 client using the credentials for a specific user.
 * The client automatically handles refreshing the access token
 * using the user's stored refresh token.
 */
export async function getAuthClient(userId: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Google OAuth credentials in .env.local");
  }

  // Fetch the user's refresh_token from Supabase next_auth.accounts
  const { data, error } = await supabaseAdmin
    .schema("next_auth")
    .from("accounts")
    .select("refresh_token")
    .eq("userId", userId)
    .eq("provider", "google")
    .single();

  if (error || !data?.refresh_token) {
    console.error("Error fetching refresh token:", error);
    throw new Error(`Missing refresh_token for user ${userId}`);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    "http://localhost" // Not used since we just refresh, but required for init
  );

  oauth2Client.setCredentials({
    refresh_token: data.refresh_token,
  });

  return oauth2Client;
}
