import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { X, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthService from '../services/AuthService';
import TaskFormPriorityField from './TaskFormPriorityField';
import TaskFormStatusField from './TaskFormStatusField';
import TaskFormAssigneeField from './TaskFormAssigneeField';
import StatusBadge from './StatusBadge';
import { assigneeIdStringFromIssue, UNASSIGNED } from '../constants/assigneeForm';
import { normalizeTitleForCompare } from '../utils/taskFormNormalization';
import {
  buildEditBaselineFromIssue,
  computeTaskEditDelta,
  persistTaskEdits,
} from '../utils/persistTaskEdit';

/**
 * @param {'default'|'scrum_backlog_badge'|'scrum_active_sprint'} [statusFieldVariant] - Scrum only; omit for Kanban (full status edit).
 */
export default function EditTaskModal({
  showModal,
  onClose,
  issue,
  projectMembers = [],
  statusFieldVariant = 'default',
}) {
  const dispatch = useDispatch();
  const { isCreator, isProjectOwner, canUpdateIssueStatus } = useAuth();
  const { currentProject } = useSelector((state) => state.project);
  const myRole = currentProject?.myRole ?? null;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    status: 'TO_DO',
    assigneeId: UNASSIGNED,
  });
  const [baseline, setBaseline] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const canEditFullDetails = useMemo(() => {
    if (!issue) return false;
    const canAdministerAllTasks =
      myRole === 'OWNER' ||
      myRole === 'ADMIN' ||
      (!myRole && isProjectOwner(issue.projectOwnerId));
    return isCreator(issue.createdById) || canAdministerAllTasks;
  }, [issue, myRole, isCreator, isProjectOwner]);

  const isAssigneeOnlyEditor = useMemo(() => {
    if (!issue || canEditFullDetails) return false;
    return canUpdateIssueStatus(issue);
  }, [issue, canEditFullDetails, canUpdateIssueStatus]);

  const statusEditable = statusFieldVariant !== 'scrum_backlog_badge';

  useEffect(() => {
    if (!showModal || !issue) return;
    const b = buildEditBaselineFromIssue(issue);
    setBaseline(b);
    const statusValue =
      statusFieldVariant === 'scrum_backlog_badge' ? 'TO_DO' : issue.status || 'TO_DO';
    setFormData({
      title: issue.title || '',
      description: issue.description ?? '',
      priority: issue.priority || 'MEDIUM',
      dueDate: issue.dueDate ? issue.dueDate.split('T')[0] : '',
      status: statusValue,
      assigneeId: assigneeIdStringFromIssue(issue),
    });
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- baseline when opening modal; avoid Redux reference churn
  }, [showModal, issue?.id, statusFieldVariant]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const delta = useMemo(() => {
    if (!baseline) {
      return { statusChanged: false, nonStatusFieldsChanged: false };
    }
    return computeTaskEditDelta(formData, baseline, canEditFullDetails, { statusEditable });
  }, [formData, baseline, canEditFullDetails, statusEditable]);

  const titleValid = normalizeTitleForCompare(formData.title).length > 0;

  const canSubmit = useMemo(() => {
    if (!baseline || isSubmitting) return false;
    if (isAssigneeOnlyEditor) {
      return delta.statusChanged;
    }
    if (!titleValid) return false;
    return delta.statusChanged || delta.nonStatusFieldsChanged || delta.assigneeChanged;
  }, [baseline, isSubmitting, isAssigneeOnlyEditor, delta, titleValid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issue || !baseline || !canSubmit) return;

    setIsSubmitting(true);
    setError('');
    try {
      await persistTaskEdits(dispatch, {
        issueId: issue.id,
        formData,
        baseline,
        canEditFullDetails,
        statusEditable,
      });
      onClose();
    } catch (err) {
      setError(err?.message || String(err) || 'Failed to update task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldsLocked = isAssigneeOnlyEditor;

  const onCloseStable = useCallback(() => {
    if (!isSubmitting) onClose();
  }, [isSubmitting, onClose]);

  if (!showModal || !issue) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Task</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCloseStable}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {isAssigneeOnlyEditor && statusEditable && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex gap-2 text-sm text-amber-900">
              <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
              <p>You can only change the status of this task.</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title {canEditFullDetails ? '*' : ''}
            </label>
            <input
              type="text"
              id="edit-title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              disabled={fieldsLocked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
              placeholder="Task title"
              required={canEditFullDetails}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="edit-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={fieldsLocked}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-600"
              placeholder="Describe your task"
            />
          </div>

          <TaskFormPriorityField
            value={formData.priority}
            disabled={fieldsLocked}
            onChange={(priority) => {
              setFormData((prev) => ({ ...prev, priority }));
              if (error) setError('');
            }}
          />

          {statusFieldVariant === 'scrum_backlog_badge' ? (
            <div className="mb-4">
              <span className="block text-sm font-medium text-gray-700 mb-1">Status</span>
              <div className="flex items-center min-h-[40px]">
                <StatusBadge status="TO_DO" />
              </div>
            </div>
          ) : (
            <TaskFormStatusField
              value={formData.status}
              onChange={(status) => {
                setFormData((prev) => ({ ...prev, status }));
                if (error) setError('');
              }}
            />
          )}

          {canEditFullDetails && projectMembers.length > 0 && (
            <TaskFormAssigneeField
              value={formData.assigneeId}
              onChange={(assigneeId) => {
                setFormData((prev) => ({ ...prev, assigneeId }));
                if (error) setError('');
              }}
              projectMembers={projectMembers}
              currentUserId={AuthService.getCurrentUserId()}
              triggerId="edit-task-modal-assignee-trigger"
            />
          )}

          <div className="mb-6">
            <label htmlFor="edit-dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              id="edit-dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              disabled={fieldsLocked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCloseStable}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!canSubmit}>
              {isSubmitting ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block align-middle" />
                  Updating…
                </>
              ) : (
                'Update'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
