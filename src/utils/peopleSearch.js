// Owner: Surya. How people search results are ordered, like Instagram: closest people first.
// Used by "Who's coming?" (05 New hangout and step 0 Details) and the Friends page search.
// 1. relationship: the page gives each status a number (e.g. friend 0, asked you 1, …)
// 2. names that start with what you typed ("ry" → Ryan) before names that only contain it (Henry)
// 3. the most hangouts together (when the page knows it), then A to Z

/**
 * 0 if the name, or a word in it, starts with what you typed, else 1.
 * @param {string} name e.g. "Ryan Lee"
 * @param {string} text what was typed, already lower case
 */
export function matchRank(name, text) {
  for (const word of name.toLowerCase().split(' ')) {
    if (word.startsWith(text)) {
      return 0
    }
  }
  return 1
}

/**
 * Sort search rows, closest people first (sorts the list it's given, and returns it).
 * @param {Array<{ status: string, display_name: string, together?: number }>} rows
 * @param {string} text what was typed, already lower case
 * @param {Object<string, number>} order a number per status, smaller comes first
 */
export function sortPeople(rows, text, order) {
  rows.sort((a, b) => {
    if (order[a.status] !== order[b.status]) {
      return order[a.status] - order[b.status]
    }
    const rankA = matchRank(a.display_name, text)
    const rankB = matchRank(b.display_name, text)
    if (rankA !== rankB) {
      return rankA - rankB
    }
    const together = (b.together ?? 0) - (a.together ?? 0)
    if (together !== 0) {
      return together
    }
    return a.display_name.localeCompare(b.display_name)
  })
  return rows
}
