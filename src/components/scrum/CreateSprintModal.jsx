import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { defaultEndDateForDuration, todayISODate } from "@/utils/scrumBacklogUtils";

const DURATION_OPTIONS = [
  { value: "1w", label: "1 week" },
  { value: "2w", label: "2 weeks" },
  { value: "custom", label: "Custom" },
];

export default function CreateSprintModal({
  open,
  onClose,
  onConfirm,
  submitting,
}) {
  const [name, setName] = useState("");
  const [durationMode, setDurationMode] = useState("1w");
  const [startDate, setStartDate] = useState(todayISODate());
  const [endDate, setEndDate] = useState(() =>
    defaultEndDateForDuration(todayISODate(), "1w"),
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const today = todayISODate();
    setName("");
    setDurationMode("1w");
    setStartDate(today);
    setEndDate(defaultEndDateForDuration(today, "1w"));
    setError("");
  }, [open]);

  useEffect(() => {
    if (durationMode === "custom") return;
    setEndDate(defaultEndDateForDuration(startDate, durationMode));
  }, [startDate, durationMode]);

  if (!open) return null;

  const endDisabled = durationMode !== "custom";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Sprint name is required");
      return;
    }
    if (!startDate || !endDate) {
      setError("Start and end dates are required");
      return;
    }
    if (endDate < startDate) {
      setError("End date must be on or after the start date");
      return;
    }
    setError("");
    try {
      await onConfirm({
        name: trimmed,
        goal: null,
        startDate,
        endDate,
      });
      onClose();
    } catch (err) {
      setError(typeof err === "string" ? err : err?.message || "Could not create sprint");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-sprint-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 id="create-sprint-title" className="text-lg font-semibold text-gray-900">
            Create sprint
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label htmlFor="sprint-name" className="block text-sm font-medium text-gray-700 mb-1">
              Sprint name
            </label>
            <input
              id="sprint-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="e.g. Sprint 3"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="sprint-duration" className="block text-sm font-medium text-gray-700 mb-1">
              Duration
            </label>
            <select
              id="sprint-duration"
              value={durationMode}
              onChange={(e) => setDurationMode(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="sprint-start" className="block text-sm font-medium text-gray-700 mb-1">
                Start date
              </label>
              <input
                id="sprint-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="sprint-end" className="block text-sm font-medium text-gray-700 mb-1">
                End date
              </label>
              <input
                id="sprint-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={endDisabled}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>

          {durationMode !== "custom" && (
            <p className="text-xs text-gray-500">
              End date is calculated from the duration. Choose Custom to set both dates yourself.
            </p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Confirm"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
