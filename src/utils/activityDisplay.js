import { format } from "date-fns";

/**
 * Normalize backend occurredAt (ISO string or Jackson LocalDateTime array).
 */
export function parseOccurredAt(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length >= 3) {
    const [y, mo, d, h = 0, mi = 0, s = 0] = value;
    const ms = Date.UTC(y, mo - 1, d, h, mi, Math.floor(s));
    return new Date(ms).toISOString();
  }
  return "";
}

/** Map API display labels (from backend IssueActivityValueFormats) to StatusBadge keys. */
export function statusLabelToEnum(label) {
  if (!label) return null;
  const map = {
    "To Do": "TO_DO",
    "In Progress": "IN_PROGRESS",
    Done: "DONE",
  };
  return map[label] || null;
}

export function priorityLabelToEnum(label) {
  if (!label) return null;
  const map = {
    Low: "LOW",
    Medium: "MEDIUM",
    High: "HIGH",
  };
  return map[label] || null;
}

/**
 * Primary action line after the actor name (lowercase fragment).
 * e.g. "added a comment", "created this task", "changed status"
 */
export function getActivityActionFragment(item) {
  if (item.kind === "comment") return "added a comment";

  const { activityType, fieldName } = item;
  if (activityType === "TASK_CREATED") return "created this task";

  if (activityType === "TASK_FIELD_UPDATED") {
    switch (fieldName) {
      case "status":
        return "changed status";
      case "priority":
        return "changed priority";
      case "assignee":
        return "changed assignee";
      case "title":
        return "updated title";
      case "description":
        return "updated description";
      case "due_date":
        return "changed due date";
      default:
        return "updated this task";
    }
  }
  return "updated this task";
}

/**
 * Timeline display for assignee old/new values: empty or blank means Unassigned
 * (matches "Name to Unassigned" when clearing assignee).
 */
export function formatAssigneeActivityValue(value) {
  if (value == null) return "Unassigned";
  const s = String(value).trim();
  if (s === "" || s === "—" || s === "-") return "Unassigned";
  return s;
}

export function formatDueDateValue(isoOrNull) {
  if (!isoOrNull) return "None";
  try {
    const d = new Date(isoOrNull.includes("T") ? isoOrNull : `${isoOrNull}T00:00:00`);
    if (isNaN(d.getTime())) return isoOrNull;
    return format(d, "MMM d, yyyy");
  } catch {
    return isoOrNull;
  }
}
