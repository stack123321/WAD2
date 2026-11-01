// Owner: Eashvar (testing; for Surya's weather). Unit tests for psiLevel (Week 10a): NEA's haze
// bands for a PSI reading.
import { describe, it, expect } from 'vitest'
import { psiLevel } from '../weather.js'

describe('TestSuite: psiLevel', () => {
  it('Test1: 50 and under is Good', () => {
    expect(psiLevel(50)).toEqual({ level: 'Good', tone: 'good' })
  })

  it('Test2: 51 to 100 is Moderate', () => {
    expect(psiLevel(51).level).toBe('Moderate')
    expect(psiLevel(100).level).toBe('Moderate')
  })

  it('Test3: 101 to 200 is Unhealthy', () => {
    expect(psiLevel(184)).toEqual({ level: 'Unhealthy', tone: 'bad' })
  })

  it('Test4: 201 to 300 is Very unhealthy', () => {
    expect(psiLevel(250).level).toBe('Very unhealthy')
  })

  it('Test5: over 300 is Hazardous', () => {
    expect(psiLevel(301).level).toBe('Hazardous')
  })
})
