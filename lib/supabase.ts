
import { createClient } from '@supabase/supabase-js';

// --- Supabase Setup ---

// User provided configuration
const supabaseUrl = 'https://wiafjgjfdrajlxnlkray.supabase.co';
const supabaseAnonKey = 'sb_publishable_EvEX2Hlp9e7SU4FcbpIrzQ_uusY6M87';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/*
  !!! IMPORTANT: DATABASE INITIALIZATION REQUIRED (UPDATED) !!!

  If you saw the error "relation 'rooms' is already member of publication...", 
  it means part of the setup is already done, but the functions might be missing.
  
  Run this NEW script below. It is safe to run multiple times.

  1. Go to https://supabase.com/dashboard/project/wiafjgjfdrajlxnlkray/sql
  2. Create a NEW query.
  3. Paste and RUN the script below:
  
  --------------------------------------------------------------------------

  -- 1. Create the rooms table
  CREATE TABLE IF NOT EXISTS rooms (
    room_id TEXT PRIMARY KEY,
    state JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
  );

  -- 2. Enable real-time updates (SAFE MODE)
  -- This block checks if 'rooms' is already in the publication to avoid errors.
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'rooms'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
    END IF;
  END
  $$;

  -- 3. Set up Row Level Security (RLS)
  ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

  -- 4. Create Policies
  DROP POLICY IF EXISTS "Public access for rooms" ON rooms;
  CREATE POLICY "Public access for rooms"
    ON rooms FOR ALL
    USING ( true )
    WITH CHECK ( true );

  -- 5. Create Atomic Functions (Backend Logic)
  -- These use CREATE OR REPLACE, so they will update existing functions safely.

  -- Function: Join Room
  CREATE OR REPLACE FUNCTION join_room(p_room_id TEXT)
  RETURNS JSONB
  LANGUAGE plpgsql
  AS $$
  DECLARE
    updated_state JSONB;
  BEGIN
    UPDATE rooms
    SET state = jsonb_set(state, '{playerCount}', to_jsonb((state->>'playerCount')::INT + 1))
    WHERE room_id = p_room_id
    RETURNING state INTO updated_state;
    
    RETURN updated_state;
  END;
  $$;

  -- Function: Leave Room
  CREATE OR REPLACE FUNCTION leave_room(p_room_id TEXT)
  RETURNS JSONB
  LANGUAGE plpgsql
  AS $$
  DECLARE
    updated_state JSONB;
  BEGIN
    UPDATE rooms
    SET state = jsonb_set(state, '{playerCount}', to_jsonb(GREATEST(0, (state->>'playerCount')::INT - 1)))
    WHERE room_id = p_room_id
    RETURNING state INTO updated_state;
    
    RETURN updated_state;
  END;
  $$;

  -- Function: Submit Question
  CREATE OR REPLACE FUNCTION submit_question(p_room_id TEXT, p_question TEXT)
  RETURNS VOID
  LANGUAGE plpgsql
  AS $$
  BEGIN
    UPDATE rooms
    SET state = jsonb_set(state, '{questions}', state->'questions' || to_jsonb(p_question))
    WHERE room_id = p_room_id;
  END;
  $$;

  -- Function: Start Game
  CREATE OR REPLACE FUNCTION start_game(p_room_id TEXT)
  RETURNS VOID
  LANGUAGE plpgsql
  AS $$
  BEGIN
    UPDATE rooms
    SET state = jsonb_set(state, '{status}', to_jsonb('playing'::text))
    WHERE room_id = p_room_id;
  END;
  $$;

  -- Function: Draw Question
  CREATE OR REPLACE FUNCTION draw_question(p_room_id TEXT)
  RETURNS VOID
  LANGUAGE plpgsql
  AS $$
  DECLARE
    current_state JSONB;
    questions_array JSONB;
    question_to_draw JSONB;
    question_index INT;
  BEGIN
    SELECT state INTO current_state FROM rooms WHERE room_id = p_room_id;
    questions_array := current_state->'questions';

    IF jsonb_array_length(questions_array) > 0 THEN
      -- Pick random index
      question_index := floor(random() * jsonb_array_length(questions_array));
      question_to_draw := questions_array->question_index;
      
      -- Remove from questions
      current_state := jsonb_set(
        current_state,
        '{questions}',
        COALESCE(
          (SELECT jsonb_agg(elem) FROM jsonb_array_elements(questions_array) WITH ORDINALITY AS t(elem, idx) WHERE idx != question_index + 1),
          '[]'::jsonb
        )
      );
      
      -- Add to usedQuestions
      current_state := jsonb_set(
        current_state,
        '{usedQuestions}',
        (current_state->'usedQuestions') || question_to_draw
      );
      
      -- Set currentQuestion
      current_state := jsonb_set(
        current_state,
        '{currentQuestion}',
        question_to_draw
      );
    ELSE
      -- End game if empty
      current_state := jsonb_set(current_state, '{status}', to_jsonb('ended'::text));
    END IF;

    UPDATE rooms SET state = current_state WHERE room_id = p_room_id;
  END;
  $$;
*/
