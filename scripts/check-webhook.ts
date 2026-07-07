import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function checkWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("No TELEGRAM_BOT_TOKEN");
    return;
  }
  
  const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
  const data = await res.json();
  console.log("Webhook Info:", JSON.stringify(data, null, 2));
}

checkWebhook();
