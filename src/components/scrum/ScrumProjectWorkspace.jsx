import { useState, useCallback } from "react";
import ScrumBacklogView from "./ScrumBacklogView";
import ScrumBoardView from "./ScrumBoardView";
import ScrumListView from "./ScrumListView";
import ScrumCalendarView from "./ScrumCalendarView";

const TABS = [
  { id: "backlog", label: "Backlog" },
  { id: "board", label: "Board" },
  { id: "list", label: "List" },
  { id: "calendar", label: "Calendar" },
];

/**
 * Scrum manage-project lower section: Backlog + Board (multi–active-sprint Kanban, default "All").
 */
export default function ScrumProjectWorkspace({ projectId }) {
  const [activeTab, setActiveTab] = useState("backlog");

  const handleSprintStarted = useCallback(() => {
    setActiveTab("board");
  }, []);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4 border-b border-gray-200">
        <div className="flex gap-1" role="tablist" aria-label="Scrum workspace">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              id={`scrum-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer
                ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "backlog" && (
        <div role="tabpanel" aria-labelledby="scrum-tab-backlog">
          <ScrumBacklogView
            projectId={projectId}
            onSprintStarted={handleSprintStarted}
          />
        </div>
      )}

      {activeTab === "board" && (
        <div role="tabpanel" aria-labelledby="scrum-tab-board">
          <ScrumBoardView projectId={projectId} />
        </div>
      )}

      {activeTab === "list" && (
        <div role="tabpanel" aria-labelledby="scrum-tab-list">
          <ScrumListView projectId={projectId} />
        </div>
      )}

      {activeTab === "calendar" && (
        <div role="tabpanel" aria-labelledby="scrum-tab-calendar">
          <ScrumCalendarView projectId={projectId} />
        </div>
      )}
    </div>
  );
}
