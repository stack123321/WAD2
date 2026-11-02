// Owner: Eashvar. Friend groups (e.g. "Uni friends"): a group has its own chat, the hangouts
// planned with it, and each person's usual starting point. "Plan a hangout with this group" opens
// 05 with everyone ticked, and the usual starting points are copied into the new hangout.
// Tables and security rules: "Friend groups" in supabase/schema.sql
// (supabase/migrations/2026-11-01-friend-groups.sql). The chat itself is services/chat.js, kind 'group'.
// Brings back Surya's groups from 17 Oct (taken out on 21 Oct when My Chats was made).
import { supabase, hasSupabase } from './supabase'
import { getPastFriends, updateMemberMode, updateMemberStart } from './hangouts'
import { getFriendships } from './friends'
import mockGroups from '@/mocks/groups.json'
import mockHangout from '@/mocks/hangout.json'
import mockHangout2 from '@/mocks/hangout-2.json'

// in the demo (no supabase) you're Surya, like on 06, 07 and the Friends page
export const DEMO_ME = 'u-surya'

// demo only: groups kept in memory, reset on reload
let demoGroups = structuredClone(mockGroups)

// the sample groups (and anything made in the demo) have ids starting with "demo"
function isDemoGroup(id) {
  return !hasSupabase || id.startsWith('demo')
}

/** Who "I" am on the group pages: the logged-in user, or Surya in the demo. */
export function groupUserId(user) {
  if (!hasSupabase) {
    return DEMO_ME
  }
  return user ? user.id : null
}

// a group with its members, each with their name, colour and usual starting point
const GROUP_COLUMNS =
  '*, members:group_members(user_id, joined_at, start_label, start_lat, start_lng, mode, ' +
  'profile:profiles(display_name, avatar_color))'

// { profile: { display_name, avatar_color }, ...row } becomes { display_name, avatar_color, ...row },
// the same shape as a hangout's members, and in the order people joined
function flatten(group) {
  group.members = group.members.map(({ profile, ...m }) => ({ ...m, ...profile }))
  group.members.sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at))
  return group
}

// Part (a) Reading groups
/**
 * The groups I'm in, newest first. The security rules only return my groups.
 * @returns {Promise<Array<{ id, name, owner_id, created_at, members: Array }>>}
 */
export async function getMyGroups() {
  if (!hasSupabase) {
    const mine = demoGroups.filter((g) => g.members.some((m) => m.user_id === DEMO_ME))
    return structuredClone(mine)
  }
  const { data, error } = await supabase
    .from('groups')
    .select(GROUP_COLUMNS)
    .order('created_at', { ascending: false })
  if (error) {
    throw error
  }
  return data.map(flatten)
}

/** One group with its members, or null if it doesn't exist or I'm not in it. */
export async function getGroup(id) {
  if (isDemoGroup(id)) {
    const group = demoGroups.find((g) => g.id === id)
    return group ? structuredClone(group) : null
  }
  const { data, error } = await supabase
    .from('groups')
    .select(GROUP_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) {
    throw error
  }
  return data ? flatten(data) : null
}

/**
 * The hangouts planned with this group that I'm in, soonest first, in the same shape as
 * getMyHangouts() so the dashboard's HangoutCard can show them. People who were left out of a
 * hangout don't see it (the security rules only show hangouts you're in).
 */
export async function getGroupHangouts(groupId) {
  if (isDemoGroup(groupId)) {
    const samples = [mockHangout, mockHangout2].filter((h) => h.group_id === groupId)
    return structuredClone(samples)
  }
  const { data, error } = await supabase
    .from('hangouts')
    .select(
      '*, members:hangout_members(*, profile:profiles(display_name, avatar_color)), shortlist!hangout_id(*), votes(*)',
    )
    .eq('group_id', groupId)
    .order('starts_at', { ascending: true })
  if (error) {
    throw error
  }
  for (const hangout of data) {
    hangout.members = hangout.members.map(({ profile, ...m }) => ({ ...m, ...profile }))
  }
  return data
}

/**
 * Who I can put in a group: my friends and people I've been in a hangout with (the same people
 * the security rules allow), once each, A to Z, leaving out anyone in `leaveOut`.
 * @returns {Promise<Array<{ user_id, display_name, avatar_color }>>}
 */
export async function getAddablePeople(myId, leaveOut = []) {
  const lists = await getFriendships(myId)
  const past = await getPastFriends(myId)
  const people = []
  for (const p of [...lists.friends, ...past]) {
    if (p.user_id === myId || leaveOut.includes(p.user_id)) {
      continue
    }
    if (!people.some((q) => q.user_id === p.user_id)) {
      people.push({
        user_id: p.user_id,
        display_name: p.display_name,
        avatar_color: p.avatar_color,
      })
    }
  }
  people.sort((a, b) => a.display_name.localeCompare(b.display_name))
  return people
}

// Part (b) Making and changing groups
function checkName(name) {
  const text = name.trim()
  if (text === '') {
    throw new Error('Give the group a name.')
  }
  if (text.length > 60) {
    throw new Error('Group names can be up to 60 characters.')
  }
  return text
}

// a member row with no usual starting point yet
function newMember(person) {
  return {
    user_id: person.user_id,
    display_name: person.display_name,
    avatar_color: person.avatar_color,
    joined_at: new Date().toISOString(),
    start_label: null,
    start_lat: null,
    start_lng: null,
    mode: null,
  }
}

/**
 * Make a group with me as its owner, then add the people picked.
 * @param {string} name
 * @param {Array<{ user_id, display_name, avatar_color }>} people my friends to add
 * @param {string} myId
 * @returns {Promise<{ group: object, notAdded: string[] }>} notAdded = names that couldn't be added
 */
export async function createGroup(name, people, myId) {
  const text = checkName(name)

  if (!hasSupabase) {
    const me = mockHangout.members.find((m) => m.user_id === DEMO_ME)
    const group = {
      id: `demo-group-${Date.now()}`,
      name: text,
      owner_id: DEMO_ME,
      created_at: new Date().toISOString(),
      members: [newMember(me), ...people.map(newMember)],
    }
    demoGroups.unshift(group)
    return { group: structuredClone(group), notAdded: [] }
  }

  const { data: group, error } = await supabase
    .from('groups')
    .insert({ name: text })
    .select()
    .single()
  if (error) {
    throw error
  }
  // me first: the rules only let the owner add people once the owner is in the group
  const { error: meError } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: myId })
  if (meError) {
    throw meError
  }
  const notAdded = await addGroupMembers(group.id, people)
  return { group: group, notAdded: notAdded }
}

/**
 * Add people to a group. Only the owner can, and only their friends or people they've been in a
 * hangout with (security rule "group members: owner adds").
 * @returns {Promise<string[]>} the names of anyone who couldn't be added
 */
export async function addGroupMembers(groupId, people) {
  if (isDemoGroup(groupId)) {
    const group = demoGroups.find((g) => g.id === groupId)
    for (const person of people) {
      if (group && !group.members.some((m) => m.user_id === person.user_id)) {
        group.members.push(newMember(person))
      }
    }
    return []
  }
  // one at a time, so one person failing doesn't stop the rest
  const notAdded = []
  for (const person of people) {
    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: person.user_id })
    if (error) {
      console.error(error)
      notAdded.push(person.display_name)
    }
  }
  return notAdded
}

/** Take someone out of a group: yourself (leave), or anyone if you're the owner. */
export async function removeGroupMember(groupId, userId) {
  if (isDemoGroup(groupId)) {
    const group = demoGroups.find((g) => g.id === groupId)
    if (group) {
      group.members = group.members.filter((m) => m.user_id !== userId)
    }
    return
  }
  const { data, error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .select()
  if (error) {
    throw error
  }
  // the rules said no: Supabase deletes nothing instead of giving an error
  if (data.length === 0) {
    throw new Error('Only the group’s owner can take other people out.')
  }
}

/** Delete a group and its chat (owner only). Its hangouts stay, they just lose the link. */
export async function deleteGroup(groupId) {
  if (isDemoGroup(groupId)) {
    demoGroups = demoGroups.filter((g) => g.id !== groupId)
    return
  }
  const { data, error } = await supabase.from('groups').delete().eq('id', groupId).select()
  if (error) {
    throw error
  }
  if (data.length === 0) {
    throw new Error('Only the group’s owner can delete it.')
  }
}

/**
 * Save my usual starting point (and, if picked, how I usually travel) for this group.
 * Only my own (security rule "group members: edit own row").
 * @param {{ label: string, lat: number, lng: number }} place
 * @param {'mrt' | 'bus' | 'car' | 'walk' | null} mode
 */
export async function setUsualStart(groupId, userId, place, mode) {
  const fields = {
    start_label: place.label,
    start_lat: place.lat,
    start_lng: place.lng,
    mode: mode,
  }
  if (isDemoGroup(groupId)) {
    const group = demoGroups.find((g) => g.id === groupId)
    const member = group ? group.members.find((m) => m.user_id === userId) : null
    if (member) {
      Object.assign(member, fields)
    }
    return
  }
  const { data, error } = await supabase
    .from('group_members')
    .update(fields)
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .select()
  if (error) {
    throw error
  }
  if (data.length === 0) {
    throw new Error('You can only change your own usual starting point.')
  }
}

// Part (c) Planning a hangout with the group
/**
 * Where each person usually starts from: the usual start they saved for the group, or else where
 * they started from in the group's most recent hangout. No pages or API calls, just the data.
 * @param {object} group from getGroup()
 * @param {Array} hangouts from getGroupHangouts()
 * @returns {Object<string, { label, lat, lng, mode, fromLast: boolean } | null>} by user_id
 */
export function usualTrips(group, hangouts = []) {
  // newest first, so the first match is their most recent start
  const newestFirst = [...hangouts].sort(
    (a, b) => new Date(b.starts_at ?? 0) - new Date(a.starts_at ?? 0),
  )
  const trips = {}
  for (const m of group.members) {
    if (m.start_lat != null && m.start_lng != null) {
      trips[m.user_id] = {
        label: m.start_label,
        lat: m.start_lat,
        lng: m.start_lng,
        mode: m.mode,
        fromLast: false,
      }
      continue
    }
    trips[m.user_id] = null
    for (const h of newestFirst) {
      const row = (h.members ?? []).find((r) => r.user_id === m.user_id)
      if (row && row.start_lat != null && row.start_lng != null) {
        trips[m.user_id] = {
          label: row.start_label,
          lat: row.start_lat,
          lng: row.start_lng,
          mode: m.mode || row.mode,
          fromLast: true,
        }
        break
      }
    }
  }
  return trips
}

/**
 * Copy the usual starting points (and transport) into a hangout just made from the group, for
 * the people who are coming. The host can change everyone's row in their own hangout ("members:
 * edit own row"). Anyone whose copy fails just adds their start on 06 as usual.
 * @param {string} hangoutId
 * @param {Object} trips from usualTrips()
 * @param {string[]} userIds the people in the new hangout (including me)
 * @returns {Promise<number>} how many starting points were filled in
 */
export async function fillUsualStarts(hangoutId, trips, userIds) {
  let filled = 0
  for (const userId of userIds) {
    const trip = trips[userId]
    if (!trip) {
      continue
    }
    try {
      await updateMemberStart(hangoutId, userId, {
        label: trip.label,
        lat: trip.lat,
        lng: trip.lng,
      })
      if (trip.mode) {
        await updateMemberMode(hangoutId, userId, trip.mode)
      }
      filled++
    } catch (err) {
      console.error(err)
    }
  }
  return filled
}
