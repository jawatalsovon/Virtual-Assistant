import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function test() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      { db: { schema: "next_auth" } }
    );

    // Insert user
    const { data: userData, error: userError } = await supabase.from("users").insert([
      {
        name: "Direct Test User",
        email: "direct_test_account@example.com",
        emailVerified: new Date().toISOString(),
      }
    ]).select();

    if (userError) {
      console.error("User insert error:", userError);
      return;
    }
    
    console.log("User insert success");
    const userId = userData[0].id;

    // Insert account
    const { data: accountData, error: accountError } = await supabase.from("accounts").insert([
      {
        userId: userId,
        type: "oauth",
        provider: "google",
        providerAccountId: "123456789",
        access_token: "test_token",
      }
    ]).select();

    if (accountError) {
      console.error("Account insert error:", accountError);
    } else {
      console.log("Account insert success");
    }

    // Cleanup
    await supabase.from("accounts").delete().eq("providerAccountId", "123456789");
    await supabase.from("users").delete().eq("id", userId);

  } catch (err) {
    console.error("Exception:", err);
  }
}

test();
