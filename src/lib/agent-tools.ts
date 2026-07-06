import { getUnreadEmails } from "./gmail";
import { getTodaySchedule, getUpcomingEvents, createEvent } from "./calendar";

// Tool definitions for the LLM
export const tools = [
  {
    type: "function",
    function: {
      name: "getUnreadEmails",
      description: "Fetch unread emails from Dr. Mehjabeen's inbox. Returns sender, subject, and snippet.",
      parameters: {
        type: "object",
        properties: {
          maxResults: { type: "number", description: "Max emails to fetch (default 5)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTodaySchedule",
      description: "Get all of Dr. Mehjabeen's calendar events for today",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getUpcomingEvents",
      description: "Get calendar events for the next N days",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Number of days to look ahead" },
        },
        required: ["days"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createEvent",
      description: "Create a new event on Dr. Mehjabeen's primary calendar",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          startTime: { type: "string", description: "ISO 8601 datetime in local time without timezone offset (e.g., 2026-07-07T15:00:00)" },
          endTime: { type: "string", description: "ISO 8601 datetime in local time without timezone offset (e.g., 2026-07-07T16:00:00)" },
          description: { type: "string" },
        },
        required: ["title", "startTime", "endTime"],
      },
    },
  },
];

// Tool router
export async function executeToolCall(name: string, args: any): Promise<any> {
  console.log(`Executing tool: ${name}`, args);
  try {
    switch (name) {
      case "getUnreadEmails":
        return await getUnreadEmails(args.maxResults || 5);
      case "getTodaySchedule":
        return await getTodaySchedule();
      case "getUpcomingEvents":
        return await getUpcomingEvents(args.days || 3);
      case "createEvent":
        return await createEvent({
          title: args.title,
          startTime: args.startTime,
          endTime: args.endTime,
          description: args.description,
        });
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (error: any) {
    console.error(`Tool execution error [${name}]:`, error);
    return { error: error.message };
  }
}
