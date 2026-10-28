// Owner: Ryan
// avatar colours, all dark enough for white text (4.5:1, checked in tests/e2e/avatarColor.spec.js)
export const AVATAR_COLORS = [
  '#0E7C6B',
  '#2F6FDE',
  '#6C4FD6',
  '#B3358A',
  '#C2410C',
  '#B42318',
  '#3F7D20',
  '#0E7490',
  '#7A4A1E',
  '#475569',
  '#1D4ED8',
  '#9333EA',
  '#BE185D',
  '#A16207',
  '#047857',
  '#B91C1C',
]

// the colour to show: the saved one if it looks like #rrggbb, otherwise one picked from the name.
// The same name always gives the same colour, so it stays put across pages and refreshes.
export function avatarColor(saved, name) {
  if (/^#[0-9a-f]{6}$/i.test(saved ?? '')) return saved // # then 6 hex digits, any case
  // turn the name into a number, the same name always gives the same number
  let hash = 0
  for (const ch of name ?? '') hash = (hash * 31 + ch.charCodeAt(0)) >>> 0 // >>> 0 keeps it a positive whole number
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] // the remainder picks one of the 16 colours
}
