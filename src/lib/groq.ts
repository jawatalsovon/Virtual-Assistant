const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

/**
 * Download a voice note from Telegram and transcribe it via Groq Whisper.
 *
 * Flow: file_id → Telegram getFile → download .ogg → POST to Groq → transcript
 */
export async function transcribeAudio(fileId: string): Promise<string> {
  // Step 1: Get the file path from Telegram
  const fileInfoRes = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`
  );
  const fileInfo = await fileInfoRes.json();

  if (!fileInfo.ok || !fileInfo.result?.file_path) {
    throw new Error(`Failed to get file info: ${JSON.stringify(fileInfo)}`);
  }

  const filePath = fileInfo.result.file_path;

  // Step 2: Download the audio file into memory
  const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
  const audioRes = await fetch(fileUrl);

  if (!audioRes.ok) {
    throw new Error(`Failed to download audio: ${audioRes.status}`);
  }

  const audioBuffer = await audioRes.arrayBuffer();

  // Step 3: Send to Groq Whisper for transcription
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([audioBuffer], { type: "audio/ogg" }),
    "voice.ogg"
  );
  formData.append("model", "whisper-large-v3");
  // Don't set language — Whisper auto-detects (supports Bangla natively)

  const transcriptionRes = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
    }
  );

  if (!transcriptionRes.ok) {
    const err = await transcriptionRes.text();
    throw new Error(`Groq transcription failed: ${err}`);
  }

  const result = await transcriptionRes.json();
  return result.text;
}
