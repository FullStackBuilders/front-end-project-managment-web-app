import { useMemo, useEffect, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { KanbanBoardContent } from "@/components/KanbanBoardContent";
import { sprintApi } from "@/services/sprintApi";
import { applyFilters, SCRUM_BOARD_SPRINT_ALL } from "@/utils/issueFilters";
import { issueSprintId } from "@/utils/scrumBacklogUtils";
import AuthService from "@/services/AuthService";
import { setFilters } from "@/store/issueSlice";

/**
 * Scrum Kanban: default sprint filter is "All" (every ACTIVE sprint). Scope lives in Redux
 * `filtersByView.scrumBoard.sprintId` (`'all'` | sprint id). Active sprints follow API list order.
 *
 * @param {object} props
 * @param {string|number} props.projectId
 */
export default function ScrumBoardView({ projectId }) {
  const dispatch = useDispatch();
  const { loading: issuesLoading } = useSelector((state) => state.issues);
  const allIssues = useSelector((state) => state.issues.issues);
  const scrumFilters = useSelector(
    (state) => state.issues.filtersByView.scrumBoard,
  );

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

  /** ACTIVE sprints only, preserving order from `listByProject`. */
  const activeSprintsInApiOrder = useMemo(
    () => (sprints || []).filter((s) => s.status === "ACTIVE"),
    [sprints],
  );

  const activeIds = useMemo(
    () => new Set(activeSprintsInApiOrder.map((s) => Number(s.id))),
    [activeSprintsInApiOrder],
  );

  const sprintFilterOptions = useMemo(
    () => [
      { id: SCRUM_BOARD_SPRINT_ALL, name: "All" },
      ...activeSprintsInApiOrder.map((s) => ({
        id: Number(s.id),
        name: s.name,
      })),
    ],
    [activeSprintsInApiOrder],
  );

  useEffect(() => {
    if (sprintsLoading || activeSprintsInApiOrder.length === 0) return;

    const sid = scrumFilters.sprintId;
    if (sid === SCRUM_BOARD_SPRINT_ALL) return;
    if (sid == null || sid === undefined) {
      dispatch(
        setFilters({
          view: "scrumBoard",
          filters: { ...scrumFilters, sprintId: SCRUM_BOARD_SPRINT_ALL },
        }),
      );
      return;
    }
    if (!activeIds.has(Number(sid))) {
      dispatch(
        setFilters({
          view: "scrumBoard",
          filters: { ...scrumFilters, sprintId: SCRUM_BOARD_SPRINT_ALL },
        }),
      );
    }
  }, [
    sprintsLoading,
    activeSprintsInApiOrder.length,
    scrumFilters,
    dispatch,
    activeIds,
  ]);

  const boardReady =
    !sprintsLoading &&
    activeSprintsInApiOrder.length > 0 &&
    (scrumFilters.sprintId === SCRUM_BOARD_SPRINT_ALL ||
      activeIds.has(Number(scrumFilters.sprintId)));

  const activeSprintIssues = useMemo(() => {
    return allIssues.filter((issue) => {
      const sid = issueSprintId(issue);
      return sid != null && activeIds.has(sid);
    });
  }, [allIssues, activeIds]);

  const visibleIssues = useMemo(() => {
    if (!boardReady) return [];
    return applyFilters(
      activeSprintIssues,
      scrumFilters,
      AuthService.getCurrentUserId(),
    );
  }, [activeSprintIssues, scrumFilters, boardReady]);

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

  if (activeSprintsInApiOrder.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="font-medium text-gray-800">No active sprint</p>
        <p className="text-sm text-gray-600 mt-2">
          Start one from the Backlog tab to see tasks on the board.
        </p>
      </div>
    );
  }

  if (!boardReady) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <KanbanBoardContent
      projectId={projectId}
      issues={visibleIssues}
      filterView="scrumBoard"
      sprintFilterOptions={sprintFilterOptions}
      showCreateInTodoColumn={false}
    />
  );
}
