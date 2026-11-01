import { describe, expect, it } from 'vitest'
import { matchesHangoutVibe } from '../matchScore.js'

describe('matchesHangoutVibe', () => {
  it('matches every place when no hangout vibes are chosen', () => {
    expect(matchesHangoutVibe({ category: 'food' }, [])).toBe(true)
  })

  it('matches a place that fits a chosen hangout vibe', () => {
    expect(matchesHangoutVibe({ category: 'food', types: ['cafe'] }, ['chill'])).toBe(true)
  })

  it('does not match a place that does not fit a chosen hangout vibe', () => {
    expect(matchesHangoutVibe({ category: 'food', types: ['restaurant'] }, ['chill'])).toBe(false)
  })
})
