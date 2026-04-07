import { defaultEndDateForDuration } from "@/utils/scrumBacklogUtils";
import {
  normalizeDescriptionForCompare,
  normalizeTitleForCompare,
} from "@/utils/taskFormNormalization";

/** yyyy-MM-dd from API date (ISO string or LocalDate serialization). */
export function isoDateFromSprintField(value) {
  if (value == null) return "";
  return String(value).split("T")[0];
}

/** Baseline snapshot for meaningful-change detection (Edit sprint modal). */
export function buildSprintEditBaselineFromResponse(sprint) {
  return {
    name: sprint?.name ?? "",
    goal: sprint?.goal ?? "",
    startDate: isoDateFromSprintField(sprint?.startDate),
    endDate: isoDateFromSprintField(sprint?.endDate),
  };
}

/** Match CreateSprintModal duration presets when possible. */
export function deriveDurationModeFromDates(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return "custom";
  const e1w = defaultEndDateForDuration(startDateStr, "1w");
  const e2w = defaultEndDateForDuration(startDateStr, "2w");
  if (endDateStr === e1w) return "1w";
  if (endDateStr === e2w) return "2w";
  return "custom";
}

/**
 * @param {{ name: string; goal: string; startDate: string; endDate: string }} form
 * @param {{ name: string; goal: string; startDate: string; endDate: string }} baseline
 */
export function computeSprintEditDelta(form, baseline) {
  const nameChanged =
    normalizeTitleForCompare(form.name) !== normalizeTitleForCompare(baseline.name);
  const goalChanged =
    normalizeDescriptionForCompare(form.goal) !==
    normalizeDescriptionForCompare(baseline.goal);
  const startChanged = (form.startDate || "") !== (baseline.startDate || "");
  const endChanged = (form.endDate || "") !== (baseline.endDate || "");
  return {
    hasMeaningfulChange: nameChanged || goalChanged || startChanged || endChanged,
  };
}
