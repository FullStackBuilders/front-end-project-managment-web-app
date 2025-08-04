import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { format } from 'date-fns';
import { Calendar, Eye, UserPlus, Trash2, Edit, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';
import { deleteIssue } from '../store/issueSlice';
import AssigneeModal from './AssigneeModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import IssueDetailModal from './IssueDetailModal'; // Import the new modal

const PRIORITY_COLORS = {
  HIGH: 'bg-red-100 text-red-800 border-red-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW: 'bg-green-100 text-green-800 border-green-200'
};

const PRIORITY_ICONS = {
  HIGH: '🔴',
  MEDIUM: '🟡',
  LOW: '🟢'
};

export default function IssueCard({ issue, projectId, onCardClick, onEditIssue, ...dragProps }) {
  const [showAssigneeModal, setShowAssigneeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false); // New state for detail modal
  const [isDeleting, setIsDeleting] = useState(false);
  const dispatch = useDispatch();
  const { isCreator, canAssignIssue } = useAuth();
  const { currentProject } = useSelector(state => state.project);

  const canEditOrDelete = isCreator(issue.createdById);
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
      console.error('Failed to delete issue:', error);
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

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd');
    } catch {
      return '';
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
            <span className="text-sm">{PRIORITY_ICONS[issue.priority]}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${PRIORITY_COLORS[issue.priority]}`}>
              {issue.priority}
            </span>
            <div className="ml-auto text-xs text-gray-500">
              #{issue.id}
            </div>
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
            <span className="text-xs font-medium text-gray-500">Assigned to:</span>
            {issue.assignee ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">
                  {issue.assignee?.firstName?.[0]}{issue.assignee?.lastName?.[0]}
                </div>
                <span className="text-xs text-gray-700">
                  {issue.assignee.firstName} {issue.assignee.lastName}
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-400 italic">No one</span>
            )}
          </div>

          {/* Due Date */}
          {issue.dueDate && (
            <div className="flex items-center gap-1 mb-3 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>Due {formatDate(issue.dueDate)}</span>
            </div>
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
                Assign
              </Button>
            )}

            {canEditOrDelete && (
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
          projectMembers={currentProject?.team || []}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        showModal={showDeleteModal}
        setShowModal={setShowDeleteModal}
        onConfirm={handleDeleteConfirm}
        title="Delete Issue"
        message={`Are you sure you want to delete the issue "${issue.title}"?`}
        warningMessage="This action cannot be undone. The issue and all its associated data will be permanently deleted from the project."
        confirmText="Delete Issue"
        isDeleting={isDeleting}
        itemType="issue"
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