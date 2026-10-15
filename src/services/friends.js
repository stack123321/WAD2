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

// ── Friend requests (the friendships table in supabase/schema.sql) ──

// Demo only: requests kept in memory, so the Friends page can be tried without Supabase.
// They reset when the page reloads.
let demoFriendships = [
  { requester_id: DEMO_ME, addressee_id: 'u-ryan', status: 'accepted' },
  { requester_id: 'u-nicole', addressee_id: DEMO_ME, status: 'accepted' },
  { requester_id: DEMO_ME, addressee_id: 'u-hugo', status: 'accepted' },
  { requester_id: 'u-matrix', addressee_id: DEMO_ME, status: 'pending' },
]

// Demo only: everyone in the sample hangouts, once each
async function demoPeople() {
  const rows = await getMemberRows()
  let people = []
  for (let r of rows) {
    if (!people.find((p) => p.user_id === r.user_id)) {
      people.push({
        user_id: r.user_id,
        display_name: r.display_name,
        avatar_color: r.avatar_color,
      })
    }
  }
  return people
}

// People you could add: their name contains the text, or it's their exact email. Never returns emails.
export async function searchPeople(text) {
  if (!hasSupabase) {
    const people = await demoPeople()
    return people.filter(
      (p) => p.user_id !== DEMO_ME && p.display_name.toLowerCase().includes(text.toLowerCase()),
    )
  }

  const { data, error } = await supabase.rpc('search_people', { q: text })
  if (error) {
    throw error
  }
  return data.map((p) => ({
    user_id: p.id,
    display_name: p.display_name,
    avatar_color: p.avatar_color,
  }))
}

// Your friendships, split three ways. Each list is [{ user_id, display_name, avatar_color }]:
//   friends  = accepted (either of you asked)
//   pending  = you asked, they haven't accepted yet
//   requests = they asked you
export async function getFriendships(myId) {
  const me = hasSupabase ? myId : DEMO_ME
  let rows = []

  if (!hasSupabase) {
    const people = await demoPeople()
    for (let f of demoFriendships) {
      rows.push({
        requester_id: f.requester_id,
        addressee_id: f.addressee_id,
        status: f.status,
        requester: people.find((p) => p.user_id === f.requester_id),
        addressee: people.find((p) => p.user_id === f.addressee_id),
      })
    }
  } else {
    // The security rules only return friendships you're part of
    const { data, error } = await supabase
      .from('friendships')
      .select(
        'requester_id, addressee_id, status, ' +
          'requester:profiles!friendships_requester_id_fkey(display_name, avatar_color), ' +
          'addressee:profiles!friendships_addressee_id_fkey(display_name, avatar_color)',
      )
    if (error) {
      throw error
    }
    rows = data
  }

  let lists = { friends: [], pending: [], requests: [] }
  for (let r of rows) {
    const iAsked = r.requester_id === me
    // The other person in this friendship
    const otherId = iAsked ? r.addressee_id : r.requester_id
    const otherProfile = iAsked ? r.addressee : r.requester
    const other = {
      user_id: otherId,
      display_name: otherProfile.display_name,
      avatar_color: otherProfile.avatar_color,
    }
    if (r.status === 'accepted') {
      lists.friends.push(other)
    } else if (iAsked) {
      lists.pending.push(other)
    } else {
      lists.requests.push(other)
    }
  }
  return lists
}

// Ask someone to be your friend
export async function sendFriendRequest(myId, userId) {
  if (!hasSupabase) {
    demoFriendships.push({ requester_id: DEMO_ME, addressee_id: userId, status: 'pending' })
    return
  }
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: myId, addressee_id: userId })
  if (error) {
    throw error
  }
}

// Accept a request someone sent you
export async function acceptFriendRequest(myId, userId) {
  if (!hasSupabase) {
    const f = demoFriendships.find((f) => f.requester_id === userId && f.addressee_id === DEMO_ME)
    if (f) {
      f.status = 'accepted'
    }
    return
  }
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('requester_id', userId)
    .eq('addressee_id', myId)
  if (error) {
    throw error
  }
}

// Decline a request someone sent you
export async function declineFriendRequest(myId, userId) {
  if (!hasSupabase) {
    demoFriendships = demoFriendships.filter(
      (f) => !(f.requester_id === userId && f.addressee_id === DEMO_ME),
    )
    return
  }
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('requester_id', userId)
    .eq('addressee_id', myId)
  if (error) {
    throw error
  }
}
