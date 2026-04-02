/**
 * Smart timestamp formatter — matches the pattern used by GitHub, Linear, and Jira:
 *
 *  < 1 min ago  →  "just now"
 *  < 60 min ago →  "5m ago"
 *  < 24 h ago   →  "3h ago"
 *  ≥ 24 h, same calendar year  →  "Mar 30 at 11:37 PM"   (year omitted — assumed current)
 *  ≥ 24 h, different year      →  "Mar 30, 2025 at 11:37 PM"
 *
 * Returns an empty string for null / undefined / unparseable input.
 */
export function formatSmartTimestamp(isoString) {
  if (!isoString) return '';
  let date;
  try {
    date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
  } catch {
    return '';
  }

  const diffMs   = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1)  return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  // Absolute format — include year only when it differs from today
  const sameYear = date.getFullYear() === new Date().getFullYear();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day   = date.getDate();
  const time  = date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return sameYear
    ? `${month} ${day} at ${time}`
    : `${month} ${day}, ${date.getFullYear()} at ${time}`;
}
