import { google } from "googleapis";
import { getAuthClient } from "./google-auth";
import type { CalendarEvent, NewEvent } from "./types";

/**
 * Get today's calendar events
 */
export async function getTodaySchedule(userId: string): Promise<CalendarEvent[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return fetchEvents(userId, startOfDay.toISOString(), endOfDay.toISOString());
}

/**
 * Get upcoming events for the next N days
 */
export async function getUpcomingEvents(userId: string, days: number): Promise<CalendarEvent[]> {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + days);
  end.setHours(23, 59, 59, 999);

  return fetchEvents(userId, start.toISOString(), end.toISOString());
}

/**
 * Core fetch function
 */
async function fetchEvents(userId: string, timeMin: string, timeMax: string): Promise<CalendarEvent[]> {
  const auth = await getAuthClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  try {
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      maxResults: 20,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = res.data.items || [];

    return events.map(event => ({
      id: event.id || undefined,
      title: event.summary || "Untitled Event",
      start: event.start?.dateTime || event.start?.date || "",
      end: event.end?.dateTime || event.end?.date || "",
      location: event.location || undefined,
      description: event.description || undefined,
    }));
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    throw new Error("Failed to fetch calendar events");
  }
}

/**
 * Create a new calendar event
 */
export async function createEvent(userId: string, eventDetails: NewEvent): Promise<CalendarEvent> {
  const auth = await getAuthClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  try {
    const res = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: eventDetails.title,
        description: eventDetails.description,
        start: {
          dateTime: eventDetails.startTime,
          timeZone: "Asia/Dhaka",
        },
        end: {
          dateTime: eventDetails.endTime,
          timeZone: "Asia/Dhaka",
        },
      },
    });

    const event = res.data;
    
    return {
      id: event.id || undefined,
      title: event.summary || "Untitled Event",
      start: event.start?.dateTime || event.start?.date || "",
      end: event.end?.dateTime || event.end?.date || "",
      description: event.description || undefined,
    };
  } catch (error) {
    console.error("Error creating calendar event:", error);
    throw new Error("Failed to create calendar event");
  }
}
