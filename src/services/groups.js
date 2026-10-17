// Owner: Surya. Friend groups (e.g. "Uni friends"): a group keeps one chat across all its
// hangouts, on its own page (/groups/:id), and new hangouts can be started with everyone in it.
// Tables and security rules: "Friend groups" at the end of supabase/schema.sql.
// The group chat itself uses services/chat.js with kind 'group'.
import { supabase, hasSupabase } from './supabase'
import { addMember, createHangout, makeInviteCode } from './hangouts'

const NO_DATABASE = 'Friend groups need Supabase (they are not in the demo).'

// Turn { profile: { display_name, avatar_color }, ...row } into { display_name, avatar_color, ...row }
function flattenMembers(members) {
  const result = []
  for (const m of members) {
    result.push({
      user_id: m.user_id,
      joined_at: m.joined_at,
      display_name: m.profile.display_name,
      avatar_color: m.profile.avatar_color,
    })
  }
  return result
}

// Part (a) Reading groups
/**
 * The groups you're in, newest first. The security rules only return your groups.
 * @returns {Promise<Array<{ id, name, owner_id, created_at, members: Array }>>}
 */
export async function getMyGroups() {
  if (!hasSupabase) {
    return []
  }

  const { data, error } = await supabase
    .from('groups')
    .select(
      '*, members:group_members(user_id, joined_at, profile:profiles(display_name, avatar_color))',
    )
    .order('created_at', { ascending: false })
  if (error) {
    throw error
  }

  for (const group of data) {
    group.members = flattenMembers(group.members)
  }
  return data
}

/**
 * One group with its members and the hangouts started from it (soonest first).
 * @returns {Promise<{ id, name, owner_id, members: Array, hangouts: Array<{ id, name, starts_at, status }> }>}
 */
export async function getGroup(id) {
  if (!hasSupabase) {
    throw new Error(NO_DATABASE)
  }

  const { data, error } = await supabase
    .from('groups')
    .select(
      '*, members:group_members(user_id, joined_at, profile:profiles(display_name, avatar_color)), ' +
        'hangouts(id, name, starts_at, status)',
    )
    .eq('id', id)
    .single()
  if (error) {
    // PGRST116 = no row: the group doesn't exist, or you're not in it
    if (error.code === 'PGRST116') {
      throw new Error("This group doesn't exist, or you're not in it.")
    }
    throw error
  }

  data.members = flattenMembers(data.members)
  data.hangouts.sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
  return data
}

// Part (b) Making and changing groups
/**
 * Make a new group with you as its owner and first member.
 * @returns {Promise<object>} the new group row
 */
export async function createGroup(name, myId) {
  if (!hasSupabase) {
    throw new Error(NO_DATABASE)
  }
  const text = name.trim()
  if (text === '') {
    throw new Error('Give the group a name.')
  }
  if (text.length > 60) {
    throw new Error('Group names can be up to 60 characters.')
  }

  const { data: group, error } = await supabase
    .from('groups')
    .insert({ name: text })
    .select()
    .single()
  if (error) {
    throw error
  }

  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: myId })
  if (memberError) {
    throw memberError
  }
  return group
}

/**
 * Add someone to a group. Only the owner can, and only their friends (Friends page or past
 * hangouts): security rule "group members: owner adds" in schema.sql.
 */
export async function addGroupMember(groupId, userId) {
  if (!hasSupabase) {
    throw new Error(NO_DATABASE)
  }

  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: userId })
  if (error) {
    // 42501 = the security rules said no
    if (error.code === '42501') {
      throw new Error('Only the group owner can add people, and only their friends.')
    }
    throw error
  }
}

/** Remove someone from a group (yourself = leave; the owner can remove anyone). */
export async function removeGroupMember(groupId, userId) {
  if (!hasSupabase) {
    throw new Error(NO_DATABASE)
  }

  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)
  if (error) {
    throw error
  }
}

/** Delete a group and its chat (owner only). Its hangouts stay, they just lose the link. */
export async function deleteGroup(groupId) {
  if (!hasSupabase) {
    throw new Error(NO_DATABASE)
  }

  const { error } = await supabase.from('groups').delete().eq('id', groupId)
  if (error) {
    throw error
  }
}

// Part (c) Start a hangout with the whole group
/**
 * Create a hangout from a group (you're the host) and add everyone in the group to it.
 * @param {object} group from getGroup(): needs id, members
 * @param {{ name: string, starts_at: string }} input
 * @returns {Promise<{ hangout: object, failed: string[] }>} failed = names that couldn't be added
 */
export async function startGroupHangout(group, input, myId) {
  const hangout = await createHangout({
    name: input.name,
    starts_at: input.starts_at,
    vibe: [],
    vote_deadline: null,
    invite_code: makeInviteCode(),
    group_id: group.id,
  })

  // Add everyone else, one after the other ("members: host adds past friends" allows group mates)
  const failed = []
  for (const member of group.members) {
    if (member.user_id === myId) {
      continue
    }
    try {
      await addMember(hangout.id, member.user_id)
    } catch (err) {
      console.error(err)
      failed.push(member.display_name)
    }
  }
  return { hangout: hangout, failed: failed }
}
