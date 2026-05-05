import { useState, useMemo, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, MoreHorizontal, Sparkles } from "lucide-react";
import IssueCard from "./IssueCard";
import CreateIssueModal from "./CreateIssueModal";
import EditTaskModal from "./EditTaskModal";
import ErrorModal from "./ErrorModal";
import IssueFilterButton from "./IssueFilterButton";
import { updateIssueStatus, moveIssue, rollbackIssueMove } from "../store/issueSlice";
import { countActiveFilters, EMPTY_STATE_FILTER_ACTIVE_MESSAGE } from "../utils/issueFilters";
import { projectApi } from "../services/projectApi";
import { parseWipLimitWholeNumber, isWipLimitExceeded } from "../utils/wipLimits";

const COLUMNS = [
  { id: "TO_DO", title: "To Do", color: "bg-gray-100" },
  { id: "IN_PROGRESS", title: "In Progress", color: "bg-blue-100" },
  { id: "DONE", title: "Done", color: "bg-green-100" },
];

const COLUMN_ID_SET = new Set(COLUMNS.map((c) => c.id));

/**
 * Prefer the target under the pointer (fixes empty column space and avoids
 * closestCorners picking a neighbouring column e.g. Done instead of In Progress).
 */
function kanbanCollisionDetection(args) {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) {
    const overCard = pointerHits.find((h) => !COLUMN_ID_SET.has(String(h.id)));
    if (overCard) return [overCard];
    const overColumn = pointerHits.find((h) => COLUMN_ID_SET.has(String(h.id)));
    if (overColumn) return [overColumn];
  }
  return closestCorners(args);
}

function SortableIssueCard({ issue, projectId, onEditIssue }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? "rotate-3 shadow-lg z-10" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-x-0 top-0 h-8 cursor-grab hover:bg-gray-100 hover:bg-opacity-50 rounded-t-lg z-10 flex items-center justify-center group transition-colors"
        aria-label="Drag to move issue"
      >
        <div className="opacity-0 group-hover:opacity-60 transition-opacity">
          <GripVertical className="w-4 h-4 text-gray-500" />
        </div>
      </div>

      <div className="pt-8">
        <IssueCard issue={issue} projectId={projectId} onEditIssue={onEditIssue} />
      </div>
    </div>
  );
}

function ColumnLimitMenu({
  column,
  currentLimit,
  onSaveLimit,
  onClearLimit,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const [draftLimit, setDraftLimit] = useState(
    currentLimit != null ? String(currentLimit) : "",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setDraftLimit(currentLimit != null ? String(currentLimit) : "");
      setError("");
    }
  }, [open, currentLimit]);

  const handleSave = async () => {
    const parsed = parseWipLimitWholeNumber(draftLimit);
    if (parsed == null || Number.isNaN(parsed)) {
      setError("Enter a whole number of 1 or more.");
      return;
    }
    setError("");
    const ok = await onSaveLimit(column.id, parsed);
    if (ok) setOpen(false);
  };

  const handleClear = async () => {
    setError("");
    const ok = await onClearLimit(column.id);
    if (ok) setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        aria-label={`Set task limit for ${column.title}`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-md border border-gray-200 bg-white p-3 shadow-lg">
          <p className="text-sm text-gray-700 mb-3">
            Set the maximum number of tasks allowed in this column.
          </p>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor={`wip-limit-input-${column.id}`}
              className="text-sm font-medium text-gray-700"
            >
              Maximum Task Limit
            </label>
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="text-xs text-primary hover:underline disabled:opacity-50"
            >
              Clear Limit
            </button>
          </div>
          <input
            id={`wip-limit-input-${column.id}`}
            type="number"
            min="1"
            step="1"
            value={draftLimit}
            onChange={(e) => {
              setDraftLimit(e.target.value);
              setError("");
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter limit"
          />
          <p className="mt-2 text-xs text-gray-500">
            This column will be highlighted when the limit is exceeded.
          </p>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={disabled}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={disabled}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DroppableColumn({
  column,
  issues,
  projectId,
  onCreateIssue,
  onEditIssue,
  showCreate,
  wipLimit,
  isExceeded,
  onSaveLimit,
  onClearLimit,
  isUpdatingLimit,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={`${
          isExceeded ? "bg-red-100" : column.color
        } shrink-0 rounded-t-lg p-4 border-b border-l border-r ${
          isExceeded ? "border-red-300" : "border-gray-200"
        }`}
      >
        {isExceeded && (
          <div className="mb-3 rounded-md border border-red-300 bg-white px-2 py-1">
            <p className="text-xs font-medium text-red-700">
              Maximum Task Limit Exceeded
            </p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-800 flex items-center gap-2">
            <span>{column.title}</span>
            {wipLimit != null && (
              <span className="inline-flex items-center rounded-sm bg-orange-300 px-2 py-0.5 text-[11px] font-semibold text-orange-950">
                Max: {wipLimit}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded-full">
              {issues?.length || 0}
            </span>
            <ColumnLimitMenu
              column={column}
              currentLimit={wipLimit}
              onSaveLimit={onSaveLimit}
              onClearLimit={onClearLimit}
              disabled={isUpdatingLimit}
            />
          </div>
        </div>

        {column.id === "TO_DO" && showCreate && (
          <Button
            onClick={onCreateIssue}
            className="w-full mt-3 flex items-center justify-center gap-2 text-sm"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            Create Task
          </Button>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[min(420px,50vh)] flex-1 flex-col p-4 rounded-b-lg border-l border-r border-b transition-colors ${
          isExceeded
            ? "bg-red-50 border-red-300"
            : isOver
              ? "bg-blue-50 border-blue-300"
              : "bg-gray-50 border-gray-200"
        }`}
      >
        <SortableContext
          items={issues?.map((issue) => issue.id) || []}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-3">
            {issues?.map((issue) => (
              <SortableIssueCard
                key={issue.id}
                issue={issue}
                projectId={projectId}
                onEditIssue={onEditIssue}
              />
            ))}
          </div>
        </SortableContext>

        {(!issues || issues.length === 0) && (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-sm">No Tasks</p>
            {column.id === "TO_DO" && showCreate && (
              <p className="text-xs mt-1">Create your first task!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Kanban columns + DnD; issues are pre-filtered by the parent (board or scrum sprint scope).
 *
 * @param {object} props
 * @param {string} props.projectId
 * @param {object[]} props.issues
 * @param {'board'|'scrumBoard'} props.filterView - IssueFilterButton + Redux filters key
 * @param {{ id: number; name: string; status?: string }[]} [props.sprintFilterOptions] - sprints for scrum filter popover
 * @param {boolean} [props.showCreateInTodoColumn=true]
 */
export function KanbanBoardContent({
  projectId,
  issues,
  filterView,
  sprintFilterOptions,
  showCreateInTodoColumn = true,
  onFetchPlan,
  planLoading = false,
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [dragError, setDragError] = useState(null);
  const [wipLimitError, setWipLimitError] = useState(null);
  const [columnLimits, setColumnLimits] = useState({});
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [savingLimitForColumn, setSavingLimitForColumn] = useState(null);

  const dispatch = useDispatch();
  const { currentProject } = useSelector((state) => state.project);
  const boardViewFilters = useSelector((state) => state.issues.filtersByView[filterView]);
  const boardFiltersActive = countActiveFilters(boardViewFilters) > 0;

  const allMembers = useMemo(() => {
    const owner = currentProject?.owner;
    const team = currentProject?.team || [];
    if (!owner) return team;
    const seen = new Set([owner.id]);
    return [owner, ...team.filter((m) => !seen.has(m.id))];
  }, [currentProject]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    if (dragError) {
      const timer = setTimeout(() => setDragError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [dragError]);

  const loadColumnLimits = useCallback(async () => {
    setLimitsLoading(true);
    try {
      const limits = await projectApi.getBoardColumnLimits(projectId);
      const mapped = Array.isArray(limits)
        ? limits.reduce((acc, item) => {
            if (item?.status) {
              acc[item.status] = item.wipLimit ?? null;
            }
            return acc;
          }, {})
        : {};
      setColumnLimits(mapped);
    } catch (error) {
      console.error("Failed to load board column limits", error);
    } finally {
      setLimitsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    void loadColumnLimits();
  }, [projectId, loadColumnLimits]);

  const groupedIssues = useMemo(() => {
    const grouped = { TO_DO: [], IN_PROGRESS: [], DONE: [] };
    issues.forEach((issue) => {
      if (grouped[issue.status]) {
        grouped[issue.status].push(issue);
      }
    });
    return grouped;
  }, [issues]);

  const exceededByColumn = useMemo(() => {
    const result = {};
    COLUMNS.forEach((column) => {
      const limit = columnLimits[column.id];
      const count = groupedIssues[column.id]?.length ?? 0;
      result[column.id] = isWipLimitExceeded(limit, count);
    });
    return result;
  }, [columnLimits, groupedIssues]);

  const saveColumnLimit = async (status, limitValue) => {
    setSavingLimitForColumn(status);
    try {
      const response = await projectApi.updateBoardColumnLimit(
        projectId,
        status,
        limitValue,
      );
      setColumnLimits((prev) => ({
        ...prev,
        [status]: response?.wipLimit ?? limitValue,
      }));
      return true;
    } catch (error) {
      setWipLimitError(error?.message || "Only project owners and admins can update the Maximum Task Limit.");
      return false;
    } finally {
      setSavingLimitForColumn(null);
    }
  };

  const clearColumnLimit = async (status) => {
    setSavingLimitForColumn(status);
    try {
      await projectApi.clearBoardColumnLimit(projectId, status);
      setColumnLimits((prev) => ({ ...prev, [status]: null }));
      return true;
    } catch (error) {
      setWipLimitError(error?.message || "Only project owners and admins can update the Maximum Task Limit.");
      return false;
    } finally {
      setSavingLimitForColumn(null);
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeIdVal = active.id;
    const overId = over.id;

    const activeIssue = issues.find((issue) => issue.id === activeIdVal);
    if (!activeIssue) return;

    const originalStatus = activeIssue.status;

    let targetColumn = null;
    if (COLUMNS.some((col) => col.id === overId)) {
      targetColumn = overId;
    } else {
      const targetIssue = issues.find((issue) => issue.id === overId);
      if (targetIssue) targetColumn = targetIssue.status;
    }

    if (!targetColumn && over.data?.current?.type === "column") {
      targetColumn = over.data.current.column.id;
    }

    if (!targetColumn || targetColumn === activeIssue.status) return;

    const issueId = parseInt(activeIdVal, 10);
    const newStatus = targetColumn;

    dispatch(moveIssue({ issueId, newStatus }));

    try {
      await dispatch(updateIssueStatus({ issueId, status: newStatus })).unwrap();
      setDragError(null);
    } catch (error) {
      dispatch(rollbackIssueMove({ issueId, originalStatus }));
      console.error("Failed to update task status:", error);
      setDragError("You don't have access to update this task status");
    }
  };

  const handleDragCancel = () => setActiveId(null);

  const activeIssue = activeId ? issues.find((issue) => issue.id === activeId) : null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <IssueFilterButton
            view={filterView}
            align="start"
            sprintFilterOptions={
              filterView === "scrumBoard" ? sprintFilterOptions : undefined
            }
          />
          {onFetchPlan && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onFetchPlan}
              disabled={planLoading}
              className="flex items-center gap-1.5 text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              {planLoading ? "Planning…" : "Plan My Tasks"}
            </Button>
          )}
        </div>
        <div className="text-sm text-gray-500">
          Total Task{issues.length !== 1 ? "s" : ""}: {issues.length}
        </div>
      </div>

      <ErrorModal
        open={!!dragError}
        onClose={() => setDragError(null)}
        title="Failed to move task"
        message={dragError}
        onRetry={null}
      />

      <ErrorModal
        open={!!wipLimitError}
        onClose={() => setWipLimitError(null)}
        title="Failed to update Maximum Task Limit"
        message={wipLimitError}
        onRetry={null}
      />

      {issues.length === 0 && boardFiltersActive ? (
        <p className="text-center text-gray-400 text-sm py-16">
          {EMPTY_STATE_FILTER_ACTIVE_MESSAGE}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={kanbanCollisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="grid min-h-[min(520px,55vh)] grid-cols-1 items-stretch gap-6 md:grid-cols-3">
            {COLUMNS.map((column) => (
              <DroppableColumn
                key={column.id}
                column={column}
                issues={groupedIssues[column.id]}
                projectId={projectId}
                onCreateIssue={() => setShowCreateModal(true)}
                onEditIssue={setEditingIssue}
                showCreate={showCreateInTodoColumn}
                wipLimit={columnLimits[column.id] ?? null}
                isExceeded={!!exceededByColumn[column.id]}
                onSaveLimit={saveColumnLimit}
                onClearLimit={clearColumnLimit}
                isUpdatingLimit={
                  limitsLoading || savingLimitForColumn === column.id
                }
              />
            ))}
          </div>

          <DragOverlay>
            {activeIssue ? (
              <div className="rotate-3 shadow-lg">
                <div className="relative">
                  <div className="absolute inset-x-0 top-0 h-8 bg-gray-100 rounded-t-lg flex items-center justify-center">
                    <GripVertical className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="pt-8">
                    <IssueCard issue={activeIssue} projectId={projectId} />
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {showCreateModal && (
        <CreateIssueModal
          showModal={showCreateModal}
          setShowModal={setShowCreateModal}
          projectId={projectId}
          projectMembers={allMembers}
        />
      )}

      <EditTaskModal
        showModal={!!editingIssue}
        onClose={() => setEditingIssue(null)}
        issue={editingIssue}
        projectMembers={allMembers}
      />

    </div>
  );
}
