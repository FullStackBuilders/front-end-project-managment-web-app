import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  countSprintTasksByDone,
  defaultEndDateForDuration,
  todayISODate,
} from "@/utils/scrumBacklogUtils";

const DURATION_OPTIONS = [
  { value: "1w", label: "1 week" },
  { value: "2w", label: "2 weeks" },
  { value: "custom", label: "Custom" },
];

/**
 * Owner lifecycle: overdue start (update dates + start), complete sprint (all done or mixed).
 * Task counts for complete flows are derived from `tasks` on each render (live from parent state).
 */
export default function SprintLifecycleModal({
  open,
  onClose,
  variant,
  sprintName,
  tasks = [],
  timeboxEnded = false,
  onUpdateAndStart,
  onConfirmComplete,
  startSubmitting,
  completeSubmitting,
}) {
  const [apiNotice, setApiNotice] = useState("");
  const [durationMode, setDurationMode] = useState("1w");
  const [startDate, setStartDate] = useState(() => todayISODate());
  const [endDate, setEndDate] = useState(() =>
    defaultEndDateForDuration(todayISODate(), "1w"),
  );

  const { completed: completedCount, incomplete: incompleteCount } =
    countSprintTasksByDone(tasks);

  useEffect(() => {
    if (!open) return;
    setApiNotice("");
    if (variant === "start_overdue") {
      const today = todayISODate();
      setDurationMode("1w");
      setStartDate(today);
      setEndDate(defaultEndDateForDuration(today, "1w"));
    }
  }, [open, variant]);

  useEffect(() => {
    if (!open || variant !== "start_overdue") return;
    if (durationMode === "custom") return;
    setEndDate(defaultEndDateForDuration(startDate, durationMode));
  }, [open, variant, startDate, durationMode]);

  if (!open) return null;

  const resetClose = () => {
    setApiNotice("");
    onClose();
  };

  const todayStr = todayISODate();
  const overdueStartValid =
    !!startDate &&
    !!endDate &&
    startDate >= todayStr &&
    endDate >= startDate;

  const handleUpdateAndStart = async () => {
    if (!overdueStartValid || !onUpdateAndStart) return;
    try {
      setApiNotice("");
      await onUpdateAndStart({ startDate, endDate });
    } catch (e) {
      setApiNotice(e?.message || "Could not start sprint");
    }
  };

  const handleCompleteClick = async () => {
    if (!onConfirmComplete) return;
    try {
      setApiNotice("");
      await onConfirmComplete();
      resetClose();
    } catch (e) {
      setApiNotice(e?.message || "Could not complete sprint");
    }
  };

  let title = "";
  let body = null;
  let primaryLabel = "Continue";
  let primaryAction = () => {};
  let primaryDisabled = false;
  let showPrimary = true;
  const secondaryLabel = "Cancel";

  if (variant === "start_overdue") {
    title = "Start Sprint?";
    const endDisabled = durationMode !== "custom";
    body = (
      <div className="space-y-3 text-sm text-gray-700">
        <p>
          This sprint includes{" "}
          <span className="font-semibold">{tasks.length}</span> task
          {tasks.length !== 1 ? "s" : ""}.
        </p>
        <p className="text-gray-600">
          You must update the sprint dates before starting.
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
          <select
            value={durationMode}
            onChange={(e) => setDurationMode(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
          >
            {DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start date</label>
            <input
              type="date"
              value={startDate || ""}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End date</label>
            <input
              type="date"
              value={endDate || ""}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={endDisabled}
              className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>
        </div>
      </div>
    );
    primaryLabel = startSubmitting ? "Starting…" : "Update & Start Sprint";
    primaryAction = handleUpdateAndStart;
    primaryDisabled = !overdueStartValid || startSubmitting;
  }

  if (variant === "complete_all_done") {
    title = sprintName?.trim()
      ? `Complete ${sprintName.trim()}`
      : "Complete sprint";
    const emptySprint = tasks.length === 0;
    body = (
      <div className="space-y-2 text-sm text-gray-700">
        {timeboxEnded && <p>Sprint duration has ended.</p>}
        <p>
          {emptySprint
            ? "There are no tasks in this sprint."
            : `Congratulations! All tasks in ${
                sprintName ? `'${sprintName}'` : "this sprint"
              } are completed.`}
        </p>
      </div>
    );
    primaryLabel = completeSubmitting ? "Working…" : "Complete sprint";
    primaryAction = handleCompleteClick;
    primaryDisabled = completeSubmitting;
  }

  if (variant === "complete_mixed") {
    title = sprintName?.trim()
      ? `Complete ${sprintName.trim()}`
      : "Complete sprint";
    body = (
      <div className="space-y-2 text-sm text-gray-700">
        {timeboxEnded && <p>Sprint duration has ended.</p>}
        <p>
          This sprint has{" "}
          <span className="font-semibold">{completedCount}</span> completed task
          {completedCount !== 1 ? "s" : ""} and{" "}
          <span className="font-semibold">{incompleteCount}</span> incomplete task
          {incompleteCount !== 1 ? "s" : ""}.
        </p>
        <p className="text-gray-600">
          Incomplete tasks will be moved to the backlog when you complete this sprint.
        </p>
      </div>
    );
    primaryLabel = completeSubmitting ? "Working…" : "Complete sprint";
    primaryAction = handleCompleteClick;
    primaryDisabled = completeSubmitting;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={resetClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{body}</div>
        {apiNotice && (
          <div className="px-5 pb-2">
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              {apiNotice}
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button type="button" variant="outline" size="sm" onClick={resetClose}>
            {secondaryLabel}
          </Button>
          {showPrimary && (
            <Button
              type="button"
              size="sm"
              disabled={primaryDisabled}
              onClick={() => primaryAction()}
            >
              {primaryLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
