import { getUnreadEmails, sendEmail, getEmailThread, replyToEmail } from "./gmail";
import { saveNote, searchNotes } from "./notes";
import { getTodaySchedule, getUpcomingEvents, createEvent } from "./calendar";
import { searchContacts } from "./contacts";
import { findAvailableSlots } from "./schedule";
import { addTask, getTasks, updateTask, deleteTask, deleteNoteByContent } from "./tasks";

// Tool definitions for the LLM
export const tools = [
  {
    type: "function",
    function: {
      name: "getUnreadEmails",
      description: "Fetch unread emails from the user's inbox. Returns sender, subject, and snippet.",
      parameters: {
        type: "object",
        properties: {
          maxResults: { type: "number", description: "Max emails to fetch (default 5)" },
          query: { type: "string", description: "Optional Gmail search query (e.g., 'from:someone@example.com')" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTodaySchedule",
      description: "Get all of the user's calendar events for today",
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
      description: "Create a new event on the user's primary calendar",
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
  {
    type: "function",
    function: {
      name: "sendEmail",
      description: "Send an email from the user's Gmail account. IMPORTANT: Before calling this tool, you MUST first show the user the draft email (to, subject, body) in your response and ask for confirmation. Only call this tool AFTER the user confirms.",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject line" },
          body: { type: "string", description: "Email body text" },
        },
        required: ["to", "subject", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getEmailThread",
      description: "Get the full text of an email thread for context.",
      parameters: {
        type: "object",
        properties: {
          messageId: { type: "string", description: "The ID of a message in the thread" },
        },
        required: ["messageId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "replyToEmail",
      description: "Reply to an existing email. IMPORTANT: Before calling this tool, you MUST first show the user the draft reply (body) in your response and ask for confirmation. Only call this tool AFTER the user confirms.",
      parameters: {
        type: "object",
        properties: {
          messageId: { type: "string", description: "The ID of the message to reply to" },
          body: { type: "string", description: "The reply body text" },
        },
        required: ["messageId", "body"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchContacts",
      description: "Search the user's Google Contacts by name to find their email address. Use this when the user asks to email someone but doesn't provide the email address.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The name to search for" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "findAvailableSlots",
      description: "Find available free time slots on a specific date for a given duration.",
      parameters: {
        type: "object",
        properties: {
          dateString: { type: "string", description: "The date to check in YYYY-MM-DD format (e.g. '2026-07-08')" },
          durationMinutes: { type: "number", description: "The duration of the meeting in minutes (default 30)" },
        },
        required: ["dateString"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "saveNote",
      description: "Save a quick note or reminder for the user to remember later.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "The content of the note" },
          topic: { type: "string", description: "A short 1-2 word topic category for the note (e.g. 'Work', 'Ideas', 'Shopping', 'Reminders')" }
        },
        required: ["content", "topic"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchNotes",
      description: "Search the user's saved notes by text query.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The text to search for in notes" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deleteNote",
      description: "Delete a note. Use when the user asks to delete or remove a specific note. Search by the note's content keywords.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Keywords from the note's content to identify which note to delete" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "addTask",
      description: "Add a new task or to-do item for the user.",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "The task description" },
          category: { type: "string", description: "A short 1-2 word category for the task (e.g. 'Work', 'Shopping', 'Personal', 'Study')" },
          expires_at: { type: "string", description: "Optional ISO 8601 timestamp for when the task should automatically be deleted." },
        },
        required: ["content", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getTasks",
      description: "Retrieve and search the user's tasks. Use when asked to show tasks or find a specific task.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Optional keyword to search tasks. Leave empty to get all tasks." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "updateTask",
      description: "Update a task - mark it done/undone, edit its content, or change its category. You MUST call getTasks first to get the task ID.",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "The UUID of the task to update" },
          content: { type: "string", description: "New content for the task (optional)" },
          is_done: { type: "boolean", description: "Mark task as done (true) or not done (false)" },
          category: { type: "string", description: "New category for the task (optional)" },
        },
        required: ["taskId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deleteTask",
      description: "Delete a task permanently. You MUST call getTasks first to get the task ID.",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string", description: "The UUID of the task to delete" },
        },
        required: ["taskId"],
      },
    },
  },
];

// Tool router
export async function executeToolCall(userId: string, name: string, args: Record<string, unknown>): Promise<unknown> {
  console.log(`Executing tool: ${name}`, args);
  try {
    switch (name) {
      case "getUnreadEmails":
        return await getUnreadEmails(userId, (args.maxResults as number) || 5, args.query as string || "");
      case "getTodaySchedule":
        return await getTodaySchedule(userId);
      case "getUpcomingEvents":
        return await getUpcomingEvents(userId, (args.days as number) || 3);
      case "createEvent":
        return await createEvent(userId, {
          title: args.title as string,
          startTime: args.startTime as string,
          endTime: args.endTime as string,
          description: args.description as string,
        });
      case "sendEmail":
        return await sendEmail(
          userId,
          args.to as string,
          args.subject as string,
          args.body as string,
        );
      case "getEmailThread":
        return await getEmailThread(userId, args.messageId as string);
      case "replyToEmail":
        return await replyToEmail(userId, args.messageId as string, args.body as string);
      case "searchContacts":
        return await searchContacts(userId, args.query as string);
      case "findAvailableSlots":
        return await findAvailableSlots(userId, args.dateString as string, (args.durationMinutes as number) || 30);
      case "saveNote":
        return await saveNote(userId, args.content as string, args.topic as string);
      case "searchNotes":
        return await searchNotes(userId, args.query as string);
      case "deleteNote":
        return await deleteNoteByContent(userId, args.query as string);
      case "addTask":
        return await addTask(userId, args.content as string, args.category as string, args.expires_at as string | undefined);
      case "getTasks":
        return await getTasks(userId, args.query as string);
      case "updateTask":
        return await updateTask(userId, args.taskId as string, {
          content: args.content as string | undefined,
          is_done: args.is_done as boolean | undefined,
          category: args.category as string | undefined,
        });
      case "deleteTask":
        return await deleteTask(userId, args.taskId as string);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (error: unknown) {
    console.error(`Tool execution error [${name}]:`, error);
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}
