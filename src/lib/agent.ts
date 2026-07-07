import { tools, executeToolCall } from "./agent-tools";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const LLM_MODEL = process.env.LLM_MODEL || "deepseek/deepseek-v4-flash";

const SYSTEM_PROMPT = `You are the personal AI assistant for Dr. Melita Mehjabeen.
Current date/time (Bangladesh Standard Time): ${new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" })}

About her:
- Chairperson of a private bank in Bangladesh
- Independent Director at BAT Bangladesh and Grameenphone
- Professor at IBA, University of Dhaka

Your role:
- Manage her schedule and calendar
- Summarize emails, highlighting actionable items
- Draft and send emails when asked
- Be concise, professional, and proactive
- Use bullet points for summaries
- DO NOT ask for confirmation when she asks to schedule something. Just execute the tool and tell her it's done.
- IMPORTANT: When she asks you to send an email, first draft the email and show it to her. Ask "Shall I send this?". Only call the sendEmail tool AFTER she confirms (says yes, send it, go ahead, etc.).
- IMPORTANT: All times must be in Bangladesh Standard Time (BST). When creating events, omit the timezone offset (e.g., 2026-07-07T15:00:00) as the backend automatically handles the Dhaka timezone.
- If she speaks in Bangla, respond in Bangla

You have access to tools to read her emails, send emails, and manage her calendar.
Use them whenever she asks about her schedule, inbox, or wants to send an email!`;

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
  tool_calls?: unknown[];
  tool_call_id?: string;
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
 * Main agent loop: Sends message to LLM, handles tool calls iteratively, returns final text.
 * Accepts optional conversation history for multi-turn flows (e.g., email confirmation).
 */
export async function runAgent(userMessage: string, conversationHistory: ChatMessage[] = []): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  let iterations = 0;
  const MAX_ITERATIONS = 4;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    console.log(`LLM Request (Iteration ${iterations})`);
    
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
        tools,
        tool_choice: "auto",
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("OpenRouter error:", err);
      throw new Error(`LLM request failed: ${res.status}`);
    }

    const data = await res.json();
    const responseMessage = data.choices?.[0]?.message;

    if (!responseMessage) {
      throw new Error("No content in LLM response");
    }

    // Add assistant's message to history
    messages.push({
      role: "assistant",
      content: responseMessage.content || null,
      tool_calls: responseMessage.tool_calls,
    });

    // If the LLM didn't call any tools, we are done
    if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
      return responseMessage.content || "Done.";
    }

    // Execute all tool calls
    for (const toolCall of responseMessage.tool_calls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      const result = await executeToolCall(functionName, args);
      
      // Feed result back to LLM
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: functionName,
        content: JSON.stringify(result),
      });
    }
  }

  return "I'm sorry, that request required too many steps. Could you try asking in a different way?";
}
