import { sortKeysDeep } from './kanbanInsightsStaleKey';

/**
 * Stale key for Scrum AI Insights: project, selected sprint, and any field change on issues in that sprint.
 */
export function buildScrumInsightsStaleKey({ projectId, sprintId, issuesInSelectedSprint }) {
  const list = [...(issuesInSelectedSprint ?? [])].sort((a, b) =>
    String(a?.id ?? '').localeCompare(String(b?.id ?? ''), undefined, { numeric: true })
  );
  return JSON.stringify({
    projectId: projectId ?? '',
    sprintId: sprintId ?? '',
    issues: list.map((issue) => sortKeysDeep(issue)),
  });
}
