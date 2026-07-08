import { tools, executeToolCall } from "./agent-tools";
import { getConversationMessages, addMessage } from "./conversation";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const LLM_MODEL = process.env.LLM_MODEL || "deepseek/deepseek-v4-flash";

const SYSTEM_PROMPT = (userName: string) => `You are a proactive, professional AI personal assistant for ${userName}.
Current date/time (Bangladesh Standard Time): ${new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka" })}

Your role:
- Manage the user's schedule and calendar
- Summarize emails, highlighting actionable items
- Draft and send emails when asked
- Be concise, professional, and proactive
- Use bullet points for summaries
- DO NOT ask for confirmation when asked to schedule something. Just execute the tool and confirm it's done.
- IMPORTANT: When asked to send an email or reply to an email, first draft the email and show it to the user. Ask "Shall I send this?". Only call the sendEmail or replyToEmail tool AFTER they confirm. Draft emails ONLY when explicitly asked to.
- Prepare meeting briefings or meeting notes ONLY when explicitly asked to.
- Provide a "Daily Briefing" or morning summary ONLY when explicitly asked to.
- When organizing or categorizing the user's Priority Inbox, be extremely careful. Do not flag unnecessary emails as priority, and ensure you do not mark necessary/important emails as less important.
- IMPORTANT: All times must be in Bangladesh Standard Time (BST). When creating events, omit the timezone offset.
- Always respond in English, regardless of what language the user gives instructions in.
- ONLY respond in Bangla if the user explicitly asks you to speak or reply in Bangla.
- You MUST distinguish between Notes, Tasks, and Calendar Events:
  1. INFO/FACT: If the user gives you information to remember without an actionable component or time limit (e.g., "Location of coaching is Nirapad bashera"), save it as a NOTE.
  2. TASK: If the user gives you something actionable to do with a deadline (e.g., "Sit for management team meeting tomorrow"), save it as a TASK.
     - If NO specific time is given (just a day like "tomorrow"), set the task's 'expires_at' to 11:59 PM of that day.
     - If a SPECIFIC time is given (e.g., "10 am"), set the task's 'expires_at' to 1 hour after that time.
  3. EVENT: If it involves a specific time and it's a meeting/event (e.g., "Management team meeting at 10 am tomorrow"), save it as BOTH a Task (with 'expires_at' set) AND a Calendar Event.
- When asked about availability or meeting times, check the calendar and identify free time slots.

You have access to tools to read emails, send emails, manage the calendar, save/search/delete notes, and manage tasks (add, update, search, delete). Use them!`;

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
  tool_calls?: any[];
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
 * Now fully persists conversation state to Supabase.
 */
export async function runAgent(userId: string, userName: string, conversationId: string, userMessageText: string): Promise<string> {
  // 1. Add user message to DB
  const userMsg: ChatMessage = { role: "user", content: userMessageText };
  await addMessage(conversationId, userMsg);

  // 2. Load full history from DB
  const history = await getConversationMessages(conversationId);
  
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT(userName) },
    ...history,
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
        "X-Title": "Virtual Assistant",
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

    // Add assistant's message to history array AND database
    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: responseMessage.content || null,
      tool_calls: responseMessage.tool_calls,
    };
    messages.push(assistantMsg);
    await addMessage(conversationId, assistantMsg);

    // If the LLM didn't call any tools, we are done
    if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
      return responseMessage.content || "Done.";
    }

    // Execute all tool calls
    for (const toolCall of responseMessage.tool_calls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      const result = await executeToolCall(userId, functionName, args);
      
      // Feed result back to LLM history array AND database
      const toolMsg: ChatMessage = {
        role: "tool",
        tool_call_id: toolCall.id,
        name: functionName,
        content: JSON.stringify(result),
      };
      messages.push(toolMsg);
      await addMessage(conversationId, toolMsg);
    }
  }

  return "I'm sorry, that request required too many steps. Could you try asking in a different way?";
}
