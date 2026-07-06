const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Send a text message to a Telegram chat.
 */
export async function sendMessage(chatId: number, text: string): Promise<void> {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Telegram sendMessage failed:", err);
  }
}

/**
 * Register a webhook URL with Telegram.
 * Call once after each ngrok restart or on first Vercel deploy.
 */
export async function setWebhook(url: string): Promise<string> {
  const webhookUrl = `${url}/api/webhook`;
  const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl }),
  });

  const data = await res.json();
  console.log("setWebhook response:", data);
  return JSON.stringify(data);
}
