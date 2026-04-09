import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Plus, Flag, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import {
  deleteIssue,
  assignIssueSprint,
  assignSprintOptimistic,
  rollbackAssignSprint,
  fetchIssuesByProject,
} from "@/store/issueSlice";
import CreateIssueModal from "@/components/CreateIssueModal";
import EditTaskModal from "@/components/EditTaskModal";
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal";
import StatusBadge from "@/components/StatusBadge";
import ErrorModal from "@/components/ErrorModal";
import CreateSprintModal from "@/components/scrum/CreateSprintModal";
import EditSprintModal from "@/components/scrum/EditSprintModal";
import SprintLifecycleModal from "@/components/scrum/SprintLifecycleModal";
import AddTasksToSprintModal from "@/components/scrum/AddTasksToSprintModal";
import { sprintApi } from "@/services/sprintApi";
import {
  isBacklogIssue,
  isSprintEndDatePassed,
  issueSprintId,
  sprintDateRangeLabel,
  countSprintTasksByDone,
} from "@/utils/scrumBacklogUtils";
import { isIssueOverdue } from "@/utils/issueDue";

const PRIORITY_COLORS = {
  HIGH: "bg-red-100 text-red-700 border-red-200",
  MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-200",
  LOW: "bg-green-100 text-green-700 border-green-200",
};

/** Narrow first column: center checkbox / add control so rows line up (backlog + sprint). */
const TH_SELECT_COL =
  "w-11 min-w-[2.75rem] max-w-[2.75rem] px-0 py-3 text-center align-middle";
const TD_SELECT_COL =
  "w-11 min-w-[2.75rem] max-w-[2.75rem] px-0 py-3 align-middle";
const TD_SELECT_INNER = "flex h-full min-h-[2rem] items-center justify-center";

/** Same pixel size for header + row checkboxes (backlog and sprint). */
const TASK_CHECKBOX_CLASS =
  "h-4 w-4 min-h-4 min-w-4 shrink-0 cursor-pointer rounded border-gray-300 text-primary accent-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0 disabled:cursor-not-allowed";
const TASK_CHECKBOX_DISABLED_CLASS =
  "h-4 w-4 min-h-4 min-w-4 shrink-0 cursor-not-allowed rounded border-gray-200 opacity-40";

function PriorityBadge({ value }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
        PRIORITY_COLORS[value] || "bg-gray-100 text-gray-600"
      }`}
    >
      <Flag className="w-3 h-3 mr-1" />
      {value}
    </span>
  );
}

function formatDueDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const [year, month, day] = dateStr.split("T")[0].split("-");
    return `${month}/${day}/${year}`;
  } catch {
    return dateStr;
  }
}

function isIssueInCompletedSprint(issue, sprints) {
  const sid = issueSprintId(issue);
  if (sid == null) return false;
  const sp = sprints.find((s) => s.id === sid);
  return sp?.status === "COMPLETED";
}

function BacklogSelectAllCheckbox({ checked, indeterminate, disabled, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <div className={TD_SELECT_INNER}>
      <input
        ref={ref}
        type="checkbox"
        className={TASK_CHECKBOX_CLASS}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label="Select all backlog tasks"
      />
    </div>
  );
}

export default function ScrumBacklogView({ projectId, onSprintStarted }) {
  const dispatch = useDispatch();
  const { isCreator, isProjectOwner, canUpdateIssueStatus, user } = useAuth();
  const issues = useSelector((state) => state.issues.issues);
  const { currentProject } = useSelector((state) => state.project);

  const ownerId = currentProject?.owner?.id;
  const myRole = currentProject?.myRole ?? null;
  const canManageSprintLifecycle =
    myRole === "OWNER" ||
    myRole === "ADMIN" ||
    myRole === "SCRUM_MASTER" ||
    (myRole == null && isProjectOwner(ownerId));
  const canAdministerAllTasks =
    myRole === "OWNER" ||
    myRole === "ADMIN" ||
    (myRole == null && isProjectOwner(ownerId));
  const isProjectMember =
    myRole != null ||
    isProjectOwner(ownerId) ||
    !!(user?.userId &&
      (currentProject?.team || []).some(
        (m) => Number(m.id) === Number(user.userId),
      ));

  const [sprints, setSprints] = useState([]);
  const [sprintsLoading, setSprintsLoading] = useState(true);
  const [sprintsError, setSprintsError] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [showAddToSprintModal, setShowAddToSprintModal] = useState(false);
  const [showBacklogConfirm, setShowBacklogConfirm] = useState(false);
  const [backlogConfirmSubmitting, setBacklogConfirmSubmitting] = useState(false);

  const [sprintSubmitting, setSprintSubmitting] = useState(false);
  const [editingSprint, setEditingSprint] = useState(null);
  const [editSprintSubmitting, setEditSprintSubmitting] = useState(false);
  const [modalEditIssue, setModalEditIssue] = useState(null);
  const [pendingDeleteIssue, setPendingDeleteIssue] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [moveError, setMoveError] = useState(null);
  const [startSubmittingId, setStartSubmittingId] = useState(null);
  const [completeSubmittingId, setCompleteSubmittingId] = useState(null);
  const [lifecycleModal, setLifecycleModal] = useState(null);

  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const loadSprints = useCallback(async () => {
    setSprintsLoading(true);
    setSprintsError(null);
    try {
      const list = await sprintApi.listByProject(projectId);
      setSprints(Array.isArray(list) ? list : []);
    } catch (e) {
      setSprintsError(e.message || "Failed to load sprints");
      setSprints([]);
    } finally {
      setSprintsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSprints();
  }, [loadSprints]);

  const backlogIssues = useMemo(
    () => issues.filter(isBacklogIssue),
    [issues],
  );

  const eligibleSprintsForDropdown = useMemo(
    () =>
      sprints.filter(
        (s) => s.status === "INACTIVE" || s.status === "ACTIVE",
      ),
    [sprints],
  );

  /** INACTIVE + ACTIVE only; COMPLETED sprints stay in DB but are not listed in backlog UI. */
  const sprintsVisibleInBacklog = useMemo(
    () => sprints.filter((s) => s.status !== "COMPLETED"),
    [sprints],
  );

  const issuesBySprintId = useMemo(() => {
    const map = new Map();
    for (const s of sprintsVisibleInBacklog) {
      map.set(
        s.id,
        issues.filter((i) => issueSprintId(i) === s.id),
      );
    }
    return map;
  }, [issues, sprintsVisibleInBacklog]);

  const selectedBacklogTasks = useMemo(
    () => backlogIssues.filter((i) => selectedIds.has(i.id)),
    [backlogIssues, selectedIds],
  );

  const selectedEligibleForBacklog = useMemo(
    () =>
      issues.filter(
        (i) =>
          selectedIds.has(i.id) &&
          issueSprintId(i) != null &&
          !isIssueInCompletedSprint(i, sprints),
      ),
    [issues, selectedIds, sprints],
  );

  const canAddToSprint =
    canManageSprintLifecycle && selectedBacklogTasks.length > 0;
  const canAddToBacklog =
    canManageSprintLifecycle && selectedEligibleForBacklog.length > 0;

  /** Single vs multi sprint; whether every task in that sprint is selected (header or row checkboxes). */
  const backlogMoveSummary = useMemo(() => {
    const items = selectedEligibleForBacklog;
    const n = items.length;
    if (n === 0) return { variant: "empty" };

    const sprintIds = [
      ...new Set(
        items.map((i) => issueSprintId(i)).filter((id) => id != null),
      ),
    ];
    if (sprintIds.length !== 1) {
      return { variant: "multi", n };
    }

    const sid = sprintIds[0];
    const sprint = sprints.find((s) => Number(s.id) === Number(sid));
    const sprintName = sprint?.name ?? "Sprint";
    const totalInSprint = issues.filter(
      (i) =>
        issueSprintId(i) === sid &&
        !isIssueInCompletedSprint(i, sprints),
    ).length;
    const allTasksInSprintSelected =
      totalInSprint > 0 &&
      n === totalInSprint &&
      items.every((i) => issueSprintId(i) === sid);

    return {
      variant: "single",
      n,
      sprintName,
      allTasksInSprintSelected,
    };
  }, [selectedEligibleForBacklog, issues, sprints]);

  const allBacklogSelected =
    backlogIssues.length > 0 &&
    backlogIssues.every((i) => selectedIds.has(i.id));
  const someBacklogSelected = backlogIssues.some((i) => selectedIds.has(i.id));

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const onBacklogSelectAll = useCallback(
    (checked) => {
      setSelectedIds((prev) => {
        const n = new Set(prev);
        backlogIssues.forEach((i) => {
          if (checked) n.add(i.id);
          else n.delete(i.id);
        });
        return n;
      });
    },
    [backlogIssues],
  );

  const onSprintSelectAll = useCallback((tasks, sprintCompleted, checked) => {
    if (!canManageSprintLifecycle || sprintCompleted) return;
    setSelectedIds((prev) => {
      const n = new Set(prev);
      tasks.forEach((i) => {
        if (checked) n.add(i.id);
        else n.delete(i.id);
      });
      return n;
    });
  }, [canManageSprintLifecycle]);

  const allSprintTasksSelected = (tasks, sprintCompleted) =>
    !sprintCompleted &&
    canManageSprintLifecycle &&
    tasks.length > 0 &&
    tasks.every((t) => selectedIds.has(t.id));
  const someSprintTasksSelected = (tasks) =>
    tasks.some((t) => selectedIds.has(t.id));

  const allMembers = useMemo(() => {
    const owner = currentProject?.owner;
    const team = currentProject?.team || [];
    if (!owner) return team;
    const seen = new Set([owner.id]);
    return [owner, ...team.filter((m) => !seen.has(m.id))];
  }, [currentProject]);

  const canDeleteTask = useCallback(
    (issue) => isCreator(issue.createdById) || canAdministerAllTasks,
    [isCreator, canAdministerAllTasks],
  );

  const canOpenEditModal = useCallback(
    (issue) => {
      const can =
        canDeleteTask(issue) || canUpdateIssueStatus(issue);
      if (currentProject?.framework !== "SCRUM" || !isBacklogIssue(issue)) {
        return can;
      }
      if (!canDeleteTask(issue) && canUpdateIssueStatus(issue)) {
        return false;
      }
      return can;
    },
    [canDeleteTask, canUpdateIssueStatus, currentProject?.framework],
  );

  const showActionsColumn = useMemo(
    () => backlogIssues.some((issue) => canOpenEditModal(issue)),
    [backlogIssues, canOpenEditModal],
  );

  const showSprintActionsColumn = useCallback(
    (tasks, sprintStatus) =>
      sprintStatus === "ACTIVE" &&
      tasks.some((issue) => canOpenEditModal(issue)),
    [canOpenEditModal],
  );

  const scrumEditStatusFieldVariant = useMemo(() => {
    if (!modalEditIssue) return "default";
    const sid = issueSprintId(modalEditIssue);
    if (sid == null) return "scrum_backlog_badge";
    const sp = sprints.find((s) => Number(s.id) === Number(sid));
    if (!sp) return "scrum_backlog_badge";
    if (sp.status === "ACTIVE") return "scrum_active_sprint";
    return "scrum_backlog_badge";
  }, [modalEditIssue, sprints]);

  const moveIssuesToSprint = useCallback(
    async (targetSprintId, issueList) => {
      const targetSprint = sprints.find((s) => s.id === targetSprintId);
      const targetName = targetSprint?.name ?? null;
      const targetSprintStatus = targetSprint?.status ?? null;
      for (const issue of issueList) {
        const prevId = issueSprintId(issue);
        const prevName = issue.sprintName ?? null;
        const prevStatus = issue.sprintStatus ?? null;
        dispatch(
          assignSprintOptimistic({
            issueId: issue.id,
            sprintId: targetSprintId,
            sprintName: targetName,
            sprintStatus: targetSprintStatus,
          }),
        );
        try {
          await dispatch(
            assignIssueSprint({
              issueId: issue.id,
              sprintId: targetSprintId,
            }),
          ).unwrap();
        } catch (err) {
          dispatch(
            rollbackAssignSprint({
              issueId: issue.id,
              sprintId: prevId,
              sprintName: prevName,
              sprintStatus: prevStatus,
            }),
          );
          throw err;
        }
      }
      setSelectedIds((prev) => {
        const n = new Set(prev);
        issueList.forEach((i) => n.delete(i.id));
        return n;
      });
    },
    [dispatch, sprints],
  );

  const moveIssuesToBacklog = useCallback(
    async (issueList) => {
      for (const issue of issueList) {
        const prevId = issueSprintId(issue);
        const prevName = issue.sprintName ?? null;
        const prevStatus = issue.sprintStatus ?? null;
        dispatch(
          assignSprintOptimistic({
            issueId: issue.id,
            sprintId: null,
            sprintName: null,
            sprintStatus: null,
          }),
        );
        try {
          await dispatch(
            assignIssueSprint({ issueId: issue.id, sprintId: null }),
          ).unwrap();
        } catch (err) {
          dispatch(
            rollbackAssignSprint({
              issueId: issue.id,
              sprintId: prevId,
              sprintName: prevName,
              sprintStatus: prevStatus,
            }),
          );
          throw err;
        }
      }
      setSelectedIds((prev) => {
        const n = new Set(prev);
        issueList.forEach((i) => n.delete(i.id));
        return n;
      });
    },
    [dispatch],
  );

  const handleConfirmAddToSprint = async (sprintId) => {
    await moveIssuesToSprint(sprintId, selectedBacklogTasks);
  };

  const handleConfirmAddToBacklog = async () => {
    setBacklogConfirmSubmitting(true);
    try {
      await moveIssuesToBacklog(selectedEligibleForBacklog);
      setShowBacklogConfirm(false);
    } catch (err) {
      setMoveError(
        typeof err === "string"
          ? err
          : err?.message || "Could not move tasks to the backlog.",
      );
    } finally {
      setBacklogConfirmSubmitting(false);
    }
  };

  const handleCreateSprint = async (body) => {
    setSprintSubmitting(true);
    try {
      await sprintApi.create(projectId, body);
      await loadSprints();
    } catch (e) {
      throw e?.message || String(e) || "Failed to create sprint";
    } finally {
      setSprintSubmitting(false);
    }
  };

  const handleUpdateSprint = async (body) => {
    if (!editingSprint) return;
    setEditSprintSubmitting(true);
    try {
      await sprintApi.update(projectId, editingSprint.id, body);
      await loadSprints();
    } catch (e) {
      throw e?.message || String(e) || "Failed to update sprint";
    } finally {
      setEditSprintSubmitting(false);
    }
  };

  const runStartSprint = async (sprintId, dateBody = null, { forModal = false } = {}) => {
    setStartSubmittingId(sprintId);
    try {
      await sprintApi.start(projectId, sprintId, dateBody);
      await loadSprints();
      await dispatch(fetchIssuesByProject(projectId)).unwrap();
      setLifecycleModal(null);
      onSprintStarted?.(sprintId);
    } catch (e) {
      const msg = e?.message || "Failed to start sprint";
      if (forModal) throw new Error(msg);
      setMoveError(msg);
    } finally {
      setStartSubmittingId(null);
    }
  };

  const openStartFlow = (sprint, tasks) => {
    if (!canManageSprintLifecycle || tasks.length === 0) return;
    if (sprint.status !== "INACTIVE") return;
    const ended = isSprintEndDatePassed(sprint);
    if (ended) {
      setLifecycleModal({
        variant: "start_overdue",
        sprint,
        tasks,
      });
      return;
    }
    runStartSprint(sprint.id);
  };

  const openCompleteFlow = (sprint, tasks) => {
    if (!canManageSprintLifecycle || sprint.status !== "ACTIVE") return;
    const ended = isSprintEndDatePassed(sprint);
    const { incomplete } = countSprintTasksByDone(tasks);
    if (incomplete === 0) {
      setLifecycleModal({
        variant: "complete_all_done",
        sprint,
        tasks,
        timeboxEnded: ended,
      });
    } else {
      setLifecycleModal({
        variant: "complete_mixed",
        sprint,
        tasks,
        timeboxEnded: ended,
      });
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeleteIssue) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteIssue(pendingDeleteIssue.id)).unwrap();
      setPendingDeleteIssue(null);
      setSelectedIds((prev) => {
        const n = new Set(prev);
        n.delete(pendingDeleteIssue.id);
        return n;
      });
    } catch {
      /* handled in UI */
    } finally {
      setIsDeleting(false);
    }
  };

  const renderIssueRowCells = (issue) => {
    const overdue = isIssueOverdue(issue);
    return (
      <>
        <td className="px-3 py-3 text-gray-900 max-w-xs">
          <span className="font-medium truncate block" title={issue.title}>
            {issue.title}
          </span>
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          <StatusBadge status={issue.status} />
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          <PriorityBadge value={issue.priority} />
        </td>
        <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
          {issue.assigneeName || (
            <span className="text-gray-500">Unassigned</span>
          )}
        </td>
        <td
          className={`px-3 py-3 whitespace-nowrap text-sm ${
            overdue ? "text-red-600 font-medium" : "text-gray-700"
          }`}
        >
          {formatDueDate(issue.dueDate)}
        </td>
      </>
    );
  };

  return (
    <div className="space-y-8">
      <ErrorModal
        open={!!moveError}
        onClose={() => setMoveError(null)}
        title="Could not update tasks"
        message={moveError}
      />

      <SprintLifecycleModal
        open={!!lifecycleModal}
        onClose={() => setLifecycleModal(null)}
        variant={lifecycleModal?.variant}
        sprintName={lifecycleModal?.sprint?.name}
        tasks={lifecycleModal?.tasks ?? []}
        timeboxEnded={lifecycleModal?.timeboxEnded ?? false}
        onUpdateAndStart={async (dates) => {
          if (lifecycleModal?.sprint) {
            await runStartSprint(lifecycleModal.sprint.id, dates, { forModal: true });
          }
        }}
        onConfirmComplete={async () => {
          if (!lifecycleModal?.sprint) return;
          const sprintId = lifecycleModal.sprint.id;
          setCompleteSubmittingId(sprintId);
          try {
            await sprintApi.complete(projectId, sprintId);
            await dispatch(fetchIssuesByProject(projectId)).unwrap();
            await loadSprints();
          } finally {
            setCompleteSubmittingId(null);
          }
        }}
        startSubmitting={
          !!lifecycleModal?.sprint &&
          startSubmittingId === lifecycleModal.sprint.id &&
          lifecycleModal.variant === "start_overdue"
        }
        completeSubmitting={
          !!lifecycleModal?.sprint &&
          completeSubmittingId === lifecycleModal.sprint.id &&
          (lifecycleModal.variant === "complete_all_done" ||
            lifecycleModal.variant === "complete_mixed")
        }
      />

      <CreateSprintModal
        open={showSprintModal}
        onClose={() => setShowSprintModal(false)}
        onConfirm={handleCreateSprint}
        submitting={sprintSubmitting}
      />

      {editingSprint && (
        <EditSprintModal
          key={editingSprint.id}
          sprint={editingSprint}
          onClose={() => setEditingSprint(null)}
          onConfirm={handleUpdateSprint}
          submitting={editSprintSubmitting}
        />
      )}

      <AddTasksToSprintModal
        open={showAddToSprintModal}
        onClose={() => setShowAddToSprintModal(false)}
        taskCount={selectedBacklogTasks.length}
        eligibleSprints={eligibleSprintsForDropdown.map((s) => ({
          id: s.id,
          name: s.name,
        }))}
        onConfirm={handleConfirmAddToSprint}
      />

      {showBacklogConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-200 p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Move to backlog?
            </h2>
            <p className="text-sm text-gray-700 mb-4">
              {backlogMoveSummary.variant === "single" &&
                backlogMoveSummary.allTasksInSprintSelected && (
                  <>
                    Move <span className="font-semibold">All</span> tasks from{" "}
                    <span className="font-semibold">{backlogMoveSummary.sprintName}</span> to the
                    backlog.
                  </>
                )}
              {backlogMoveSummary.variant === "single" &&
                !backlogMoveSummary.allTasksInSprintSelected && (
                  <>
                    Move <span className="font-semibold">{backlogMoveSummary.n}</span>{" "}
                    task{backlogMoveSummary.n !== 1 ? "s" : ""} from{" "}
                    <span className="font-semibold">{backlogMoveSummary.sprintName}</span> to the
                    backlog.
                  </>
                )}
              {backlogMoveSummary.variant === "multi" && (
                <>
                  Move <span className="font-semibold">{backlogMoveSummary.n}</span> tasks from
                  their sprints to the backlog.
                </>
              )}
              {backlogMoveSummary.variant === "empty" && null}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={backlogConfirmSubmitting}
                onClick={() => setShowBacklogConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={backlogConfirmSubmitting}
                onClick={handleConfirmAddToBacklog}
              >
                {backlogConfirmSubmitting ? "Moving…" : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Backlog</h3>
          {canManageSprintLifecycle && (
            <div className="flex flex-col items-stretch sm:items-end gap-1 shrink-0">
              <div className="flex flex-wrap items-center gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canAddToSprint}
                  onClick={() => setShowAddToSprintModal(true)}
                >
                  Add to sprint
                </Button>
              </div>
              <p className="text-xs text-gray-500 text-right max-w-[240px] sm:max-w-none">
                Select tasks, then click Add to sprint.
              </p>
            </div>
          )}
        </div>

        {!canManageSprintLifecycle && (
          <p className="text-sm text-gray-600 mb-3 rounded-md bg-gray-50 border border-gray-100 px-3 py-2">
            Only a project owner, admin, or Scrum Master can move tasks between the backlog and
            sprints in bulk. You can still view tasks here.
          </p>
        )}

        {backlogIssues.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/80 min-h-[180px] p-4 flex flex-col items-center justify-center text-center">
            <p className="text-gray-600 font-medium mb-1 max-w-md">
              No tasks in the backlog yet.
            </p>
            <p className="text-sm text-gray-500 mb-4 max-w-md">
              Create a task to plan work before you add it to a sprint.
            </p>
            {isProjectMember && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="flex justify-end p-2 border-b border-gray-100 bg-gray-50/80">
                {isProjectMember && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create
                  </Button>
                )}
              </div>
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={TH_SELECT_COL}>
                      {canManageSprintLifecycle ? (
                        <BacklogSelectAllCheckbox
                          checked={allBacklogSelected}
                          indeterminate={someBacklogSelected && !allBacklogSelected}
                          disabled={backlogIssues.length === 0}
                          onChange={onBacklogSelectAll}
                        />
                      ) : (
                        <span className="sr-only">Select</span>
                      )}
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">
                      Task name
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                      Priority
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                      Assignee
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                      Due
                    </th>
                    {showActionsColumn && (
                      <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {backlogIssues.map((issue) => {
                    const overdue = isIssueOverdue(issue);
                    return (
                      <tr
                        key={issue.id}
                        className={overdue ? "bg-red-50/60" : "bg-white hover:bg-gray-50/80"}
                      >
                        <td className={TD_SELECT_COL}>
                          {canManageSprintLifecycle ? (
                            <div className={TD_SELECT_INNER}>
                              <input
                                type="checkbox"
                                className={TASK_CHECKBOX_CLASS}
                                checked={selectedIds.has(issue.id)}
                                onChange={() => toggleSelect(issue.id)}
                                aria-label={`Select ${issue.title}`}
                              />
                            </div>
                          ) : (
                            <div className={TD_SELECT_INNER}>
                              <span className="text-gray-300">—</span>
                            </div>
                          )}
                        </td>
                        {renderIssueRowCells(issue)}
                        {showActionsColumn && (
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="flex gap-2 flex-wrap">
                              {canOpenEditModal(issue) && (
                                <button
                                  type="button"
                                  onClick={() => setModalEditIssue(issue)}
                                  className="px-2 py-1 text-xs font-medium border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                                >
                                  Edit
                                </button>
                              )}
                              {canDeleteTask(issue) && (
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteIssue(issue)}
                                  className="px-2 py-1 text-xs font-medium border border-red-200 text-red-600 rounded hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {isProjectMember && (
                    <tr className="bg-gray-50/60 border-t border-gray-200">
                      <td className={TD_SELECT_COL}>
                        <div className={TD_SELECT_INNER}>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8 shrink-0"
                            onClick={() => setShowCreateModal(true)}
                            aria-label="Create backlog task"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                      <td
                        colSpan={showActionsColumn ? 6 : 5}
                        className="py-3 align-middle"
                      />
                    </tr>
                  )}
                </tbody>
              </table>
          </div>
        )}
      </section>

      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Sprints</h3>
          {canManageSprintLifecycle && (
            <div className="flex flex-wrap gap-2 justify-end shrink-0">
              <Button
                type="button"
                variant="outline"
                disabled={!canAddToBacklog}
                onClick={() => setShowBacklogConfirm(true)}
              >
                Add to backlog
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowSprintModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create sprint
              </Button>
            </div>
          )}
        </div>

        {sprintsError && (
          <p className="text-sm text-red-600 mb-3">{sprintsError}</p>
        )}

        {sprintsLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
            Loading sprints…
          </div>
        ) : sprints.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
            <p className="font-medium text-gray-700">No sprints yet</p>
            <p className="text-sm mt-1">
              {canManageSprintLifecycle
                ? "Create a sprint to organize work into timeboxes."
                : "Sprints will appear here when the project owner creates them."}
            </p>
          </div>
        ) : sprintsVisibleInBacklog.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
            <p className="font-medium text-gray-700">No planned or active sprints</p>
            <p className="text-sm mt-1 max-w-md mx-auto">
              {canManageSprintLifecycle
                ? "Completed sprints are hidden here. Create a new sprint to plan more work."
                : "There are no planned or active sprints right now."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sprintsVisibleInBacklog.map((sprint) => {
              const tasks = issuesBySprintId.get(sprint.id) || [];
              const hasTasks = tasks.length > 0;
              const sprintActions = showSprintActionsColumn(tasks, sprint.status);

              return (
                <div
                  key={sprint.id}
                  className="rounded-lg border border-gray-200 bg-gray-50/40 overflow-hidden"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 py-3 bg-white border-b border-gray-100">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">{sprint.name}</h4>
                        {canManageSprintLifecycle && (
                          <button
                            type="button"
                            onClick={() => setEditingSprint(sprint)}
                            className="shrink-0 p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            aria-label={`Edit sprint ${sprint.name}`}
                          >
                            <Pencil className="w-4 h-4" aria-hidden />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {sprintDateRangeLabel(sprint)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {canManageSprintLifecycle && hasTasks && sprint.status === "INACTIVE" && (
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="bg-primary text-white hover:bg-primary/90"
                          disabled={startSubmittingId === sprint.id}
                          onClick={() => openStartFlow(sprint, tasks)}
                        >
                          {startSubmittingId === sprint.id ? "Starting…" : "Start sprint"}
                        </Button>
                      )}
                      {canManageSprintLifecycle && sprint.status === "ACTIVE" && (
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="bg-primary text-white hover:bg-primary/90"
                          onClick={() => openCompleteFlow(sprint, tasks)}
                        >
                          Complete sprint
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    {!hasTasks ? (
                      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white/90 p-6 text-center">
                        <p className="text-sm text-gray-600 leading-relaxed max-w-lg mx-auto">
                          Add tasks to this sprint from backlog to get started.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className={TH_SELECT_COL}>
                                {canManageSprintLifecycle ? (
                                  <SprintSelectAllCheckbox
                                    checked={allSprintTasksSelected(tasks, false)}
                                    indeterminate={
                                      someSprintTasksSelected(tasks) &&
                                      !allSprintTasksSelected(tasks, false)
                                    }
                                    disabled={tasks.length === 0}
                                    onChange={(c) =>
                                      onSprintSelectAll(tasks, false, c)
                                    }
                                  />
                                ) : (
                                  <span className="sr-only">Select</span>
                                )}
                              </th>
                              <th className="px-3 py-3 text-left font-semibold text-gray-600">
                                Task name
                              </th>
                              <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                                Status
                              </th>
                              <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                                Priority
                              </th>
                              <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                                Assignee
                              </th>
                              <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                                Due
                              </th>
                              {sprintActions && (
                                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">
                                  Actions
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {tasks.map((issue) => {
                              const overdue = isIssueOverdue(issue);
                              const rowDisabled = !canManageSprintLifecycle;
                              return (
                                <tr
                                  key={issue.id}
                                  className={
                                    overdue ? "bg-red-50/60" : "bg-white hover:bg-gray-50/80"
                                  }
                                >
                                  <td className={TD_SELECT_COL}>
                                    <div className={TD_SELECT_INNER}>
                                      {rowDisabled ? (
                                        <input
                                          type="checkbox"
                                          disabled
                                          className={TASK_CHECKBOX_DISABLED_CLASS}
                                          aria-label="Selection disabled"
                                        />
                                      ) : (
                                        <input
                                          type="checkbox"
                                          className={TASK_CHECKBOX_CLASS}
                                          checked={selectedIds.has(issue.id)}
                                          onChange={() => toggleSelect(issue.id)}
                                          aria-label={`Select ${issue.title}`}
                                        />
                                      )}
                                    </div>
                                  </td>
                                  {renderIssueRowCells(issue)}
                                  {sprintActions && (
                                    <td className="px-3 py-3 whitespace-nowrap">
                                      <div className="flex gap-2 flex-wrap">
                                        {canOpenEditModal(issue) && (
                                          <button
                                            type="button"
                                            onClick={() => setModalEditIssue(issue)}
                                            className="px-2 py-1 text-xs font-medium border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                                          >
                                            Edit
                                          </button>
                                        )}
                                        {canDeleteTask(issue) && (
                                          <button
                                            type="button"
                                            onClick={() => setPendingDeleteIssue(issue)}
                                            className="px-2 py-1 text-xs font-medium border border-red-200 text-red-600 rounded hover:bg-red-50"
                                          >
                                            Delete
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showCreateModal && (
        <CreateIssueModal
          showModal={showCreateModal}
          setShowModal={setShowCreateModal}
          projectId={projectId}
          projectMembers={allMembers}
        />
      )}

      <EditTaskModal
        showModal={!!modalEditIssue}
        onClose={() => setModalEditIssue(null)}
        issue={modalEditIssue}
        projectMembers={allMembers}
        statusFieldVariant={scrumEditStatusFieldVariant}
      />

      {pendingDeleteIssue && (
        <DeleteConfirmationModal
          showModal={!!pendingDeleteIssue}
          setShowModal={(open) => {
            if (!open) setPendingDeleteIssue(null);
          }}
          onConfirm={confirmDelete}
          title="Delete task"
          message={`Are you sure you want to delete "${pendingDeleteIssue.title}"?`}
          warningMessage="This action cannot be undone."
          confirmText="Delete"
          isDeleting={isDeleting}
          itemType="task"
        />
      )}
    </div>
  );
}

function SprintSelectAllCheckbox({ checked, indeterminate, disabled, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <div className={TD_SELECT_INNER}>
      <input
        ref={ref}
        type="checkbox"
        className={TASK_CHECKBOX_CLASS}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label="Select all tasks in this sprint"
      />
    </div>
  );
}
