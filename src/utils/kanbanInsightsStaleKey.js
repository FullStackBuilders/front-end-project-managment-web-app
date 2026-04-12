/**
 * Deep-sort object keys so JSON.stringify is stable across key order differences.
 * @param {unknown} value
 * @returns {unknown}
 */
function sortKeysDeep(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      acc[key] = sortKeysDeep(value[key]);
      return acc;
    }, {});
}

/**
 * Client-side stale key for Kanban AI Insights: any change to project, metrics time
 * range, or any field on any issue invalidates cached sections.
 *
 * @param {{ projectId?: string, timeRange: string, issues: unknown[] }} args
 * @returns {string}
 */
export function buildKanbanInsightsStaleKey({ projectId, timeRange, issues }) {
  const list = [...(issues ?? [])].sort((a, b) =>
    String(a?.id ?? '').localeCompare(String(b?.id ?? ''), undefined, { numeric: true })
  );
  return JSON.stringify({
    projectId: projectId ?? '',
    timeRange,
    issues: list.map((issue) => sortKeysDeep(issue)),
  });
}
