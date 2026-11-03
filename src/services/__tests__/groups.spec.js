// Owner: Eashvar (testing). Unit tests for usualTrips in services/groups.js (Week 10a): where each
// person usually starts from when a hangout is planned with their friend group. It's the usual
// start they saved for the group, or else where they started from in the group's most recent
// hangout (keeping their own usual way of travelling), or nothing.
import { describe, it, expect } from 'vitest'
import { usualTrips } from '../groups.js'

// a starting point in one of the group's past hangouts
const row = (id, label, mode) => ({
  user_id: id,
  start_label: label,
  start_lat: 1.3,
  start_lng: 103.8,
  mode,
})

const group = {
  members: [
    { user_id: 'a', start_label: 'Bedok MRT', start_lat: 1.32, start_lng: 103.93, mode: null },
    { user_id: 'b', start_label: null, start_lat: null, start_lng: null, mode: 'walk' },
    { user_id: 'c', start_label: null, start_lat: null, start_lng: null, mode: null },
  ],
}

const hangouts = [
  {
    starts_at: '2026-09-01T19:00:00+08:00',
    members: [row('a', 'Old', 'bus'), row('b', 'Old B', 'bus')],
  },
  { starts_at: '2026-10-01T19:00:00+08:00', members: [row('b', 'Newer B', 'car')] },
]

describe('TestSuite: usualTrips', () => {
  it('Test1: a usual start saved for the group comes first', () => {
    expect(usualTrips(group, hangouts).a).toEqual({
      label: 'Bedok MRT',
      lat: 1.32,
      lng: 103.93,
      mode: null,
      fromLast: false,
    })
  })

  it("Test2: with none saved, it's the most recent hangout's start, with their own usual mode", () => {
    expect(usualTrips(group, hangouts).b).toEqual({
      label: 'Newer B',
      lat: 1.3,
      lng: 103.8,
      mode: 'walk',
      fromLast: true,
    })
  })

  it('Test3: someone with no start saved and no past hangouts gets nothing', () => {
    expect(usualTrips(group, hangouts).c).toBe(null)
  })

  it('Test4: with no past hangouts, only saved starts are filled in', () => {
    const trips = usualTrips(group)
    expect(trips.a.label).toBe('Bedok MRT')
    expect(trips.b).toBe(null)
  })
})
