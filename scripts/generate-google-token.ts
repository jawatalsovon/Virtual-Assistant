import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Scopes required for Gmail and Calendar
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.events"
];

async function run() {
  console.log("Starting Google OAuth2 consent flow...");
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("❌ GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing from .env.local.");
    console.error("Please add them and try again.");
    process.exit(1);
  }

  try {
    // @google-cloud/local-auth requires a physical credentials file
    const tempCredsPath = path.join(process.cwd(), "temp-credentials.json");
    fs.writeFileSync(
      tempCredsPath,
      JSON.stringify({
        installed: {
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uris: ["http://localhost"],
        },
      })
    );

    // Authenticate using the local web server flow
    // This will open a browser for the user to log in
    const auth = await authenticate({
      scopes: SCOPES,
      keyfilePath: tempCredsPath,
    });

    // Clean up temp file
    fs.unlinkSync(tempCredsPath);

    console.log("\n✅ Authentication successful!");
    console.log("Here is your Refresh Token. Add this to your .env.local file as GOOGLE_REFRESH_TOKEN:\n");
    console.log("--------------------------------------------------");
    console.log(auth.credentials.refresh_token);
    console.log("--------------------------------------------------\n");

  } catch (error) {
    console.error("Authentication failed:", error);
  }
}

run();
