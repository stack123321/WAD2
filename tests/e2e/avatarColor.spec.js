// Owner: Ryan
// avatar colours: white text must be readable on every palette colour (plain functions, no page)
import { test, expect } from '@playwright/test'
import { AVATAR_COLORS, avatarColor } from '../../src/utils/avatarColor.js'

const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
function contrastWithWhite(hex) {
  const n = parseInt(hex.slice(1), 16)
  const lum = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return 1.05 / (lum + 0.05)
}

test('every palette colour is readable with white text', () => {
  for (const c of AVATAR_COLORS) expect(contrastWithWhite(c), c).toBeGreaterThanOrEqual(4.5)
})

test('a saved colour wins, otherwise the name decides, the same every time', () => {
  expect(avatarColor('#123456', 'Ryan')).toBe('#123456')
  expect(avatarColor(null, 'Ryan')).toBe(avatarColor(null, 'Ryan'))
  expect(AVATAR_COLORS).toContain(avatarColor('bad', 'Ryan'))
})

test('names spread over the palette', () => {
  const names = ['Ryan', 'Surya', 'Hugo', 'Eashvar', 'Matrix', 'Nicole', 'Ana', 'Naa']
  expect(new Set(names.map((n) => avatarColor(null, n))).size).toBeGreaterThan(4)
})
