// Owner: Ryan. The one place JavaScript holds colour codes, for things CSS variables can't reach:
// Leaflet draws the map shapes itself, and avatars pick their colour in code.
// Everything else uses var(--fp-...) from assets/tokens.css, so no other file has a hex code.

// avatar colours, all dark enough for white text (4.5:1, checked in tests/unit/avatarColor.spec.js)
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

// OneMap's sea colour. Leaflet shows grey wherever there's no map picture (outside Singapore when
// you zoom out on a big screen), so we paint that background like the sea instead.
export const SEA_COLOR = '#6da8e4'

// the dots on BaseMap (09 Nearby spots, 10 Spot details): a white ring round a teal fill (--fp-primary)
export const PIN_RING = '#fff'
export const PIN_FILL = '#0e7c6b'
