// Owner: Eashvar (testing). Unit tests for the voting helpers (Week 10a): counting votes, the
// leader and ties, the debrief's one-line summary, trip times and costs, and the countdown.
import { describe, it, expect } from 'vitest'
import {
  countableVotes,
  countVotes,
  pickLeader,
  isTied,
  tiedLeaders,
  runnerUp,
  decisionSummary,
  timeLeft,
  tripRange,
  leaveBy,
  modeLabel,
  formatCost,
} from '../voteHelpers.js'

// three shortlisted spots; Coffee has the best group match
const hawker = { id: 's1', name: 'Hawker', match_pct: 70 }
const coffee = { id: 's2', name: 'Coffee', match_pct: 90 }
const bowling = { id: 's3', name: 'Bowling', match_pct: 60 }
const shortlist = [hawker, coffee, bowling]

// rows like countVotes() returns: one per spot with its number of votes
function rows(hawkerVotes, coffeeVotes, bowlingVotes) {
  return [
    { spot: hawker, count: hawkerVotes },
    { spot: coffee, count: coffeeVotes },
    { spot: bowling, count: bowlingVotes },
  ]
}

describe('TestSuite: countableVotes', () => {
  const members = [{ user_id: 'amy' }, { user_id: 'ben' }]

  it('Test1: keeps only the latest vote from each member', () => {
    const votes = [
      { user_id: 'amy', shortlist_id: 's1', voted_at: '2026-10-14T10:00:00Z' },
      { user_id: 'amy', shortlist_id: 's2', voted_at: '2026-10-14T11:00:00Z' },
    ]
    const kept = countableVotes(votes, members)
    expect(kept).toHaveLength(1)
    expect(kept[0].shortlist_id).toBe('s2')
  })

  it('Test2: ignores votes from someone who left the hangout', () => {
    const votes = [{ user_id: 'cara', shortlist_id: 's1', voted_at: '2026-10-14T10:00:00Z' }]
    expect(countableVotes(votes, members)).toHaveLength(0)
  })
})

describe('TestSuite: countVotes', () => {
  it('Test1: counts the votes for each spot, including spots with none', () => {
    const votes = [{ shortlist_id: 's1' }, { shortlist_id: 's1' }, { shortlist_id: 's2' }]
    expect(countVotes(shortlist, votes)).toEqual(rows(2, 1, 0))
  })
})

describe('TestSuite: pickLeader', () => {
  it('Test1: picks the spot with the most votes', () => {
    expect(pickLeader(rows(3, 1, 0)).spot).toBe(hawker)
  })

  it('Test2: on equal votes, picks the higher group match', () => {
    expect(pickLeader(rows(2, 2, 0)).spot).toBe(coffee)
  })

  it('Test3: has no leader when nothing is shortlisted', () => {
    expect(pickLeader([])).toBe(null)
  })
})

describe('TestSuite: isTied and tiedLeaders', () => {
  it('Test1: two spots with the most votes are a tie', () => {
    expect(isTied(rows(2, 2, 1))).toBeTruthy()
    expect(tiedLeaders(rows(2, 2, 1))).toEqual([hawker, coffee])
  })

  it('Test2: a clear winner is not a tie', () => {
    expect(isTied(rows(3, 2, 1))).toBeFalsy()
    expect(tiedLeaders(rows(3, 2, 1))).toHaveLength(0)
  })

  it('Test3: no votes at all is not a tie', () => {
    expect(isTied(rows(0, 0, 0))).toBeFalsy()
  })

  it('Test4: a three-way tie includes all three spots', () => {
    expect(tiedLeaders(rows(1, 1, 1))).toHaveLength(3)
  })
})

describe('TestSuite: runnerUp', () => {
  it('Test1: is the best spot apart from the one picked', () => {
    expect(runnerUp(rows(3, 2, 1), 's1').spot).toBe(coffee)
  })
})

describe('TestSuite: decisionSummary', () => {
  it('Test1: says when a spot simply got the most votes', () => {
    expect(decisionSummary(rows(3, 1, 0), 's1')).toBe('Hawker got the most votes: 3 of 4.')
  })

  it('Test2: says when a tie was settled', () => {
    expect(decisionSummary(rows(2, 2, 0), 's2')).toContain('2 spots tied on 2 votes')
  })

  it('Test3: says when the host picked a spot that was not leading', () => {
    expect(decisionSummary(rows(3, 1, 0), 's3')).toBe('The host picked Bowling (0 of 4 votes).')
  })

  it('Test4: says when the host picked before anyone voted', () => {
    expect(decisionSummary(rows(0, 0, 0), 's2')).toContain('before anyone voted')
  })

  it('Test5: gives nothing when no spot was picked', () => {
    expect(decisionSummary(rows(1, 0, 0), null)).toBe(null)
  })
})

describe('TestSuite: timeLeft', () => {
  const now = new Date('2026-10-14T12:00:00+08:00').getTime()

  it('Test1: shows days and hours when more than a day is left', () => {
    expect(timeLeft('2026-10-16T15:00:00+08:00', now)).toBe('2d 3h')
  })

  it('Test2: shows hours and minutes when less than a day is left', () => {
    expect(timeLeft('2026-10-14T13:30:00+08:00', now)).toBe('1h 30m')
  })

  it('Test3: shows minutes when less than an hour is left', () => {
    expect(timeLeft('2026-10-14T12:05:00+08:00', now)).toBe('5 min')
  })

  it('Test4: gives nothing once the deadline has passed', () => {
    expect(timeLeft('2026-10-14T11:00:00+08:00', now)).toBe(null)
  })
})

describe('TestSuite: tripRange', () => {
  it('Test1: finds the longest and shortest trip and the gap between them', () => {
    const members = [
      { display_name: 'Amy', travel_mins: 18 },
      { display_name: 'Ben', travel_mins: 25 },
      { display_name: 'Cara', travel_mins: 21 },
    ]
    const range = tripRange(members)
    expect(range.longest).toBe(25)
    expect(range.shortest).toBe(18)
    expect(range.gap).toBe(7)
    expect(range.longestNames).toEqual(['Ben'])
  })

  it('Test2: gives nothing when no trip times are known yet', () => {
    expect(tripRange([{ display_name: 'Amy', travel_mins: null }])).toBe(null)
  })
})

describe('TestSuite: leaveBy', () => {
  it('Test1: is the start time minus the trip', () => {
    expect(leaveBy('2026-10-16T11:00:00.000Z', 25)).toBe('2026-10-16T10:35:00.000Z')
  })
})

describe('TestSuite: modeLabel and formatCost', () => {
  it('Test1: names each way of travelling', () => {
    expect(modeLabel('mrt')).toBe('MRT')
    expect(modeLabel('car')).toBe('Car')
    expect(modeLabel('plane')).toBe('—')
  })

  it('Test2: shows a fare in Singapore dollars', () => {
    expect(formatCost(1.5, 'mrt')).toBe('S$1.50')
  })

  it('Test3: shows driving as the hourly parking rate', () => {
    expect(formatCost(1.2, 'car')).toBe('S$1.20/h parking')
  })

  it('Test4: shows a dash when the cost is unknown', () => {
    expect(formatCost(null, 'bus')).toBe('—')
    expect(formatCost(null, 'bus')).not.toContain('S$')
  })
})
