// Owner: Matrix. How well a place fits the group's preferences, as a 0–100 match %.
// Used by 09 Nearby spots and 10 Spot details. Pure function: no API calls.

/**
 * @param {object} place a shortlist-shaped place (category, price_level, ...)
 * @param {Array<object>} profiles members' preference rows from the profiles table
 * @param {{ raining?: boolean, crowdLevel?: 'l' | 'm' | 'h' }} [context] live conditions
 * @returns {number} 0–100
 */
export function matchScore(_place, _profiles, _context = {}) {
  // TODO(Matrix) (drop the _ from the parameter names once used): score activities, dietary, budget, indoor-if-rain, avoid-crowds
  return 0
}
