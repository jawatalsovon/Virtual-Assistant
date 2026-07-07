import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function test() {
  const { supabaseAdmin } = await import("./src/lib/supabase");
  
  const { data, error } = await supabaseAdmin.schema("next_auth").from("users").select("*");
  console.log("Users:", data);
  console.log("Error:", error);
}

test();
