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
      button: 'View plan',
      fill: false,
      needsYou: false,
      page: 'final-plan',
    }
  }

  if (h.status === 'voting') {
    const hasVoted = (m) => (h.votes ?? []).some((v) => v.user_id === m.user_id)
    if (me && !hasVoted(me)) {
      return {
        tone: 'amber',
        text: 'Waiting on you',
        button: 'Cast your vote',
        fill: true,
        needsYou: true,
        page: 'vote',
      }
    }
    const waiting = members.filter((m) => !hasVoted(m))
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
      text: 'Waiting on you',
      button: 'Add your location',
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
  const waiting = members.filter((m) => !m.start_label && m.user_id !== myId)
  return {
    tone: 'grey',
    text: waiting.length > 0 ? `Waiting on ${names(waiting)}` : "Everyone's added",
    button: 'View',
    fill: false,
    needsYou: false,
    page: 'starting-points',
  }
}
