// Owner: Matrix. The one Supabase client for the whole app. Import it only inside src/services/.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// True once .env.local has the Supabase URL and anon key. Until then, services fall back to mock data.
export const hasSupabase = Boolean(url && anonKey)

if (!hasSupabase) {
  console.info(
    '[fairpoint] No Supabase keys in .env.local: using mock data from src/mocks/hangout.json',
  )
}

// The anon key is safe in the browser only because Row Level Security is on for every table.
// Never put the service-role key in front-end code.
export const supabase = hasSupabase ? createClient(url, anonKey) : null
