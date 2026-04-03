import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Button } from '@/components/ui/button';
import { X, AlertCircle } from 'lucide-react';
import { createIssue, updateIssue } from '../store/issueSlice';

function memberFullName(member) {
  return `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email || `User #${member.id}`;
}

export default function CreateIssueModal({ showModal, setShowModal, projectId, editingIssue = null, projectMembers = [] }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    assigneeId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();

  // Populate form when editing
  useEffect(() => {
  const today = new Date().toLocaleDateString('en-CA');

    if (editingIssue) {
      setFormData({
        title: editingIssue.title || '',
        description: editingIssue.description || '',
        priority: editingIssue.priority || 'MEDIUM',
        dueDate: editingIssue.dueDate ? editingIssue.dueDate.split('T')[0] : '',
        assigneeId: '',
      });
    } else {
      // Reset form for create mode
      setFormData({
        title: '',
        description: '',
        priority: 'MEDIUM',
        dueDate: today,
        assigneeId: '',
      });
    }
  }, [editingIssue]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const issueData = {
        title:       formData.title.trim(),
        description: formData.description.trim(),
        priority:    formData.priority,
        dueDate:     formData.dueDate || null,
        // Pass the initial assignee to the backend so it is set atomically during creation
        // without touching the lastEditedBy/lastEditedAt audit trail.
        assigneeId:  formData.assigneeId ? Number(formData.assigneeId) : null,
      };

      if (editingIssue) {
        // Update existing issue (assigneeId is not sent for edits — handled separately)
        await dispatch(updateIssue({
          issueId: editingIssue.id,
          issueData
        })).unwrap();
      } else {
        // Create new issue — assignee is folded into the create request
        await dispatch(createIssue({
          projectId,
          issueData
        })).unwrap();
      }

      setShowModal(false);
    } catch (error) {
      setError(error || `Failed to ${editingIssue ? 'update' : 'create'} issue`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showModal) return null;

  const isEditMode = !!editingIssue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditMode ? 'Edit Issue' : 'Create New Issue'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Title */}
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
              placeholder="Enter issue title"
              required
            />
          </div>

          {/* Description */}
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
              placeholder="Describe the issue in detail"
            />
          </div>

          {/* Priority */}
          <div className="mb-4">
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="LOW"> Low</option>
              <option value="MEDIUM"> Medium</option>
              <option value="HIGH"> High</option>
            </select>
          </div>

          {/* Assignee — shown only in create mode when project members are available */}
          {!editingIssue && projectMembers.length > 0 && (
            <div className="mb-4">
              <label htmlFor="assigneeId" className="block text-sm font-medium text-gray-700 mb-1">
                Assignee
              </label>
              <select
                id="assigneeId"
                name="assigneeId"
                value={formData.assigneeId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">— None —</option>
                {projectMembers.map((member) => (
                  <option key={member.id} value={String(member.id)}>
                    {memberFullName(member)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Due Date */}
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
              min={new Date().toLocaleDateString('en-CA')}
            />
          </div>

          {/* Actions */}
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
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || !formData.title.trim()}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Update Issue' : 'Create Issue'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}