import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROJECT_FRAMEWORK } from "@/constants/projectFramework";

/**
 * First step: user picks Kanban or Scrum framework before the shared create-project form.
 */
export default function ScrumProjectTemplateModal({ open, onClose, onSelectFramework }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-modal-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center rounded-t-xl">
          <h2 id="template-modal-title" className="text-xl font-bold text-gray-900">
            Choose Framework
          </h2>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <p className="px-6 pt-4 text-sm text-gray-600">
          Choose how your team will manage this project. This determines how tasks are organized and
          tracked in your workspace.
        </p>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            role="option"
            aria-selected={false}
            className="text-left rounded-lg border-2 border-gray-200 p-5 hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
            onClick={() => onSelectFramework(PROJECT_FRAMEWORK.SCRUM)}
          >
            <span className="text-lg font-semibold text-gray-900 block mb-2">Scrum</span>
            <p className="text-sm text-gray-600 leading-relaxed">
              Scrum helps your team manage work in time-boxed sprints. Plan tasks in a backlog, track
              progress during each sprint, and review outcomes at the end of each sprint.
            </p>
          </button>

          <button
            type="button"
            role="option"
            aria-selected={false}
            className="text-left rounded-lg border-2 border-gray-200 p-5 hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
            onClick={() => onSelectFramework(PROJECT_FRAMEWORK.KANBAN)}
          >
            <span className="text-lg font-semibold text-gray-900 block mb-2">Kanban</span>
            <p className="text-sm text-gray-600 leading-relaxed">
              Kanban visualizes work using boards and columns. It helps teams
              manage workflow, limit work-in-progress (WIP), and track progress using metrics such as cycle
              time and lead time.
            </p>
          </button>
        </div>

        <div className="px-6 pb-6 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
