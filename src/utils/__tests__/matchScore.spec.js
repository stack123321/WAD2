// Owner: Eashvar (testing; for Matrix's match %). Unit tests for matchScore.js (Week 10a): how well
// a place fits the group, out of 100. The score adds up four parts: the hangout's vibe (34),
// members' preferred activities (17), what the group has voted for before (16) and budget (33).
// A spot closed during the hangout, not step-free for a member who needs it, or outdoors in the
// rain scores 0. A long walk from the midpoint or closing soon lowers the score.
import { describe, it, expect } from 'vitest'
import { matchScore, hardVetoReason, softVetoReasons, matchesHangoutVibe } from '../matchScore.js'

// A cafe at Bishan that fits the group in every way: a "study" vibe (cafes fit it), everyone
// likes cafes, cafes top everyone's vote history, and it's cheap ($, within every budget).
const cafe = { category: 'cafe', types: ['cafe'], priceLevel: 1, lat: 1.3508, lng: 103.8485 }
const cafeLover = { activities: ['cafes'], budget: 2, vote_history: { cafe: 5, restaurant: 2 } }
const group = [cafeLover, { ...cafeLover }]
const studyHangout = { vibes: ['study'] }

describe('TestSuite: matchScore', () => {
  it('Test1: a place that fits the group in every way scores 100', () => {
    expect(matchScore(cafe, group, studyHangout)).toBe(100)
  })

  it('Test2: a place that does not match the vibe loses 34 points', () => {
    expect(matchScore(cafe, group, { vibes: ['active'] })).toBe(66)
  })

  it('Test3: a place over everyone’s budget loses 33 points', () => {
    const pricey = { ...cafe, priceLevel: 3 }
    expect(matchScore(pricey, group, studyHangout)).toBe(67)
  })

  it('Test4: within budget for half the group gets half the budget points', () => {
    const midPriced = { ...cafe, priceLevel: 2 }
    const mixedBudgets = [cafeLover, { ...cafeLover, budget: 1 }]
    // 34 + 17 + 16 + 16.5 = 83.5, rounded to 84
    expect(matchScore(midPriced, mixedBudgets, studyHangout)).toBe(84)
  })

  it('Test5: a long walk from the midpoint lowers the score', () => {
    const atTheMidpoint = { ...studyHangout, midpoint: { lat: 1.3508, lng: 103.8485 } }
    const twoKmAway = { ...studyHangout, midpoint: { lat: 1.3688, lng: 103.8485 } }
    expect(matchScore(cafe, group, atTheMidpoint)).toBe(100)
    // about a 30 min walk takes 40% off
    expect(matchScore(cafe, group, twoKmAway)).toBe(60)
    expect(softVetoReasons(cafe, group, twoKmAway)[0]).toContain('Far from the group')
  })
})

describe('TestSuite: hard vetoes (a score of 0)', () => {
  // Friday 16 Oct, 7 pm in Singapore
  const fridayEvening = { ...studyHangout, startAt: '2026-10-16T19:00:00+08:00' }

  it('Test1: a place closed during the hangout scores 0, and says why', () => {
    const morningsOnly = {
      ...cafe,
      openingHours: {
        periods: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
          open: { day, hour: 6, minute: 0 },
          close: { day, hour: 12, minute: 0 },
        })),
      },
    }
    expect(matchScore(morningsOnly, group, fridayEvening)).toBe(0)
    expect(hardVetoReason(morningsOnly, group, fridayEvening)).toBe(
      "Closed during your hangout's time",
    )
  })

  it('Test2: a place that is not step-free scores 0 if a member needs step-free access', () => {
    const steps = { ...cafe, wheelchairAccessible: false }
    const needsStepFree = [cafeLover, { ...cafeLover, step_free: true }]
    expect(matchScore(steps, needsStepFree, studyHangout)).toBe(0)
  })

  it('Test3: an outdoor place scores 0 in the rain if a member wants indoors', () => {
    const park = { ...cafe, category: 'outdoor', types: ['national_park'] }
    const wantsIndoors = [{ ...cafeLover, indoor_if_rain: true }]
    expect(matchScore(park, wantsIndoors, { ...studyHangout, raining: true })).toBe(0)
    expect(matchScore(park, wantsIndoors, { ...studyHangout, raining: false })).not.toBe(0)
  })

  it('Test4: a place that scores normally has no veto reason', () => {
    expect(hardVetoReason(cafe, group, studyHangout)).toBe(null)
  })
})

describe('TestSuite: closing soon (a soft veto)', () => {
  it('Test1: a place closing within an hour of the start loses half its score', () => {
    // open 10 am to 8 pm; the hangout is 7 pm to 7:45 pm
    const closesAtEight = {
      ...cafe,
      openingHours: {
        periods: [0, 1, 2, 3, 4, 5, 6].map((day) => ({
          open: { day, hour: 10, minute: 0 },
          close: { day, hour: 20, minute: 0 },
        })),
      },
    }
    const context = {
      ...studyHangout,
      startAt: '2026-10-16T19:00:00+08:00',
      endAt: '2026-10-16T19:45:00+08:00',
    }
    expect(matchScore(closesAtEight, group, context)).toBe(50)
    expect(softVetoReasons(closesAtEight, group, context)).toContain(
      'Closes within an hour of your hangout starting',
    )
  })
})

describe('TestSuite: matchesHangoutVibe', () => {
  it('Test1: a cafe fits a "study" hangout', () => {
    expect(matchesHangoutVibe(cafe, ['study'])).toBeTruthy()
  })

  it('Test2: a cafe does not fit an "active" hangout', () => {
    expect(matchesHangoutVibe(cafe, ['active'])).toBeFalsy()
  })

  it('Test3: a hangout with no vibe matches nothing', () => {
    expect(matchesHangoutVibe(cafe, [])).toBeFalsy()
  })
})
