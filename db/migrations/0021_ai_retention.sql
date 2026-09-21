CREATE TABLE ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_hash text NOT NULL UNIQUE CHECK (length(session_hash) = 64),
  locale text NOT NULL DEFAULT 'de' CHECK (locale IN ('de', 'en', 'uk')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_messages (
  id bigserial PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  token_count integer NOT NULL DEFAULT 0 CHECK (token_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_conversations_expiry_idx ON ai_conversations (expires_at);
CREATE INDEX ai_messages_conversation_created_idx ON ai_messages (conversation_id, created_at DESC, id DESC);
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ai_conversations, ai_messages FROM anon, authenticated, PUBLIC;
GRANT ALL ON ai_conversations, ai_messages TO service_role;
