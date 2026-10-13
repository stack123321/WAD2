// Owner: Matrix. The one Supabase client for the whole app. Import it only inside src/services/.
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Supabase now calls this the "publishable key". The older name, the "anon key", still works too.
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

// True once .env.local has the Supabase URL and key. Until then, services fall back to mock data.
export const hasSupabase = Boolean(supabaseUrl && supabaseKey)

if (!hasSupabase) {
  console.info(
    '[fairpoint] No Supabase keys in .env.local: using mock data from src/mocks/hangout.json',
  )
}

// The publishable key is safe in the browser only because Row Level Security is on for every table.
// Never put the secret (service-role) key in front-end code.
export const supabase = hasSupabase ? createClient(supabaseUrl, supabaseKey) : null
