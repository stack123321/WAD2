// Owner: Ryan
// names go inside html (the map pins), so turn < > & " ' into safe text first.
// Shared by UpNextMap, CrowdHeatmap and MembersMap
export function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
