import { NextResponse } from "next/server";
import { getUnreadEmails } from "@/lib/gmail";
import { getTodaySchedule } from "@/lib/calendar";

export async function GET() {
  try {
    console.log("Testing Gmail API...");
    const emails = await getUnreadEmails(3);
    console.log(`Found ${emails.length} unread important emails.`);
    emails.forEach(e => console.log(`- [${e.sender}] ${e.subject}`));

    console.log("\nTesting Calendar API...");
    const schedule = await getTodaySchedule();
    console.log(`Found ${schedule.length} events today.`);
    schedule.forEach(e => console.log(`- ${e.title} (${e.start} to ${e.end})`));

    return NextResponse.json({
      success: true,
      emails,
      schedule,
    });
  } catch (error: unknown) {
    console.error("Test Google API error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
