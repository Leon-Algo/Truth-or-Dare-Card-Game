
import { createClient } from '@supabase/supabase-js';

// --- Supabase Setup ---
// I've extracted your Supabase Project URL from the database string you provided.
const supabaseUrl = 'https://pmwkjgxqydlxjctcqngy.supabase.co';

// --- ⚠️ ACTION REQUIRED! ---
// You still need to provide your Supabase "anon" key.
// 1. Go to your Supabase project dashboard.
// 2. Go to Project Settings > API.
// 3. Find your "Project API keys" and copy the "anon" (public) key.
// 4. Paste the key below, replacing 'YOUR_SUPABASE_ANON_KEY'.
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

// Check if the key is missing, but don't crash the app.
if (!supabaseUrl || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  console.warn("Supabase Anon Key is not configured in lib/supabase.ts. Real-time features will not work until this is fixed.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/*
-- Run this SQL in your Supabase SQL Editor to set up the table and functions.

-- 1. Create the rooms table (if you haven't already)
CREATE TABLE rooms (
  room_id TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Enable real-time updates on the table
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- 3. Set up Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (replace existing policies if you have them)
-- This allows anyone to see, create, or update rooms.
-- For a production app, you would want more restrictive policies.
DROP POLICY IF EXISTS "Public access for rooms" ON rooms;
CREATE POLICY "Public access for rooms"
  ON rooms FOR ALL
  USING ( true )
  WITH CHECK ( true );

-- 5. Create the database functions for atomic operations (RPCs)
-- This is the key to preventing race conditions.

-- Function to join a room and increment player count
CREATE OR REPLACE FUNCTION join_room(p_room_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  updated_state JSONB;
BEGIN
  UPDATE rooms
  SET state = jsonb_set(state, '{playerCount}', (state->>'playerCount')::INT + 1)
  WHERE room_id = p_room_id
  RETURNING state INTO updated_state;
  
  RETURN updated_state;
END;
$$;

-- Function to leave a room and decrement player count
CREATE OR REPLACE FUNCTION leave_room(p_room_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  updated_state JSONB;
BEGIN
  UPDATE rooms
  SET state = jsonb_set(state, '{playerCount}', GREATEST(0, (state->>'playerCount')::INT - 1))
  WHERE room_id = p_room_id
  RETURNING state INTO updated_state;
  
  RETURN updated_state;
END;
$$;

-- Function to submit a question
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

-- Function to start the game
CREATE OR REPLACE FUNCTION start_game(p_room_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE rooms
  SET state = jsonb_set(state, '{status}', '"playing"')
  WHERE room_id = p_room_id;
END;
$$;

-- Function to draw a question (the most complex one)
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
  -- Select the current state for the given room
  SELECT state INTO current_state FROM rooms WHERE room_id = p_room_id;

  -- Get the questions array
  questions_array := current_state->'questions';

  -- If there are questions to draw
  IF jsonb_array_length(questions_array) > 0 THEN
    -- Pick a random index
    question_index := floor(random() * jsonb_array_length(questions_array));
    
    -- Get the question at that index
    question_to_draw := questions_array->question_index;
    
    -- Remove the question from the 'questions' array
    current_state := jsonb_set(
      current_state,
      '{questions}',
      (SELECT jsonb_agg(elem) FROM jsonb_array_elements(questions_array) WITH ORDINALITY AS t(elem, idx) WHERE idx != question_index + 1)
    );

    -- Add the question to the 'usedQuestions' array
    current_state := jsonb_set(
      current_state,
      '{usedQuestions}',
      current_state->'usedQuestions' || question_to_draw
    );

    -- Set the 'currentQuestion'
    current_state := jsonb_set(
      current_state,
      '{currentQuestion}',
      question_to_draw
    );
  ELSE
    -- If no questions are left, end the game
    current_state := jsonb_set(
      current_state,
      '{status}',
      '"ended"'
    );
  END IF;

  -- Update the room with the new state
  UPDATE rooms SET state = current_state WHERE room_id = p_room_id;
END;
$$;

*/
