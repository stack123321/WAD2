// Owner: Ryan
// the one place that decides what a hangout says and does for the person looking, used by the dashboard (counts and the "need your input" filter) and by each card.
// if every card worked out its own status, the counts at the top and the cards below could disagree, so they all ask this file.
// tone: 'amber' you have something to do, 'grey' waiting on others, 'green' confirmed

// "Mei Tan" becomes "Mei"
function firstName(member) {
  return member.display_name.split(' ')[0] // split on spaces, keep the first word
}

// "Mei", "Mei & Nic" or "Mei & 2 others", the first one by join order
function names(waiting) {
  if (waiting.length === 1) return firstName(waiting[0]) // one person: just their name
  if (waiting.length === 2) return `${firstName(waiting[0])} & ${firstName(waiting[1])}` // two: both names
  return `${firstName(waiting[0])} & ${waiting.length - 1} others` // three or more: first name and a count, so the line stays short
}

// did this member vote (the status line and the progress count both use it)
function hasVoted(h, m) {
  // h.votes can be missing on a new hangout, so ?? [] gives an empty list instead of an error
  return (h.votes ?? []).some((v) => v.user_id === m.user_id) // true if any vote belongs to this member
}

// who still has their part to do: a vote while voting, a starting point while collecting.
// the status line, the "2 of 5" text and the grey avatars all use this one rule, so they can never disagree.
function waitingOn(h) {
  if (h.status === 'voting') return h.members.filter((m) => !hasVoted(h, m)) // voting: everyone without a vote
  return h.members.filter((m) => !m.start_label) // collecting: everyone without a starting point
}

// who has done their part, null once there is nothing left to wait for
// { text: '2 of 5 added a starting point', waitingIds: ['u3', 'u4', 'u5'] }
export function getProgress(h) {
  if (h.status !== 'voting' && h.status !== 'collecting') return null // confirmed or done: nobody to wait for
  const members = h.members
  const waiting = waitingOn(h) // the people still to act
  const done = h.status === 'voting' ? 'voted' : 'added a starting point' // the words for this stage
  return {
    text: `${members.length - waiting.length} of ${members.length} ${done}`, // e.g. "3 of 4 voted"
    waitingIds: waiting.map((m) => m.user_id), // just their ids, so the card can grey out their avatars
  }
}

// the planning step i'm up to: add my starting point, then pick how i'm travelling and find the midpoint (both on transport), then shortlist spots near it
function myStep(h, me) {
  if (!me || !me.start_label) return 'starting-points' // no starting point yet (or not in the hangout)
  if (!me.mode || !h.midpoint_name) return 'transport' // no travel mode yet, or no midpoint found yet
  return 'explore' // everything done, so on to picking spots
}

// the status line, the button and where the card goes, for one hangout
// myId is null when nobody is logged in or the person is not in the hangout
export function getStatus(h, myId) {
  const members = h.members
  const me = members.find((m) => m.user_id === myId) // my own member row, undefined if i'm not in it

  // the checks run from the end of planning backwards, and the first one that matches returns.
  // every answer has the same fields, so the card can show any of them the same way.
  if (h.status === 'confirmed') {
    return {
      tone: 'green', // green edge
      text: 'Confirmed',
      check: true, // show a tick before the text
      button: 'View plan',
      fill: false, // outline button, there's nothing urgent to do
      needsYou: false, // not counted in "need your input"
      page: 'final-plan', // where the card and its button go
    }
  }

  if (h.status === 'done') {
    // the hangout already happened
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
    // i'm in the hangout and haven't voted: it's my turn
    if (me && !hasVoted(h, me)) {
      return {
        tone: 'amber', // amber edge, something for me to do
        text: 'Your turn',
        button: 'Cast your vote',
        fill: true, // solid button, so it stands out
        needsYou: true, // counted in "need your input"
        page: 'vote',
      }
    }
    // i've voted (or i'm not in it), so say who we're waiting for
    const waiting = waitingOn(h)
    return {
      tone: 'grey',
      text: waiting.length > 0 ? `Waiting on ${names(waiting)}` : "Everyone's voted", // e.g. "Waiting on Mei & Nic"
      button: 'View',
      fill: false,
      needsYou: false,
      page: 'vote',
    }
  }

  // collecting: everyone adds where they are coming from
  if (me && !me.start_label) {
    // i haven't added mine yet
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
    // i've added mine but nobody else has joined, so the next step is inviting people
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
    page: myStep(h, me), // the card opens the step i'm up to, not always starting points
  }
}
