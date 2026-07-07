import { google } from "googleapis";
import { getAuthClient } from "./google-auth";

export interface ContactInfo {
  name: string;
  email: string;
}

/**
 * Searches the user's Google Contacts for a given query.
 */
export async function searchContacts(userId: string, query: string): Promise<ContactInfo[]> {
  const auth = await getAuthClient(userId);
  const people = google.people({ version: "v1", auth });

  try {
    const res = await people.people.searchContacts({
      query,
      readMask: "names,emailAddresses",
      pageSize: 5,
    });

    const results: ContactInfo[] = [];

    const connections = res.data.results || [];
    for (const match of connections) {
      const person = match.person;
      if (!person) continue;

      const name = person.names?.[0]?.displayName || "Unknown Name";
      const email = person.emailAddresses?.[0]?.value;

      if (email) {
        results.push({ name, email });
      }
    }

    return results;
  } catch (error) {
    console.error("Error searching contacts:", error);
    throw new Error("Failed to search contacts.");
  }
}
