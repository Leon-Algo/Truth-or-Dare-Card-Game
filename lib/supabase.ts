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

// A check to prevent the app from crashing if the key is missing.
if (!supabaseUrl || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="font-family: sans-serif; padding: 2rem; background-color: #fff3f3; border: 1px solid #ffcccc; border-radius: 8px; max-width: 600px; margin: 4rem auto; line-height: 1.6;">
        <h1 style="color: #cc0000;">Configuration Error</h1>
        <p>Your Supabase Anon Key is missing. Please follow these steps:</p>
        <ol>
          <li>Open the file: <code>lib/supabase.ts</code></li>
          <li>Find the line: <code>const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';</code></li>
          <li>Replace <code>'YOUR_SUPABASE_ANON_KEY'</code> with your actual Supabase "anon" public key from your project's API settings.</li>
        </ol>
      </div>
    `;
  }
  // Throw an error to stop the rest of the script from executing.
  throw new Error("Supabase anon key is not configured. Please check lib/supabase.ts");
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/*
-- 2. SQL to create your 'rooms' table in the Supabase SQL Editor:
-- Make sure to enable RLS (Row Level Security) on the table if it's not already.

CREATE TABLE rooms (
  room_id TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- After creating the table, enable realtime updates on it
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- Optional but recommended: Create policies for security
-- This allows anyone to read rooms, but you might want to lock this down further.
CREATE POLICY "Public rooms are viewable by everyone."
  ON rooms FOR SELECT
  USING ( true );

-- This allows anyone to create or update a room.
-- In a production app, you would want to add authorization rules.
CREATE POLICY "Anyone can create and update rooms."
  ON rooms FOR ALL
  USING ( true )
  WITH CHECK ( true );

*/
