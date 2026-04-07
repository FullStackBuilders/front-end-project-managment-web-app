import IssueTimelineRow from "./IssueTimelineRow";

const TABS = [
  { id: "all", label: "All" },
  { id: "history", label: "History" },
  { id: "comments", label: "Comments" },
];

/**
 * KanbanMetrics-style segmented tabs + timeline list (All / History) or comments slot.
 */
export default function IssueActivitySection({
  activeTab,
  onTabChange,
  items,
  loading,
  error,
  onRetry,
  renderCommentsTab,
}) {
  const listItems =
    activeTab === "history"
      ? items.filter((i) => i.kind === "activity")
      : activeTab === "all"
        ? items
        : [];

  return (
    <div className="border-t border-gray-200 pt-6">
      <h4 className="text-lg font-medium text-gray-900 mb-4">Activity</h4>

      <div
        className="flex items-center rounded-md border border-gray-200 overflow-hidden bg-white mb-5 w-fit"
        role="tablist"
        aria-label="Activity views"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            id={`activity-tab-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors border-r border-gray-200 last:border-r-0
              ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "comments" ? (
        renderCommentsTab()
      ) : loading ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          Loading activity…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 text-sm font-medium text-red-900 underline"
            >
              Retry
            </button>
          )}
        </div>
      ) : listItems.length === 0 ? (
        <p className="text-gray-500 text-center py-8 text-sm">No activity yet</p>
      ) : (
        <div className="max-h-80 overflow-y-auto pr-1">
          {listItems.map((item, idx) => (
            <IssueTimelineRow
              key={
                item.kind === "comment"
                  ? `c-${item.commentId ?? idx}`
                  : `a-${item.activityId ?? idx}`
              }
              item={item}
              tabMode={activeTab}
            />
          ))}
        </div>
      )}
    </div>
  );
}
