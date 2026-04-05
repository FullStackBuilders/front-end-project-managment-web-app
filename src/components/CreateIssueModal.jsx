import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Button } from '@/components/ui/button';
import { X, AlertCircle } from 'lucide-react';
import { createIssue } from '../store/issueSlice';
import AuthService from '../services/AuthService';
import TaskFormPriorityField from './TaskFormPriorityField';
import TaskFormAssigneeField from './TaskFormAssigneeField';
import { assigneeIdToCreateApiPayload, UNASSIGNED } from '../constants/assigneeForm';
import { normalizeTitleForCompare } from '../utils/taskFormNormalization';

export default function CreateIssueModal({ showModal, setShowModal, projectId, projectMembers = [] }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    assigneeId: UNASSIGNED,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();

  const titleValid = normalizeTitleForCompare(formData.title).length > 0;
  const canSubmit = titleValid && !isSubmitting;

  useEffect(() => {
    if (!showModal) return;
    const today = new Date().toLocaleDateString('en-CA');
    setFormData({
      title: '',
      description: '',
      priority: 'MEDIUM',
      dueDate: today,
      assigneeId: UNASSIGNED,
    });
    setError('');
  }, [showModal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!normalizeTitleForCompare(formData.title)) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const issueData = {
        title: normalizeTitleForCompare(formData.title),
        description: formData.description.replace(/\r\n/g, '\n').trim(),
        priority: formData.priority,
        dueDate: formData.dueDate || null,
        assigneeId: assigneeIdToCreateApiPayload(formData.assigneeId),
      };

      await dispatch(
        createIssue({
          projectId,
          issueData,
        })
      ).unwrap();

      setShowModal(false);
    } catch (err) {
      setError(err || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showModal) return null;

  const todayStr = new Date().toLocaleDateString('en-CA');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create New Task</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter Task title"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder="Describe your task"
            />
          </div>

          <TaskFormPriorityField
            value={formData.priority}
            onChange={(priority) => {
              setFormData((prev) => ({ ...prev, priority }));
              if (error) setError('');
            }}
          />

          {projectMembers.length > 0 && (
            <TaskFormAssigneeField
              value={formData.assigneeId}
              onChange={(assigneeId) => {
                setFormData((prev) => ({ ...prev, assigneeId }));
                if (error) setError('');
              }}
              projectMembers={projectMembers}
              currentUserId={AuthService.getCurrentUserId()}
              triggerId="create-issue-modal-assignee-trigger"
            />
          )}

          <div className="mb-6">
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              min={todayStr}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!canSubmit}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating…
                </>
              ) : (
                'Create Task'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
