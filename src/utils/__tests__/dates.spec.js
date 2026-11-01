// Owner: Eashvar (testing). Unit tests for the dashboard's dates (Week 10a): the heading above each
// day's hangouts and the "how soon" chip on UP NEXT, in Singapore time. Both functions take "now"
// as an argument, so the tests pass in a fixed time instead of faking the clock.
import { describe, it, expect } from 'vitest'
import { dayHeading, countdownLabel } from '../dates.js'

const now = new Date('2026-10-21T10:00:00+08:00') // Wednesday, 10 am in Singapore

describe('TestSuite: dayHeading', () => {
  it('Test1: a hangout later today is under "Today"', () => {
    expect(dayHeading(new Date('2026-10-21T21:00:00+08:00'), now)).toEqual({
      main: 'Today',
      sub: 'Wed 21 Oct',
    })
  })

  it('Test2: a hangout tomorrow is under "Tomorrow"', () => {
    expect(dayHeading(new Date('2026-10-22T19:00:00+08:00'), now)).toEqual({
      main: 'Tomorrow',
      sub: 'Thu 22 Oct',
    })
  })

  it('Test3: a hangout later on is under its date', () => {
    expect(dayHeading(new Date('2026-10-23T19:00:00+08:00'), now)).toEqual({
      main: 'Fri 23 Oct',
      sub: '',
    })
  })

  it('Test4: just after midnight in Singapore already counts as tomorrow', () => {
    // 16:30 on the 21st in UTC is 00:30 on the 22nd in Singapore
    expect(dayHeading(new Date('2026-10-21T16:30:00Z'), now).main).toBe('Tomorrow')
  })
})

describe('TestSuite: countdownLabel', () => {
  it('Test1: later today counts down in hours', () => {
    expect(countdownLabel(new Date('2026-10-21T21:00:00+08:00'), now)).toBe('Today · in 11 hours')
  })

  it('Test2: within the hour counts down in minutes', () => {
    expect(countdownLabel(new Date('2026-10-21T10:25:00+08:00'), now)).toBe('Today · in 25 minutes')
  })

  it('Test3: says "1 minute", not "1 minutes"', () => {
    expect(countdownLabel(new Date('2026-10-21T10:01:00+08:00'), now)).toBe('Today · in 1 minute')
  })

  it('Test4: tomorrow shows the time', () => {
    const label = countdownLabel(new Date('2026-10-22T19:00:00+08:00'), now)
    expect(label).toContain('Tomorrow · ')
    expect(label).toContain('7:00')
  })

  it('Test5: further away counts whole days', () => {
    expect(countdownLabel(new Date('2026-10-25T09:00:00+08:00'), now)).toBe('In 4 days')
  })
})
