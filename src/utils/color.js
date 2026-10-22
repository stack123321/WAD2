// Owner: Ryan
// picks the initial's colour for an avatar: the surface colour only when it is readable (4.5:1) on the avatar colour
export function readableInk(bg) {
  // no colour, or not a plain #rrggbb: the grey plain avatar keeps the surface colour
  if (!/^#[0-9a-f]{6}$/i.test(bg ?? '')) return 'var(--fp-surface)'
  const n = parseInt(bg.slice(1), 16)
  const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  const lum = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return 1.05 / (lum + 0.05) >= 4.5 ? 'var(--fp-surface)' : 'var(--fp-ink)'
}
