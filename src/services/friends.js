// Owner: Ryan
// your friends: everyone you've been in a hangout with (04 "hangout with" card, 05 ?with=)
import { supabase, hasSupabase } from './supabase'
import { addMember } from './hangouts'
import mockHangout from '@/mocks/hangout.json'
import mockHangout2 from '@/mocks/hangout-2.json'

// every function below has two halves: the demo (no supabase) works on lists kept in memory, the real app asks the database.
// in the demo (no supabase) you're surya, like on 06 and 07
const DEMO_ME = 'u-surya'

// every hangout member you can see, one row per person per hangout
async function getMemberRows() {
  // no supabase, so use the sample hangouts
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

  // no filter needed: the security rules only let you read the members of hangouts you're in
  // each member's name and colour come from the profiles table, as profile
  const { data, error } = await supabase
    .from('hangout_members')
    .select('user_id, hangout_id, joined_at, profile:profiles(display_name, avatar_color)')
  if (error) {
    throw error // the page's try/catch shows the message
  }
  // flatten each row, so the name and colour sit beside the ids instead of inside profile
  return data.map((r) => ({
    user_id: r.user_id,
    hangout_id: r.hangout_id,
    joined_at: r.joined_at,
    display_name: r.profile.display_name,
    avatar_color: r.profile.avatar_color,
  }))
}

// one person's name and colour, for "hanging out with …" on 05
export async function getFriend(userId) {
  if (!hasSupabase) {
    const rows = await getMemberRows()
    return rows.find((r) => r.user_id === userId) || null
  }

  // maybeSingle gives one row or null, instead of an error when nobody matches
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

// add a friend to a hangout you just made
export async function addFriendToHangout(hangoutId, userId) {
  if (!hasSupabase) {
    return
  }
  await addMember(hangoutId, userId)
}

// friend requests, kept in the friendships table (see supabase/schema.sql)

// demo only: requests kept in memory, reset on reload
let demoFriendships = [
  {
    requester_id: DEMO_ME,
    addressee_id: 'u-ryan',
    status: 'accepted',
    accepted_at: '2026-10-10T12:20:00+08:00',
  },
  {
    requester_id: 'u-nicole',
    addressee_id: DEMO_ME,
    status: 'accepted',
    accepted_at: '2026-10-10T12:30:00+08:00',
  },
  {
    requester_id: DEMO_ME,
    addressee_id: 'u-hugo',
    status: 'accepted',
    accepted_at: '2026-10-12T09:00:00+08:00',
  },
  { requester_id: 'u-matrix', addressee_id: DEMO_ME, status: 'pending', accepted_at: null },
]

// demo only: everyone in the sample hangouts, once each
async function demoPeople() {
  const rows = await getMemberRows()
  let people = []
  for (let r of rows) {
    // someone in both sample hangouts has two rows, so only add them the first time
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

// people you could add: their name contains the text, or exact email. never returns emails.
export async function searchPeople(text) {
  if (!hasSupabase) {
    const people = await demoPeople()
    return people.filter(
      (p) => p.user_id !== DEMO_ME && p.display_name.toLowerCase().includes(text.toLowerCase()),
    )
  }

  // rpc runs a function inside the database (see schema.sql), so emails are matched there and never sent to the browser
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

// your friendships split three ways: friends (accepted), pending (you asked), requests (they asked you)
export async function getFriendships(myId) {
  const me = hasSupabase ? myId : DEMO_ME // who "i" am
  let rows = [] // every friendship i'm part of, filled by the demo or the database below

  if (!hasSupabase) {
    const people = await demoPeople()
    for (let f of demoFriendships) {
      rows.push({
        requester_id: f.requester_id,
        addressee_id: f.addressee_id,
        status: f.status,
        accepted_at: f.accepted_at,
        requester: people.find((p) => p.user_id === f.requester_id),
        addressee: people.find((p) => p.user_id === f.addressee_id),
      })
    }
  } else {
    // the security rules only return friendships you're part of
    // a friendship row has two people, so both profiles are joined in, named requester and addressee.
    const { data, error } = await supabase
      .from('friendships')
      .select(
        'requester_id, addressee_id, status, accepted_at, ' +
          'requester:profiles!friendships_requester_id_fkey(display_name, avatar_color), ' +
          'addressee:profiles!friendships_addressee_id_fkey(display_name, avatar_color)',
      )
    if (error) {
      throw error
    }
    rows = data
  }

  // sort each friendship into one of the three lists, by its status and who asked whom
  let lists = { friends: [], pending: [], requests: [] }
  for (let r of rows) {
    const iAsked = r.requester_id === me // true if i sent the request
    // the other person in this friendship
    const otherId = iAsked ? r.addressee_id : r.requester_id
    const otherProfile = iAsked ? r.addressee : r.requester
    const other = {
      user_id: otherId,
      display_name: otherProfile.display_name,
      avatar_color: otherProfile.avatar_color,
      since: r.accepted_at ? new Date(r.accepted_at).getTime() : 0, // when you became friends
    }
    if (r.status === 'accepted') {
      lists.friends.push(other) // accepted: friends, whoever asked
    } else if (iAsked) {
      lists.pending.push(other) // waiting on them
    } else {
      lists.requests.push(other) // waiting on me
    }
  }
  return lists
}

// send friend request
export async function sendFriendRequest(myId, userId) {
  if (!hasSupabase) {
    demoFriendships.push({ requester_id: DEMO_ME, addressee_id: userId, status: 'pending' })
    return
  }
  // a new row, its status starts as 'pending' (the database default)
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: myId, addressee_id: userId })
  if (error) {
    throw error
  }
}

// accept request
export async function acceptFriendRequest(myId, userId) {
  if (!hasSupabase) {
    const f = demoFriendships.find((f) => f.requester_id === userId && f.addressee_id === DEMO_ME)
    if (f) {
      f.status = 'accepted'
      f.accepted_at = new Date().toISOString()
    }
    return
  }
  // their request to me: they are the requester, i am the addressee
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('requester_id', userId)
    .eq('addressee_id', myId)
  if (error) {
    throw error
  }
}

// decline request
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

export async function removeFriend(myId, userId) {
  if (!hasSupabase) {
    demoFriendships = demoFriendships.filter(
      (f) =>
        !(
          (f.requester_id === DEMO_ME && f.addressee_id === userId) ||
          (f.requester_id === userId && f.addressee_id === DEMO_ME)
        ),
    )
    return
  }
  // either of us may have sent request, so delete both directions
  const asRequester = await supabase
    .from('friendships')
    .delete()
    .eq('requester_id', myId)
    .eq('addressee_id', userId)
  if (asRequester.error) {
    throw asRequester.error
  }
  const asAddressee = await supabase
    .from('friendships')
    .delete()
    .eq('requester_id', userId)
    .eq('addressee_id', myId)
  if (asAddressee.error) {
    throw asAddressee.error
  }
}
