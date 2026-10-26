// Owner: Ryan
// where a dashboard card goes: the step I'm up to (plain functions, no page)
import { test, expect } from '@playwright/test'
import { getStatus } from '../../src/utils/hangoutStatus.js'

// a hangout still collecting starting points, me plus Mei, who hasn't added hers
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

test('no starting point yet: Starting points', () => {
  expect(getStatus(hangout({ start_label: null }), 'me').page).toBe('starting-points')
})

test('starting point added but no mode: Transport', () => {
  expect(getStatus(hangout({ start_label: 'Bishan MRT' }), 'me').page).toBe('transport')
})

test('mode picked but nobody has found the midpoint: still Transport, where that happens', () => {
  const h = hangout({ start_label: 'Bishan MRT', mode: 'mrt' })
  expect(getStatus(h, 'me').page).toBe('transport')
})

test('midpoint found: Spots', () => {
  const h = hangout({ start_label: 'Bishan MRT', mode: 'mrt' }, { midpoint_name: 'Toa Payoh' })
  expect(getStatus(h, 'me').page).toBe('explore')
})

test('someone not in the hangout still lands on Starting points', () => {
  expect(getStatus(hangout({ start_label: 'Bishan MRT' }), 'stranger').page).toBe('starting-points')
})

test('voting and confirmed hangouts keep their pages', () => {
  expect(getStatus(hangout({ start_label: 'x' }, { status: 'voting' }), 'me').page).toBe('vote')
  expect(getStatus(hangout({ start_label: 'x' }, { status: 'confirmed' }), 'me').page).toBe(
    'final-plan',
  )
})
