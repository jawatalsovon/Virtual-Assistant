import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/gmail";

export async function GET() {
  try {
    const res = await sendEmail("jawatalsovon@gmail.com", "Test from API", "Test body");
    return NextResponse.json({ success: true, res });
  } catch (error: any) {
    console.error("Test email API error:", error);
    return NextResponse.json({ 
      error: error.message, 
      details: error.response?.data || error.stack 
    }, { status: 500 });
  }
}
