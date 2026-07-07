import { google } from "googleapis";
import { getAuthClient } from "./google-auth";
import type { EmailSummary } from "./types";

/**
 * Fetch the latest unread emails from the primary inbox.
 */
export async function getUnreadEmails(userId: string, maxResults = 10): Promise<EmailSummary[]> {
  const auth = await getAuthClient(userId);
  const gmail = google.gmail({ version: "v1", auth });

  try {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: "is:unread -category:promotions -category:social", // Only important unread
      maxResults,
    });

    const messages = res.data.messages || [];
    
    if (messages.length === 0) {
      return [];
    }

    const emailDetails = await Promise.all(
      messages.map(async (msg) => {
        const fullMsg = await gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        });

        const headers = fullMsg.data.payload?.headers || [];
        const sender = headers.find((h) => h.name === "From")?.value || "Unknown Sender";
        const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject";
        const date = headers.find((h) => h.name === "Date")?.value || "";

        return {
          id: msg.id!,
          sender,
          subject,
          snippet: fullMsg.data.snippet || "",
          date,
        };
      })
    );

    return emailDetails;
  } catch (error) {
    console.error("Error fetching emails:", error);
    throw new Error("Failed to fetch emails");
  }
}

/**
 * Send an email from Dr. Mehjabeen's Gmail account.
 */
export async function sendEmail(userId: string, to: string, subject: string, body: string): Promise<{ success: boolean; messageId: string }> {
  const auth = await getAuthClient(userId);
  const gmail = google.gmail({ version: "v1", auth });

  try {
    // Construct the RFC 2822 formatted email
    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      "",
      body,
    ];
    const rawMessage = emailLines.join("\r\n");

    // Base64url encode the message
    const encodedMessage = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    return {
      success: true,
      messageId: res.data.id || "unknown",
    };
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
}
