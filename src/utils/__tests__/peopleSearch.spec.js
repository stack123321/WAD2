// Owner: Surya. Unit tests for the people search order (utils/peopleSearch.js): relationship
// first, then names that start with what you typed, then hangouts together, then A to Z.
import { describe, it, expect } from 'vitest'
import { matchRank, sortPeople } from '../peopleSearch.js'

const ORDER = { friend: 0, request: 1, pending: 2, none: 3 }

function names(rows) {
  return rows.map((r) => r.display_name)
}

describe('matchRank', () => {
  it('Test1: a name, or any word in it, that starts with the text comes first', () => {
    expect(matchRank('Ryan', 'ry')).toBe(0)
    expect(matchRank('Ryan Lee', 'le')).toBe(0)
    expect(matchRank('Henry', 'ry')).toBe(1)
  })
})

describe('sortPeople', () => {
  it('Test2: friends come before people who asked you, then requested, then everyone else', () => {
    const rows = [
      { display_name: 'Ryder', status: 'none' },
      { display_name: 'Rylee', status: 'request' },
      { display_name: 'Ryan', status: 'friend' },
      { display_name: 'Ryo', status: 'pending' },
    ]
    expect(names(sortPeople(rows, 'ry', ORDER))).toEqual(['Ryan', 'Rylee', 'Ryo', 'Ryder'])
  })

  it('Test3: inside a group, "starts with" beats "contains" even against A to Z', () => {
    const rows = [
      { display_name: 'Henry', status: 'friend' },
      { display_name: 'Ryan', status: 'friend' },
    ]
    expect(names(sortPeople(rows, 'ry', ORDER))).toEqual(['Ryan', 'Henry'])
  })

  it('Test4: then the most hangouts together, then A to Z', () => {
    const rows = [
      { display_name: 'Ryan B', status: 'friend', together: 1 },
      { display_name: 'Ryan A', status: 'friend', together: 1 },
      { display_name: 'Ryan C', status: 'friend', together: 4 },
    ]
    expect(names(sortPeople(rows, 'ry', ORDER))).toEqual(['Ryan C', 'Ryan A', 'Ryan B'])
  })
})
