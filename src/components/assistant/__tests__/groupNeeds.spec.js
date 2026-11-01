// Owner: Eashvar (testing). Unit tests for groupNeeds (Week 10a): what the whole group needs from
// a spot, for the Ask box on 09.
import { describe, it, expect } from 'vitest'
import { groupNeeds } from '../groupNeeds.js'

describe('TestSuite: groupNeeds', () => {
  it('Test1: one halal member makes the whole group need halal', () => {
    const members = [{ dietary: ['halal'] }, { dietary: [] }, {}]
    expect(groupNeeds(members).dietary).toEqual(['halal'])
  })

  it('Test2: a need shared by two members is only listed once', () => {
    const members = [{ dietary: ['vegetarian'] }, { dietary: ['vegetarian', 'halal'] }]
    const needs = groupNeeds(members).dietary
    expect(needs).toHaveLength(2)
    expect(needs).toContain('halal')
    expect(needs).toContain('vegetarian')
  })

  it('Test3: the budget is the lowest one anyone picked', () => {
    const members = [{ budget: 3 }, { budget: 1 }, { budget: null }]
    expect(groupNeeds(members).maxPrice).toBe(1)
  })

  it('Test4: there is no budget limit when nobody picked one', () => {
    expect(groupNeeds([{}, { budget: null }]).maxPrice).toBe(null)
  })

  it('Test5: counts everyone in the group', () => {
    expect(groupNeeds([{}, {}, {}])).toEqual({ size: 3, dietary: [], maxPrice: null })
  })
})
