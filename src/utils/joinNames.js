// Owner: Ryan
// A list of names as one phrase: "Ryan", "Ryan and Nicole", "Ryan, Nicole and Hugo" ('' for none).
// Shared by 05 New hangout, 06 Starting points, 07 Transport, 11 Vote, the spin wheel and the Debrief
export function joinNames(names) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
