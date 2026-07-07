import { SupabaseAdapter } from "@auth/supabase-adapter";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function test() {
  try {
    const adapter = SupabaseAdapter({
      url: process.env.SUPABASE_URL || "",
      secret: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    });

    console.log("Attempting to create user...");
    const user = await adapter.createUser!({
      email: "test_link@example.com",
      emailVerified: new Date(),
      name: "Test User",
      image: "",
    });
    console.log("User created:", user);

    console.log("Attempting to link account...");
    const account = await adapter.linkAccount!({
      userId: user.id,
      type: "oauth",
      provider: "google",
      providerAccountId: "google_12345",
      access_token: "test_token",
    });
    console.log("Account linked:", account);
    
    // Test session creation
    console.log("Attempting to create session...");
    const session = await adapter.createSession!({
      sessionToken: "test_session_123",
      userId: user.id,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    });
    console.log("Session created:", session);
    
  } catch (error) {
    console.error("Test failed with error:", error);
  }
}

test();
