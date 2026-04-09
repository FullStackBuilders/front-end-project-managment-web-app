import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import SprintSelectPopoverField from "@/components/SprintSelectPopoverField";

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {number} props.taskCount
 * @param {{ id: number; name: string }[]} props.eligibleSprints - INACTIVE + ACTIVE only
 * @param {(sprintId: number) => Promise<void>} props.onConfirm
 */
export default function AddTasksToSprintModal({
  open,
  onClose,
  taskCount,
  eligibleSprints,
  onConfirm,
}) {
  const [sprintId, setSprintId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSprintId(null);
    setError("");
    setSubmitting(false);
  }, [open]);

  if (!open) return null;

  const hasSprints = eligibleSprints.length > 0;
  const canSubmit = hasSprints && sprintId != null && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      await onConfirm(sprintId);
      onClose();
    } catch (err) {
      setError(typeof err === "string" ? err : err?.message || "Could not move tasks");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-to-sprint-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 id="add-to-sprint-title" className="text-lg font-semibold text-gray-900">
            Add tasks to sprint
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
            disabled={submitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-gray-700">
            Moving <span className="font-semibold">{taskCount}</span> task
            {taskCount !== 1 ? "s" : ""} from the backlog to the selected sprint.
          </p>

          <div>
            <SprintSelectPopoverField
              label="Sprint"
              options={eligibleSprints}
              value={sprintId}
              onChange={setSprintId}
              disabled={!hasSprints || submitting}
              placeholder={
                hasSprints ? "Select a sprint" : "No sprints to select"
              }
              triggerId="add-tasks-to-sprint-sprint-trigger"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? "Moving…" : "Confirm"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
