// Owner: Eashvar (testing; from Ryan's tests). Unit tests for avatarColor (Week 10a): white text
// must be readable on every palette colour, a saved colour wins, and names spread over the palette.
import { describe, it, expect } from 'vitest'
import { avatarColor } from '../avatarColor.js'
import { AVATAR_COLORS } from '../palette.js'

// How readable white text is on a colour like '#0E7C6B' (the WCAG contrast ratio; 4.5 or more is
// readable). Each pair of hex digits is one channel: red, green, blue.
function contrastWithWhite(hex) {
  const channel = (start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  const brightness = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
  return 1.05 / (brightness + 0.05)
}

describe('TestSuite: avatarColor', () => {
  it('Test1: every palette colour is readable with white text', () => {
    for (const colour of AVATAR_COLORS) {
      expect(contrastWithWhite(colour)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('Test2: a saved colour is used when there is one', () => {
    expect(avatarColor('#123456', 'Ryan')).toBe('#123456')
  })

  it('Test3: otherwise the name picks a palette colour, the same one every time', () => {
    expect(avatarColor(null, 'Ryan')).toBe(avatarColor(null, 'Ryan'))
    expect(AVATAR_COLORS).toContain(avatarColor(null, 'Ryan'))
  })

  it('Test4: a saved value that is not a colour is ignored', () => {
    expect(AVATAR_COLORS).toContain(avatarColor('bad', 'Ryan'))
  })

  it('Test5: different names spread over the palette', () => {
    const names = ['Ryan', 'Surya', 'Hugo', 'Eashvar', 'Matrix', 'Nicole', 'Ana', 'Naa']
    const colours = []
    for (const name of names) {
      const colour = avatarColor(null, name)
      if (!colours.includes(colour)) colours.push(colour)
    }
    expect(colours.length).toBeGreaterThan(4)
  })
})
