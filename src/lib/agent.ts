import { tools, executeToolCall } from "./agent-tools";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const LLM_MODEL = process.env.LLM_MODEL || "meta-llama/llama-4-scout";

const SYSTEM_PROMPT = `You are the personal AI assistant for Dr. Melita Mehjabeen.
Current date/time (Bangladesh Standard Time): ${new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" })}

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
- DO NOT ask for confirmation when she asks to schedule something. Just execute the tool and tell her it's done.
- IMPORTANT: All times must be in Bangladesh Standard Time (BST). When creating events, omit the timezone offset (e.g., 2026-07-07T15:00:00) as the backend automatically handles the Dhaka timezone.
- If she speaks in Bangla, respond in Bangla

You have access to tools to read her emails and manage her calendar. 
Use them whenever she asks about her schedule or inbox!`;

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

/**
 * Main agent loop: Sends message to LLM, handles tool calls iteratively, returns final text.
 */
export async function runAgent(userMessage: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  let iterations = 0;
  const MAX_ITERATIONS = 4;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    console.log(`LLM Request (Iteration ${iterations})`);
    
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
