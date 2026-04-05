import React, { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { format } from "date-fns";
import { Calendar, Eye, UserPlus, Trash2, Edit, Flag } from "lucide-react";
import { formatSmartTimestamp } from "../utils/dateUtils";
import { Button } from "@/components/ui/button";
import { useAuth } from "../context/AuthContext";
import { deleteIssue } from "../store/issueSlice";
import AssigneeModal from "./AssigneeModal";
import { getAvatarColor } from "../utils/avatarColor";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import IssueDetailModal from "./IssueDetailModal"; // Import the new modal

const PRIORITY_COLORS = {
  HIGH: "bg-red-100 text-red-800 border-red-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  LOW: "bg-green-100 text-green-800 border-green-200",
};

// const PRIORITY_ICONS = {
//   HIGH: 'HIGH',
//   MEDIUM: 'MEDIUM',
//   LOW: 'LOW'
// };

export default function IssueCard({ issue, onEditIssue, ...dragProps }) {
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false); // New state for detail modal
  const [isDeleting, setIsDeleting] = useState(false);
  const dispatch = useDispatch();
  const { isCreator, isProjectOwner, canAssignIssue, canUpdateIssueStatus } = useAuth();
  const { currentProject } = useSelector((state) => state.project);

  const projectMembersForAssignee = useMemo(() => {
    const owner = currentProject?.owner;
    const team = currentProject?.team || [];
    if (!owner) return team;
    const seen = new Set([owner.id]);
    return [owner, ...team.filter((m) => !seen.has(m.id))];
  }, [currentProject]);

  const canEditOrDelete = isCreator(issue.createdById) || isProjectOwner(issue.projectOwnerId);
  const canOpenEditModal = canEditOrDelete || canUpdateIssueStatus(issue);
  const canAssign = canAssignIssue(issue);

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await dispatch(deleteIssue(issue.id)).unwrap();
      setShowDeleteModal(false);
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    // Call the onEditIssue prop passed down from KanbanBoard
    if (onEditIssue) {
      onEditIssue(issue);
    }
  };

  const handleView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    setShowDetailModal(true); // Open the detail modal
  };

  const handleAssign = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    setShowAssigneeModal(true);
  };

  const getUserInitials = (userName) => {
    if (!userName) return "??";
    return userName
      .split(" ")
      .map((part) => part[0] || "")
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString + "T00:00:00"), "MMM dd");
    } catch {
      return "";
    }
  };


  return (
    <>
      <div
        className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        {...dragProps}
      >
        {/* Card Content */}
        <div className="p-4">
          {/* Header with Priority and ID */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-gray-500">
              Priority Level:
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium border ${PRIORITY_COLORS[issue.priority]}`}
            >
              <Flag className="w-3 h-3 inline mr-1" />
              {issue.priority}
            </span>
            <div className="ml-auto text-xs text-gray-500">#{issue.id}</div>
          </div>

          {/* Title */}
          <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">
            {issue.title}
          </h4>

          {/* Description */}
          {issue.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {issue.description}
            </p>
          )}

          {/* Assignee */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-gray-500">
              Assigned to:
            </span>
            {issue.assigneeName ? (
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 ${getAvatarColor(issue.assigneeName)} text-white rounded-full flex items-center justify-center text-xs font-medium`}>
                  {getUserInitials(issue.assigneeName)}
                </div>
                <span className="text-xs text-gray-700">
                  {issue.assigneeName}
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-600">Unassigned</span>
            )}
          </div>

          {/* Due Date */}
          {issue.dueDate && (
            <div className="flex items-center gap-1 mb-3 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>Due {formatDate(issue.dueDate)}</span>
            </div>
          )}

          {/* Last edited info */}
          {issue.lastEditedByName && (
            <p className="text-xs text-gray-400 mb-2">
              Edited by {issue.lastEditedByName} · {formatSmartTimestamp(issue.lastEditedAt)}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 pt-3 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleView}
              onMouseDown={(e) => e.stopPropagation()}
              type="button"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Button>

            {canAssign && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-xs"
                onClick={handleAssign}
                onMouseDown={(e) => e.stopPropagation()}
                type="button"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                {issue.assigneeName ? 'Change Assignee' : 'Assign'}
              </Button>
            )}

            {canOpenEditModal && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={handleEdit}
                onMouseDown={(e) => e.stopPropagation()}
                type="button"
              >
                <Edit className="w-3 h-3" />
              </Button>
            )}

            {canEditOrDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDeleteClick}
                onMouseDown={(e) => e.stopPropagation()}
                type="button"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Assignee Modal */}
      {showAssigneeModal && (
        <AssigneeModal
          showModal={showAssigneeModal}
          setShowModal={setShowAssigneeModal}
          issue={issue}
          projectMembers={projectMembersForAssignee}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        showModal={showDeleteModal}
        setShowModal={setShowDeleteModal}
        onConfirm={handleDeleteConfirm}
        title="Delete Task"
        message={`Are you sure you want to delete the task "${issue.title}"?`}
        warningMessage="This action cannot be undone. The task and all its associated data will be permanently deleted from the project."
        confirmText="Delete Task"
        isDeleting={isDeleting}
        itemType="task"
      />

      {/* Issue Detail Modal */}
      <IssueDetailModal
        showModal={showDetailModal}
        setShowModal={setShowDetailModal}
        issueId={issue.id}
      />
    </>
  );
}