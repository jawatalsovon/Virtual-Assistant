import { google } from "googleapis";
import { getAuthClient } from "./google-auth";
import type { EmailSummary } from "./types";

/**
 * Fetch the latest unread emails from the primary inbox.
 */
export async function getUnreadEmails(userId: string, maxResults = 10, query = ""): Promise<EmailSummary[]> {
  const auth = await getAuthClient(userId);
  const gmail = google.gmail({ version: "v1", auth });

  try {
    const q = query 
      ? `is:unread ${query}` 
      : "is:unread -category:promotions -category:social";

    const res = await gmail.users.messages.list({
      userId: "me",
      q,
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
 * Fetch a full email thread for context.
 */
export async function getEmailThread(userId: string, messageId: string): Promise<string> {
  const auth = await getAuthClient(userId);
  const gmail = google.gmail({ version: "v1", auth });

  try {
    // First get the message to find its threadId
    const msg = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "minimal",
    });

    if (!msg.data.threadId) return "Thread not found";

    // Then fetch the thread
    const thread = await gmail.users.threads.get({
      userId: "me",
      id: msg.data.threadId,
    });

    const messages = thread.data.messages || [];
    let threadContent = "";

    for (const m of messages) {
      const headers = m.payload?.headers || [];
      const from = headers.find(h => h.name === "From")?.value || "Unknown";
      const snippet = m.snippet || "";
      threadContent += `From: ${from}\nMessage: ${snippet}\n\n`;
    }

    return threadContent;
  } catch (error) {
    console.error("Error fetching email thread:", error);
    return "Failed to fetch email thread.";
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

/**
 * Reply to an existing email.
 */
export async function replyToEmail(userId: string, messageId: string, body: string): Promise<{ success: boolean; messageId: string }> {
  const auth = await getAuthClient(userId);
  const gmail = google.gmail({ version: "v1", auth });

  try {
    // Fetch the original message to get headers for reply
    const original = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "metadata",
      metadataHeaders: ["Message-ID", "References", "Subject", "From"],
    });

    const headers = original.data.payload?.headers || [];
    const origMessageId = headers.find(h => h.name === "Message-ID")?.value || "";
    let references = headers.find(h => h.name === "References")?.value || "";
    if (origMessageId) references += (references ? " " : "") + origMessageId;
    
    let subject = headers.find(h => h.name === "Subject")?.value || "";
    if (!subject.startsWith("Re:")) {
      subject = `Re: ${subject}`;
    }
    
    // The "From" of the original is the "To" of our reply
    const to = headers.find(h => h.name === "From")?.value || "";

    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `In-Reply-To: ${origMessageId}`,
      `References: ${references}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      "",
      body,
    ];

    const rawMessage = emailLines.join("\r\n");
    const encodedMessage = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
        threadId: original.data.threadId,
      },
    });

    return {
      success: true,
      messageId: res.data.id || "unknown",
    };
  } catch (error) {
    console.error("Error replying to email:", error);
    throw new Error("Failed to reply to email");
  }
}
