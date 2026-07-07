import * as dotenv from "dotenv";
import * as path from "path";
import { google } from "googleapis";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function run() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!refreshToken) {
    console.error("No refresh token");
    return;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, "http://localhost");
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  try {
    const rawMessage = `To: jawatalsovon@gmail.com\r\nSubject: Test API directly\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\nTest direct API call`;
    const encodedMessage = Buffer.from(rawMessage).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    console.log("Sending email...");
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });
    console.log("Success:", res.data);
  } catch (error: any) {
    console.error("Error message:", error.message);
    if (error.response?.data) {
      console.error("Error data:", JSON.stringify(error.response.data, null, 2));
    }
  }
}

run();
