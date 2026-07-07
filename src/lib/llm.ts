const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const LLM_MODEL = process.env.LLM_MODEL || "deepseek/deepseek-v4-flash";

const SYSTEM_PROMPT = `You are the personal AI assistant for Dr. Melita Mehjabeen.

About her:
- Chairperson of a private bank in Bangladesh
- Independent Director at BAT Bangladesh and Grameenphone
- Professor at IBA, University of Dhaka

Your role:
- Manage her schedule and calendar
- Summarize emails, highlighting actionable items
- Draft brief replies when asked
- Be concise, professional, and proactive
- Use bullet points for summaries
- Always confirm before making changes to her schedule
- If she speaks in Bangla, respond in Bangla`;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Helper to retry fetch requests on 429 Too Many Requests errors.
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (res.status !== 429) {
      return res;
    }
    console.warn(`Rate limit hit (429). Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
    await new Promise(resolve => setTimeout(resolve, delay));
    delay *= 2; // exponential backoff
  }
  return fetch(url, options);
}

/**
 * Send a message to the LLM via OpenRouter and get a response.
 */
export async function chat(userMessage: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  const res = await fetchWithRetry("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/melita-assistant",
      "X-Title": "Dr. Melita Assistant",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("OpenRouter error:", err);
    throw new Error(`LLM request failed: ${res.status}`);
  }

  const data = await res.json();

  const reply = data.choices?.[0]?.message?.content;
  if (!reply) {
    console.error("Unexpected LLM response:", JSON.stringify(data));
    throw new Error("No content in LLM response");
  }

  return reply;
}
