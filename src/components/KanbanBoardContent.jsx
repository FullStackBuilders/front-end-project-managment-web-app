import { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical } from "lucide-react";
import IssueCard from "./IssueCard";
import CreateIssueModal from "./CreateIssueModal";
import EditTaskModal from "./EditTaskModal";
import ErrorModal from "./ErrorModal";
import IssueFilterButton from "./IssueFilterButton";
import { updateIssueStatus, moveIssue, rollbackIssueMove } from "../store/issueSlice";

const COLUMNS = [
  { id: "TO_DO", title: "To Do", color: "bg-gray-100" },
  { id: "IN_PROGRESS", title: "In Progress", color: "bg-blue-100" },
  { id: "DONE", title: "Done", color: "bg-green-100" },
];

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

function DroppableColumn({ column, issues, projectId, onCreateIssue, onEditIssue, showCreate }) {
  const { setNodeRef, isOver } = useSortable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
  });

  return (
    <div className="flex flex-col">
      <div className={`${column.color} rounded-t-lg p-4 border-b`}>
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-800">{column.title}</h3>
          <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded-full">
            {issues?.length || 0}
          </span>
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
        className={`flex-1 min-h-[400px] p-4 rounded-b-lg border-l border-r border-b transition-colors ${
          isOver ? "bg-blue-50 border-blue-300" : "bg-gray-50"
        }`}
      >
        <SortableContext
          items={issues?.map((issue) => issue.id) || []}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
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
 * @param {{ id: number; name: string }[]} [props.sprintFilterOptions] - ACTIVE sprints for scrum filter popover
 * @param {boolean} [props.showCreateInTodoColumn=true]
 */
export function KanbanBoardContent({
  projectId,
  issues,
  filterView,
  sprintFilterOptions,
  showCreateInTodoColumn = true,
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [dragError, setDragError] = useState(null);
  const dispatch = useDispatch();
  const { currentProject } = useSelector((state) => state.project);

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

  const groupedIssues = useMemo(() => {
    const grouped = { TO_DO: [], IN_PROGRESS: [], DONE: [] };
    issues.forEach((issue) => {
      if (grouped[issue.status]) {
        grouped[issue.status].push(issue);
      }
    });
    return grouped;
  }, [issues]);

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
              filterView === 'scrumBoard' ? sprintFilterOptions : undefined
            }
          />
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map((column) => (
            <DroppableColumn
              key={column.id}
              column={column}
              issues={groupedIssues[column.id]}
              projectId={projectId}
              onCreateIssue={() => setShowCreateModal(true)}
              onEditIssue={setEditingIssue}
              showCreate={showCreateInTodoColumn}
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
