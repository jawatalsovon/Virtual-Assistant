import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { sendEmail } from "../src/lib/gmail";

async function run() {
  try {
    console.log("Attempting to send a test email...");
    const res = await sendEmail("dummy-user-id", "jawatalsovon@gmail.com", "Test from script", "This is a test email body.");
    console.log("Success:", res);
  } catch (error: any) {
    console.error("Failed to send email. Details:");
    console.error(error);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
}

run();
