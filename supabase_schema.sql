-- ==========================================
-- 1. NextAuth Schema (Required by @auth/supabase-adapter)
-- ==========================================
CREATE SCHEMA IF NOT EXISTS next_auth;

CREATE TABLE IF NOT EXISTS next_auth.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  email text,
  "emailVerified" timestamp with time zone,
  image text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT email_unique UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS next_auth.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  provider text NOT NULL,
  "providerAccountId" text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  oauth_token_secret text,
  oauth_token text,
  refresh_token_expires_in bigint,
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT provider_unique UNIQUE (provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS next_auth.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  expires timestamp with time zone NOT NULL,
  "sessionToken" text NOT NULL,
  "userId" uuid NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessiontoken_unique UNIQUE ("sessionToken")
);

CREATE TABLE IF NOT EXISTS next_auth.verification_tokens (
  identifier text,
  token text,
  expires timestamp with time zone NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ==========================================
-- 2. Custom Application Tables
-- ==========================================
-- Conversations table: stores sessions per user
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES next_auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages table: stores all messages in a conversation
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT,
  tool_calls JSONB,          -- stores LLM tool_call responses
  tool_call_id TEXT,          -- for tool response messages
  name TEXT,                  -- tool name for tool responses
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Telegram mapping: links Telegram chat_id to Supabase user
CREATE TABLE IF NOT EXISTS public.telegram_mappings (
  telegram_chat_id BIGINT PRIMARY KEY,
  user_id UUID REFERENCES next_auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notes table: stores user quick notes
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES next_auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  topic TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks table: stores user tasks with categories and completion state
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES next_auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  is_done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 3. Row Level Security & Policies
-- ==========================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see their own data
CREATE POLICY "Users own conversations" ON public.conversations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own notes" ON public.notes
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own tasks" ON public.tasks
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own messages" ON public.messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE user_id = auth.uid()
    )
  );

-- To let the server (using service role key) do everything, we don't strictly need more policies,
-- but if we query with service_role, RLS is bypassed. 

-- ==========================================
-- 4. Permissions for next_auth schema
-- ==========================================
GRANT USAGE ON SCHEMA next_auth TO service_role;
GRANT ALL ON SCHEMA next_auth TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA next_auth TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA next_auth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA next_auth TO service_role;
GRANT USAGE ON SCHEMA next_auth TO postgres;
GRANT ALL ON SCHEMA next_auth TO postgres;
