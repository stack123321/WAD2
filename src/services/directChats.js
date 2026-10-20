// Owner: Ryan
// one to one chats between friends, listed on My Chats (messages: services/chat.js with kind 'direct')
import { supabase, hasSupabase } from './supabase'

// demo only: chats kept in memory, reset on reload. each is { id, friend: { user_id, display_name, avatar_color } }
const demoChats = []

// one chat as the pages use it: the other person, and both people as members for the chat box
function shape(row, myId) {
  const iAmA = row.user_a === myId
  const friend = {
    user_id: iAmA ? row.user_b : row.user_a,
    display_name: (iAmA ? row.b : row.a).display_name,
    avatar_color: (iAmA ? row.b : row.a).avatar_color,
  }
  const me = {
    user_id: myId,
    display_name: (iAmA ? row.a : row.b).display_name,
    avatar_color: (iAmA ? row.a : row.b).avatar_color,
  }
  return { id: row.id, friend, members: [me, friend] }
}

const CHAT_COLUMNS =
  'id, user_a, user_b, ' +
  'a:profiles!direct_chats_user_a_fkey(display_name, avatar_color), ' +
  'b:profiles!direct_chats_user_b_fkey(display_name, avatar_color)'

// the chat with this friend, made the first time. friend is { user_id, display_name, avatar_color }
export async function getOrCreateDirectChat(friend) {
  if (!hasSupabase) {
    let chat = demoChats.find((c) => c.friend.user_id === friend.user_id)
    if (!chat) {
      chat = { id: `demo-direct-${friend.user_id}`, friend }
      demoChats.push(chat)
    }
    return chat
  }
  // the database finds the chat, or makes it, and checks that you are friends
  const { data, error } = await supabase.rpc('open_direct_chat', { friend_id: friend.user_id })
  if (error) {
    throw error
  }
  return { id: data, friend }
}

// all my one to one chats, as [{ id, friend, members }]
export async function getMyDirectChats(myId) {
  if (!hasSupabase) {
    return demoChats.map((c) => ({ ...c, members: [c.friend] }))
  }
  // the security rules only return chats you are in
  const { data, error } = await supabase.from('direct_chats').select(CHAT_COLUMNS)
  if (error) {
    throw error
  }
  return data.map((row) => shape(row, myId))
}

// one chat by id, or null if it isn't yours
export async function getDirectChat(chatId, myId) {
  if (!hasSupabase) {
    const chat = demoChats.find((c) => c.id === chatId)
    return chat ? { ...chat, members: [chat.friend] } : null
  }
  const { data, error } = await supabase
    .from('direct_chats')
    .select(CHAT_COLUMNS)
    .eq('id', chatId)
    .maybeSingle()
  if (error) {
    throw error
  }
  return data ? shape(data, myId) : null
}
