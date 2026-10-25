// Owner: Ryan
// the one place that decides what a hangout says and does for the person looking, used by the
// dashboard (counts and the "need your input" filter) and by each card
// tone: 'amber' you have something to do, 'grey' waiting on others, 'green' confirmed

function firstName(member) {
  return member.display_name.split(' ')[0]
}

// "Mei", "Mei & Nic" or "Mei & 2 others", the first one by join order
function names(waiting) {
  if (waiting.length === 1) return firstName(waiting[0])
  if (waiting.length === 2) return `${firstName(waiting[0])} & ${firstName(waiting[1])}`
  return `${firstName(waiting[0])} & ${waiting.length - 1} others`
}

// did this member vote (the status line and the progress count both use it)
function hasVoted(h, m) {
  return (h.votes ?? []).some((v) => v.user_id === m.user_id)
}

// who still has their part to do: a vote while voting, a starting point while collecting
// (the status line, the "2 of 5" text and the grey avatars all use this one rule)
function waitingOn(h) {
  if (h.status === 'voting') return h.members.filter((m) => !hasVoted(h, m))
  return h.members.filter((m) => !m.start_label)
}

// who has done their part, null once there is nothing left to wait for
// { text: '2 of 5 added a starting point', waitingIds: ['u3', 'u4', 'u5'] }
export function getProgress(h) {
  if (h.status !== 'voting' && h.status !== 'collecting') return null
  const members = h.members
  const waiting = waitingOn(h)
  const done = h.status === 'voting' ? 'voted' : 'added a starting point'
  return {
    text: `${members.length - waiting.length} of ${members.length} ${done}`,
    waitingIds: waiting.map((m) => m.user_id),
  }
}

// the planning step I'm up to: add my starting point, then pick how I'm travelling and find the
// midpoint (both on Transport), then shortlist spots near it
function myStep(h, me) {
  if (!me || !me.start_label) return 'starting-points'
  if (!me.mode || !h.midpoint_name) return 'transport'
  return 'explore'
}

// the status line, the button and where the card goes, for one hangout
// myId is null when nobody is logged in or the person is not in the hangout
export function getStatus(h, myId) {
  const members = h.members
  const me = members.find((m) => m.user_id === myId)

  if (h.status === 'confirmed') {
    return {
      tone: 'green',
      text: 'Confirmed',
      check: true,
      button: 'View plan',
      fill: false,
      needsYou: false,
      page: 'final-plan',
    }
  }

  if (h.status === 'done') {
    return {
      tone: 'grey',
      text: 'Done',
      button: 'See how it went',
      fill: false,
      needsYou: false,
      page: 'debrief',
    }
  }

  if (h.status === 'voting') {
    if (me && !hasVoted(h, me)) {
      return {
        tone: 'amber',
        text: 'Your turn',
        button: 'Cast your vote',
        fill: true,
        needsYou: true,
        page: 'vote',
      }
    }
    const waiting = waitingOn(h)
    return {
      tone: 'grey',
      text: waiting.length > 0 ? `Waiting on ${names(waiting)}` : "Everyone's voted",
      button: 'View',
      fill: false,
      needsYou: false,
      page: 'vote',
    }
  }

  // collecting: everyone adds where they are coming from
  if (me && !me.start_label) {
    return {
      tone: 'amber',
      text: 'Your turn',
      button: 'Add starting point',
      fill: true,
      needsYou: true,
      page: 'starting-points',
    }
  }
  if (me && members.length === 1) {
    return {
      tone: 'amber',
      text: 'Just you so far',
      button: 'Invite friends',
      fill: true,
      needsYou: true,
      page: 'starting-points',
    }
  }
  // you're never in this list: you either added your point already or aren't in the hangout
  const waiting = waitingOn(h)
  return {
    tone: 'grey',
    text: waiting.length > 0 ? `Waiting on ${names(waiting)}` : "Everyone's added",
    button: 'View',
    fill: false,
    needsYou: false,
    page: myStep(h, me),
  }
}
