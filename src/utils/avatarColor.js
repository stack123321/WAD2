// Owner: Ryan
// the colour an avatar shows: the saved one, or one picked from the name. The palette is in utils/palette.js
import { AVATAR_COLORS } from './palette'

// the colour to show: the saved one if it looks like #rrggbb, otherwise one picked from the name.
// The same name always gives the same colour, so it stays put across pages and refreshes.
export function avatarColor(saved, name) {
  if (/^#[0-9a-f]{6}$/i.test(saved ?? '')) return saved // # then 6 hex digits, any case
  // turn the name into a number, the same name always gives the same number
  let hash = 0
  for (const ch of name ?? '') hash = (hash * 31 + ch.charCodeAt(0)) >>> 0 // >>> 0 keeps it a positive whole number
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] // the remainder picks one of the 16 colours
}
