// Telegram types (Phase 1 — text messages only; voice added in Phase 2)

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
  voice?: TelegramVoice;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface EmailSummary {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  date: string;
}

export interface CalendarEvent {
  id?: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  attendees?: string[];
  description?: string;
}

export interface NewEvent {
  title: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
  description?: string;
}
