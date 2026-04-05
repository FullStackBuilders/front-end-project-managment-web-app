import { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { Button } from '@/components/ui/button';
import { X, AlertCircle } from 'lucide-react';
import { addAssignee, clearAssignee } from '../store/issueSlice';
import AuthService from '../services/AuthService';
import TaskFormAssigneeField from './TaskFormAssigneeField';
import { assigneeIdStringFromIssue, isUnassignedSelection, UNASSIGNED } from '../constants/assigneeForm';

export default function AssigneeModal({ showModal, setShowModal, issue, projectMembers }) {
  const [assigneeId, setAssigneeId] = useState(UNASSIGNED);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();

  const baselineAssigneeId = useMemo(
    () => (issue ? assigneeIdStringFromIssue(issue) : UNASSIGNED),
    [issue]
  );

  useEffect(() => {
    if (!showModal || !issue) return;
    setAssigneeId(assigneeIdStringFromIssue(issue));
    setError('');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when modal opens for this task
  }, [showModal, issue?.id]);

  const hasChanges = assigneeId !== baselineAssigneeId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issue || !hasChanges) return;

    setIsSubmitting(true);
    setError('');

    try {
      if (isUnassignedSelection(assigneeId)) {
        await dispatch(clearAssignee(issue.id)).unwrap();
      } else {
        await dispatch(
          addAssignee({
            issueId: issue.id,
            userId: Number(assigneeId),
          })
        ).unwrap();
      }
      setShowModal(false);
    } catch (err) {
      setError(err || 'Failed to update assignee');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showModal || !issue) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Change assignee</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowModal(false)}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 text-sm mb-1">{issue.title}</h3>
            <p className="text-xs text-gray-500">Task #{issue.id}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {projectMembers.length === 0 ? (
            <p className="text-sm text-gray-500 mb-6">No project members available to assign.</p>
          ) : (
            <TaskFormAssigneeField
              value={assigneeId}
              onChange={(v) => {
                setAssigneeId(v);
                if (error) setError('');
              }}
              projectMembers={projectMembers}
              currentUserId={AuthService.getCurrentUserId()}
              triggerId="assignee-modal-assignee-trigger"
            />
          )}

          <div className="flex items-center gap-3 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || !hasChanges || projectMembers.length === 0}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block align-middle" />
                  Saving…
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
