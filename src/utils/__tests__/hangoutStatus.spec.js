// Owner: Eashvar (testing; from Ryan's tests). Unit tests for getStatus (Week 10a): which step a
// dashboard card opens, depending on how far I've got.
import { describe, it, expect } from 'vitest'
import { getStatus } from '../hangoutStatus.js'

// a hangout still collecting starting points: me, plus Mei, who hasn't added hers
function hangout(me, extra = {}) {
  return {
    status: 'collecting',
    midpoint_name: null,
    votes: [],
    members: [
      { user_id: 'me', display_name: 'Ryan', ...me },
      { user_id: 'mei', display_name: 'Mei', start_label: null },
    ],
    ...extra,
  }
}

describe('TestSuite: getStatus', () => {
  it('Test1: no starting point yet opens Starting points', () => {
    expect(getStatus(hangout({ start_label: null }), 'me').page).toBe('starting-points')
  })

  it('Test2: a starting point but no mode opens Transport', () => {
    expect(getStatus(hangout({ start_label: 'Bishan MRT' }), 'me').page).toBe('transport')
  })

  it('Test3: a mode but no midpoint yet still opens Transport, where it is found', () => {
    const h = hangout({ start_label: 'Bishan MRT', mode: 'mrt' })
    expect(getStatus(h, 'me').page).toBe('transport')
  })

  it('Test4: once the midpoint is found, it opens Spots', () => {
    const h = hangout({ start_label: 'Bishan MRT', mode: 'mrt' }, { midpoint_name: 'Toa Payoh' })
    expect(getStatus(h, 'me').page).toBe('explore')
  })

  it('Test5: someone not in the hangout lands on Starting points', () => {
    expect(getStatus(hangout({ start_label: 'Bishan MRT' }), 'stranger').page).toBe(
      'starting-points',
    )
  })

  it('Test6: voting and confirmed hangouts open the vote and the final plan', () => {
    expect(getStatus(hangout({ start_label: 'x' }, { status: 'voting' }), 'me').page).toBe('vote')
    expect(getStatus(hangout({ start_label: 'x' }, { status: 'confirmed' }), 'me').page).toBe(
      'final-plan',
    )
  })
})
