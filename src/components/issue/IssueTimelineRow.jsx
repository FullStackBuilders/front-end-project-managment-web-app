import { Flag } from "lucide-react";
import StatusBadge from "../StatusBadge";
import { getAvatarColor } from "../../utils/avatarColor";
import { formatSmartTimestamp } from "../../utils/dateUtils";
import {
  formatDueDateValue,
  getActivityActionFragment,
  parseOccurredAt,
  priorityLabelToEnum,
  statusLabelToEnum,
} from "../../utils/activityDisplay";

const PRIORITY_COLORS = {
  HIGH: "bg-red-100 text-red-800 border-red-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  LOW: "bg-green-100 text-green-800 border-green-200",
};

function getUserInitials(userName) {
  if (!userName) return "??";
  return userName
    .split(" ")
    .map((n) => n[0] || "")
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function PriorityChip({ label }) {
  const key = priorityLabelToEnum(label);
  const cls = key
    ? PRIORITY_COLORS[key]
    : "bg-gray-100 text-gray-800 border-gray-200";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}
    >
      <Flag className="w-3 h-3 mr-1" />
      {label || "—"}
    </span>
  );
}

function FieldChangeBody({ item }) {
  const { fieldName, oldValue, newValue } = item;

  if (fieldName === "status") {
    const oldE = statusLabelToEnum(oldValue);
    const newE = statusLabelToEnum(newValue);
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {oldE ? (
          <StatusBadge status={oldE} />
        ) : (
          <span className="text-gray-600">{oldValue || "—"}</span>
        )}
        <span className="text-gray-400 lowercase">to</span>
        {newE ? (
          <StatusBadge status={newE} />
        ) : (
          <span className="text-gray-600">{newValue || "—"}</span>
        )}
      </div>
    );
  }

  if (fieldName === "priority") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <PriorityChip label={oldValue} />
        <span className="text-gray-400 lowercase">to</span>
        <PriorityChip label={newValue} />
      </div>
    );
  }

  if (fieldName === "assignee") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
        <span className="font-medium text-gray-900">{oldValue || "—"}</span>
        <span className="text-gray-400 lowercase">to</span>
        <span className="font-medium text-gray-900">{newValue || "—"}</span>
      </div>
    );
  }

  if (fieldName === "due_date") {
    return (
      <p className="text-sm text-gray-700">
        {formatDueDateValue(oldValue)}
        <span className="mx-2 text-gray-400 lowercase">to</span>
        {formatDueDateValue(newValue)}
      </p>
    );
  }

  if (fieldName === "title" || fieldName === "description") {
    return (
      <div className="text-sm text-gray-700 space-y-1">
        {oldValue != null && oldValue !== "" && (
          <p className="line-clamp-3 text-gray-600 bg-gray-50 rounded px-2 py-1">
            {oldValue}
          </p>
        )}
        <p className="text-gray-400 text-xs lowercase">to</p>
        {newValue != null && newValue !== "" ? (
          <p className="line-clamp-4 text-gray-800 bg-gray-50 rounded px-2 py-1">
            {newValue}
          </p>
        ) : (
          <span className="text-gray-500">—</span>
        )}
      </div>
    );
  }

  return (
    <p className="text-sm text-gray-700">
      <span className="text-gray-600">{oldValue || "—"}</span>
      <span className="mx-2 text-gray-400 lowercase">to</span>
      <span className="text-gray-600">{newValue || "—"}</span>
    </p>
  );
}

/**
 * @param {object} props
 * @param {object} props.item — timeline row from API
 * @param {'all' | 'history'} props.tabMode — category pills only when 'all'
 */
export default function IssueTimelineRow({ item, tabMode }) {
  const occurredIso = parseOccurredAt(item.occurredAt);
  const timeLabel = formatSmartTimestamp(occurredIso);
  const showCategoryPill = tabMode === "all";

  const isComment = item.kind === "comment";
  const displayName = isComment
    ? item.commentAuthorName
    : item.actorName;
  const actionFragment = getActivityActionFragment(item);

  const body = (() => {
    if (isComment) {
      const text = item.content || "";
      return (
        <p className="text-sm text-gray-800 border-l-2 border-gray-200 pl-3 italic">
          &ldquo;{text}&rdquo;
        </p>
      );
    }
    if (item.activityType === "TASK_CREATED") {
      return null;
    }
    if (item.activityType === "TASK_FIELD_UPDATED") {
      return <FieldChangeBody item={item} />;
    }
    return null;
  })();

  return (
    <div className="pb-4 mb-4 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
      <div className="flex items-start gap-3">
        <div
          className={`w-8 h-8 flex-shrink-0 ${getAvatarColor(displayName)} text-white rounded-full flex items-center justify-center text-sm font-medium`}
        >
          {getUserInitials(displayName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900">
            <span className="font-semibold">{displayName || "Someone"}</span>{" "}
            <span className="font-normal text-gray-700">{actionFragment}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {showCategoryPill && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border bg-gray-200 text-black border-gray-300">
                {isComment ? "Comment" : "History"}
              </span>
            )}
            <span className="text-xs text-gray-500">{timeLabel}</span>
          </div>
          {body ? <div className="mt-2">{body}</div> : null}
        </div>
      </div>
    </div>
  );
}
