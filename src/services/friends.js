// Owner: Ryan. Your friends: everyone you've been in a hangout with.
// Used by the "Hangout with" card on 04 Dashboard and by 05 Create hangout (?with=).
import { supabase, hasSupabase } from './supabase'
import { addMember } from './hangouts'
import mockHangout from '@/mocks/hangout.json'
import mockHangout2 from '@/mocks/hangout-2.json'

// In the demo (no Supabase) you're Surya, like on 06 and 07
const DEMO_ME = 'u-surya'

// Every hangout member you can see, one row per person per hangout:
// [{ user_id, hangout_id, joined_at, display_name, avatar_color }]
async function getMemberRows() {
  if (!hasSupabase) {
    let rows = []
    for (let h of [mockHangout, mockHangout2]) {
      for (let m of h.members) {
        rows.push({
          user_id: m.user_id,
          hangout_id: h.id,
          joined_at: m.joined_at,
          display_name: m.display_name,
          avatar_color: m.avatar_color,
        })
      }
    }
    return rows
  }

  // No filter needed: the security rules only let you read the members of hangouts you're in
  const { data, error } = await supabase
    .from('hangout_members')
    .select('user_id, hangout_id, joined_at, profile:profiles(display_name, avatar_color)')
  if (error) {
    throw error
  }
  return data.map((r) => ({
    user_id: r.user_id,
    hangout_id: r.hangout_id,
    joined_at: r.joined_at,
    display_name: r.profile.display_name,
    avatar_color: r.profile.avatar_color,
  }))
}

// Your newest friends first: the people you met most recently. You "met" someone when the second
// of you joined a hangout you share; if you share several hangouts, the first one counts.
export async function getNewestFriends(myId, count) {
  const me = hasSupabase ? myId : DEMO_ME
  const rows = await getMemberRows()

  // When you joined each of your hangouts, e.g. { 'abc-123': 1791457200000 }
  let myJoins = {}
  for (let r of rows) {
    if (r.user_id === me) {
      myJoins[r.hangout_id] = new Date(r.joined_at).getTime()
    }
  }

  let friends = []
  for (let r of rows) {
    if (r.user_id === me) {
      continue
    }
    // When you met in this hangout: whichever of you joined later
    let met = new Date(r.joined_at).getTime()
    if (myJoins[r.hangout_id] > met) {
      met = myJoins[r.hangout_id]
    }
    const existing = friends.find((f) => f.user_id === r.user_id)
    if (!existing) {
      friends.push({
        user_id: r.user_id,
        display_name: r.display_name,
        avatar_color: r.avatar_color,
        met: met,
      })
    } else if (met < existing.met) {
      existing.met = met // you share an earlier hangout, so you met then
    }
  }

  friends.sort((a, b) => b.met - a.met) // newest first
  return friends.slice(0, count)
}

// One person's name and colour, for "Hanging out with …" on 05
export async function getFriend(userId) {
  if (!hasSupabase) {
    const rows = await getMemberRows()
    return rows.find((r) => r.user_id === userId) || null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_color')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    throw error
  }
  if (!data) {
    return null
  }
  return { user_id: data.id, display_name: data.display_name, avatar_color: data.avatar_color }
}

// Add a friend to a hangout you just made (the demo has no database to save to)
export async function addFriendToHangout(hangoutId, userId) {
  if (!hasSupabase) {
    return
  }
  await addMember(hangoutId, userId)
}
