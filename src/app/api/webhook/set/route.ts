import { NextResponse } from "next/server";
import { setWebhook } from "@/lib/telegram";

/**
 * GET /api/webhook/set
 *
 * Hit this endpoint once after each ngrok restart (or on first Vercel deploy)
 * to register the webhook URL with Telegram.
 */
export async function GET() {
  const webhookUrl = process.env.WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json(
      { error: "WEBHOOK_URL environment variable is not set" },
      { status: 500 }
    );
  }

  const result = await setWebhook(webhookUrl);
  return NextResponse.json({
    message: "Webhook registration attempted",
    telegramResponse: JSON.parse(result),
  });
}
