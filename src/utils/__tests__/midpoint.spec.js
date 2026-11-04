// Owner: Eashvar (testing; for Nicole's fair-midpoint algorithm). Unit tests for midpoint.js (Week
// 10a): how fair one area is (fairness), ranking the candidate areas for "fairest", "fastest" or
// "cheapest" (rankAreas), the helpers for the first guess (centroid,
// nearestStations), and pairing everyone with their time and cost to the chosen station
// (timesFor), which is saved with the midpoint for "Leave by" on 12. canWorkOutTrip decides when
// someone's own trip can be worked out and saved after the midpoint was found.
import { describe, it, expect } from 'vitest'
import {
  canWorkOutTrip,
  fairness,
  rankAreas,
  centroid,
  nearestStations,
  timesFor,
} from '../midpoint.js'

// Two candidate areas for a group of two. Area A is quicker on average but unfair: one person
// travels 40 min while the other travels 20. Area B is a little slower on average but fair.
const areaA = {
  name: 'Area A',
  lat: 1.35,
  lng: 103.85,
  travelMins: [20, 40],
  travelCosts: [1.5, 2],
}
const areaB = {
  name: 'Area B',
  lat: 1.33,
  lng: 103.84,
  travelMins: [30, 32],
  travelCosts: [2, 2.5],
}

describe('TestSuite: fairness', () => {
  it('Test1: finds the longest trip, the gap and the average', () => {
    expect(fairness([20, 30, 25])).toEqual({ longest: 30, gap: 10, average: 25 })
  })

  it('Test2: the average is rounded to whole minutes', () => {
    expect(fairness([10, 11]).average).toBe(11) // 10.5 rounds up
  })

  it('Test3: everyone travelling the same time has no gap', () => {
    expect(fairness([25, 25, 25]).gap).toBe(0)
  })

  it('Test4: one person on their own has no gap', () => {
    expect(fairness([18])).toEqual({ longest: 18, gap: 0, average: 18 })
  })
})

describe('TestSuite: rankAreas', () => {
  it('Test1: "fairest" puts the area with the shorter longest trip and smaller gap first', () => {
    // A scores 40 + 20 = 60, B scores 32 + 2 = 34, and lower wins
    const ranked = rankAreas([areaA, areaB], 'fairest')
    expect(ranked[0].name).toBe('Area B')
    expect(ranked[0].score).toBe(34)
  })

  it('Test2: "fastest" puts the lowest average trip first', () => {
    expect(rankAreas([areaA, areaB], 'fastest')[0].name).toBe('Area A') // 30 min vs 31 min
  })

  it('Test3: "cheapest" puts the lowest total cost first', () => {
    const ranked = rankAreas([areaB, areaA], 'cheapest')
    expect(ranked[0].name).toBe('Area A')
    expect(ranked[0].totalCost).toBe(3.5)
  })

  it('Test4: "fairest" is the default', () => {
    expect(rankAreas([areaA, areaB])[0].name).toBe('Area B')
  })

  it('Test5: on an equal score, the lower average trip wins', () => {
    // both score 30: C is 30 + 0, D is 25 + 5, but D's average (23) is lower than C's (30)
    const areaC = { name: 'Area C', travelMins: [30, 30], travelCosts: [1, 1] }
    const areaD = { name: 'Area D', travelMins: [20, 25], travelCosts: [1, 1] }
    expect(rankAreas([areaC, areaD])[0].name).toBe('Area D')
  })

  it('Test6: keeps every area, each with its fairness and total cost added', () => {
    const ranked = rankAreas([areaA, areaB])
    expect(ranked).toHaveLength(2)
    expect(ranked[1]).toEqual({
      ...areaA,
      longest: 40,
      gap: 20,
      average: 30,
      totalCost: 3.5,
      score: 60,
    })
  })
})

describe('TestSuite: centroid and nearestStations', () => {
  it('Test1: the centre of two points is halfway between them', () => {
    expect(
      centroid([
        { lat: 1.3, lng: 103.8 },
        { lat: 1.4, lng: 103.9 },
      ]),
    ).toEqual({ lat: 1.35, lng: 103.85 })
  })

  it('Test2: no points have no centre', () => {
    expect(centroid([])).toBe(null)
  })

  it('Test3: the nearest station to Bishan MRT is Bishan', () => {
    const nearest = nearestStations({ lat: 1.3508, lng: 103.8485 }, 3)
    expect(nearest).toHaveLength(3)
    expect(nearest[0].name).toBe('Bishan')
  })
})

describe('TestSuite: timesFor', () => {
  it('Test1: pairs each person with their own time and cost, in order', () => {
    const members = [{ user_id: 'amy' }, { user_id: 'ben' }]
    const station = { travelMins: [20, 35], travelCosts: [1.5, 2.1] }
    expect(timesFor(members, station)).toEqual([
      { user_id: 'amy', mins: 20, cost: 1.5 },
      { user_id: 'ben', mins: 35, cost: 2.1 },
    ])
  })

  it('Test2: no members gives an empty list', () => {
    expect(timesFor([], { travelMins: [], travelCosts: [] })).toEqual([])
  })

  it('Test3: only keeps user_id, mins and cost', () => {
    // toEqual fails if the result has an extra field, like display_name or mode
    const members = [{ user_id: 'amy', display_name: 'Amy', mode: 'bus' }]
    const station = { travelMins: [12], travelCosts: [0.99] }
    expect(timesFor(members, station)).toEqual([{ user_id: 'amy', mins: 12, cost: 0.99 }])
  })

  it("Test4: doesn't change the station passed in", () => {
    const station = { travelMins: [20], travelCosts: [1.5] }
    timesFor([{ user_id: 'amy' }], station)
    expect(station).toEqual({ travelMins: [20], travelCosts: [1.5] })
  })
})

describe('TestSuite: canWorkOutTrip', () => {
  const hangout = { midpoint_lat: 1.35, midpoint_lng: 103.85 }
  const member = { start_lat: 1.36, start_lng: 103.76, mode: 'bus' }

  it('Test1: yes once there is a midpoint, a starting point and a mode', () => {
    expect(canWorkOutTrip(hangout, member)).toBe(true)
  })

  it('Test2: not before the group has a midpoint', () => {
    expect(canWorkOutTrip({ midpoint_lat: null, midpoint_lng: null }, member)).toBe(false)
  })

  it('Test3: not without a starting point', () => {
    expect(canWorkOutTrip(hangout, { ...member, start_lat: null, start_lng: null })).toBe(false)
  })

  it('Test4: not before a mode is picked', () => {
    expect(canWorkOutTrip(hangout, { ...member, mode: null })).toBe(false)
  })
})
