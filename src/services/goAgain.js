// Owner: Surya. "Go again" on a past hangout (04 Past, Debrief): a new hangout with the same
// group, the same place and everyone's same starting point and transport, so you only pick a new
// date. It goes straight to 12 Final plan, skipping 06 to 11. Uses the existing functions for
// each step, and the security rules already allow all of them (the host can add people they've
// shared a hangout with, and edit everyone's row in the new hangout).
import { supabase } from './supabase'
import { addMember, createHangout, saveMidpoint } from './hangouts'
import { addToShortlist } from './places'
import { closeVote, isMockHangout } from './votes'

/** The past hangout's chosen place, or null if it was never decided. */
export function finalSpot(hangout) {
  if (!hangout || !hangout.final_shortlist_id) {
    return null
  }
  const spot = (hangout.shortlist ?? []).find((s) => s.id === hangout.final_shortlist_id)
  if (!spot) {
    return null
  }
  return spot
}

/**
 * Make the new hangout from a past one.
 * @param {object} past the past hangout with members and shortlist (as getHangout returns it)
 * @param {{ name: string, startsAt: Date, inviteCode: string, myId: string, friendIds: string[] }} input
 *   friendIds = the people still ticked on 05 (untick someone to leave them out this time)
 * @returns {Promise<{ id: string, notAdded: string[], complete: boolean }>}
 *   notAdded = names of people who couldn't be added; complete = false if a later step failed
 *   (the hangout still exists, and can be finished on 06)
 */
export async function repeatHangout(past, input) {
  const spot = finalSpot(past)
  if (!spot) {
    throw new Error('That hangout was never decided, so there is no place to go back to.')
  }

  // Part (a) The hangout itself, with me as host (createHangout adds me as a member)
  const hangout = await createHangout({
    name: input.name,
    starts_at: input.startsAt.toISOString(),
    vibe: past.vibe ?? [],
    vote_deadline: null,
    invite_code: input.inviteCode,
  })

  const notAdded = []
  let complete = true
  try {
    // Part (b) Everyone else from last time who is still ticked
    const added = []
    for (const m of past.members) {
      if (m.user_id === input.myId) {
        added.push(m)
        continue
      }
      if (!input.friendIds.includes(m.user_id)) {
        continue
      }
      try {
        await addMember(hangout.id, m.user_id)
        added.push(m)
      } catch (err) {
        console.error(err)
        notAdded.push(m.display_name)
      }
    }

    // Part (c) Their starting points and transport from last time (they can change them on 06/07)
    for (const m of added) {
      await copyTrip(hangout.id, m)
    }

    // Part (d) The same midpoint, and the same place as the plan
    if (past.midpoint_lat != null) {
      await saveMidpoint(hangout.id, {
        name: past.midpoint_name,
        lat: past.midpoint_lat,
        lng: past.midpoint_lng,
        avgMins: past.avg_mins,
        gapMins: past.gap_mins,
      })
    }
    const saved = await addToShortlist(hangout.id, spot)
    await closeVote(hangout.id, saved.id) // confirmed, with this place chosen
  } catch (err) {
    console.error(err)
    complete = false
  }

  return { id: hangout.id, notAdded: notAdded, complete: complete }
}

// One person's starting point, mode and trip, copied onto their row in the new hangout
async function copyTrip(hangoutId, member) {
  if (isMockHangout(hangoutId)) {
    return
  }
  const { error } = await supabase
    .from('hangout_members')
    .update({
      start_label: member.start_label ?? null,
      start_lat: member.start_lat ?? null,
      start_lng: member.start_lng ?? null,
      mode: member.mode ?? null,
      travel_mins: member.travel_mins ?? null,
      travel_cost: member.travel_cost ?? null,
    })
    .eq('hangout_id', hangoutId)
    .eq('user_id', member.user_id)
  if (error) {
    throw error
  }
}
