import { useMemo, useEffect, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { sprintApi } from "@/services/sprintApi";
import { getScrumSprintIdsFilter } from "@/utils/issueFilters";
import { setFilters, selectScrumListFilteredIssues } from "@/store/issueSlice";
import IssueListView from "@/components/IssueListView";

/**
 * Scrum project List tab: issues in ACTIVE + COMPLETED sprints, sprint filter includes completed names.
 */
export default function ScrumListView({ projectId }) {
  const dispatch = useDispatch();
  const issues = useSelector(selectScrumListFilteredIssues);
  const scrumListFilters = useSelector(
    (state) => state.issues.filtersByView.scrumList,
  );
  const { loading: issuesLoading } = useSelector((state) => state.issues);

  const [sprints, setSprints] = useState([]);
  const [sprintsLoading, setSprintsLoading] = useState(true);
  const [sprintsError, setSprintsError] = useState(null);

  const loadSprints = useCallback(async () => {
    setSprintsLoading(true);
    setSprintsError(null);
    try {
      const list = await sprintApi.listByProject(projectId);
      setSprints(Array.isArray(list) ? list : []);
    } catch (e) {
      setSprintsError(e?.message || "Failed to load sprints");
      setSprints([]);
    } finally {
      setSprintsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSprints();
  }, [loadSprints]);

  const listScopeSprints = useMemo(
    () =>
      (sprints || []).filter(
        (s) => s.status === "ACTIVE" || s.status === "COMPLETED",
      ),
    [sprints],
  );

  const knownSprintIds = useMemo(
    () => new Set(listScopeSprints.map((s) => Number(s.id))),
    [listScopeSprints],
  );

  const sprintFilterOptions = useMemo(
    () =>
      listScopeSprints.map((s) => ({
        id: Number(s.id),
        name: s.name,
        status: s.status,
      })),
    [listScopeSprints],
  );

  useEffect(() => {
    if (sprintsLoading) return;
    const ids = getScrumSprintIdsFilter(scrumListFilters);
    const pruned = ids.filter((id) => knownSprintIds.has(Number(id)));
    if (pruned.length !== ids.length) {
      const { sprintId: _legacy, ...rest } = scrumListFilters;
      dispatch(
        setFilters({
          view: "scrumList",
          filters: { ...rest, sprintIds: pruned },
        }),
      );
    }
  }, [sprintsLoading, knownSprintIds, scrumListFilters, dispatch]);

  if (sprintsLoading || issuesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  if (sprintsError) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-sm text-red-600">{sprintsError}</p>
      </div>
    );
  }

  return (
    <IssueListView
      projectId={projectId}
      issues={issues}
      filterView="scrumList"
      sprintFilterOptions={sprintFilterOptions}
      variant="scrum"
    />
  );
}
