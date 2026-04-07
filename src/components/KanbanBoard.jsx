import { useSelector } from "react-redux";
import { KanbanBoardContent } from "./KanbanBoardContent";
import { selectBoardFilteredIssues } from "../store/issueSlice";

export default function KanbanBoard({ projectId }) {
  const { loading } = useSelector((state) => state.issues);
  const issues = useSelector(selectBoardFilteredIssues);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <KanbanBoardContent
      projectId={projectId}
      issues={issues}
      filterView="board"
    />
  );
}
