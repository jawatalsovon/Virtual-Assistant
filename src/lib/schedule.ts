import { getAuthClient } from "./google-auth";
import { google } from "googleapis";

export interface TimeSlot {
  start: string;
  end: string;
}

/**
 * Finds available free time slots on a specific date for a given duration.
 * Assumes working hours are 09:00 to 18:00 (Bangladesh Standard Time).
 */
export async function findAvailableSlots(
  userId: string,
  dateString: string, // e.g., "2026-07-08"
  durationMinutes: number
): Promise<TimeSlot[]> {
  const auth = await getAuthClient(userId);
  const calendar = google.calendar({ version: "v3", auth });

  // Define working hours for the given date
  const startOfDay = new Date(`${dateString}T09:00:00+06:00`); // 9 AM BST
  const endOfDay = new Date(`${dateString}T18:00:00+06:00`);   // 6 PM BST

  try {
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = res.data.items || [];
    
    // Sort events by start time just to be safe
    events.sort((a, b) => {
      const aStart = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
      const bStart = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
      return aStart - bStart;
    });

    const availableSlots: TimeSlot[] = [];
    let currentTime = startOfDay.getTime();
    const durationMs = durationMinutes * 60 * 1000;

    for (const event of events) {
      const eventStart = new Date(event.start?.dateTime || event.start?.date || 0).getTime();
      const eventEnd = new Date(event.end?.dateTime || event.end?.date || 0).getTime();

      // If there is enough time between currentTime and eventStart
      if (eventStart - currentTime >= durationMs) {
        availableSlots.push({
          start: new Date(currentTime).toISOString(),
          end: new Date(eventStart).toISOString(),
        });
      }

      // Move currentTime to the end of the event (or keep it if events overlap)
      currentTime = Math.max(currentTime, eventEnd);
    }

    // Check if there is time after the last event until the end of the day
    if (endOfDay.getTime() - currentTime >= durationMs) {
      availableSlots.push({
        start: new Date(currentTime).toISOString(),
        end: endOfDay.toISOString(),
      });
    }

    return availableSlots;
  } catch (error) {
    console.error("Error finding available slots:", error);
    throw new Error("Failed to find available slots on calendar.");
  }
}
