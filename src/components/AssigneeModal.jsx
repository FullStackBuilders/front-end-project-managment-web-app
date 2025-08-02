import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Button } from '@/components/ui/button';
import { X, User, Check } from 'lucide-react';
import { addAssignee } from '../store/issueSlice';

export default function AssigneeModal({ showModal, setShowModal, issue, projectMembers }) {
  const [selectedUserId, setSelectedUserId] = useState(issue.assignee?.id || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      setError('Please select a team member');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await dispatch(addAssignee({ 
        issueId: issue.id, 
        userId: selectedUserId 
      })).unwrap();
      
      setShowModal(false);
    } catch (error) {
      setError(error || 'Failed to assign user');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Assign Issue</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Issue Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 text-sm mb-1">{issue.title}</h3>
            <p className="text-xs text-gray-500">Issue #{issue.id}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Team Members List */}
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Team Member
              </label>
              
              {projectMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm">No team members available</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {projectMembers.map((member) => (
                    <div
                      key={member.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedUserId === member.id
                          ? 'border-primary bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedUserId(member.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {member.firstName?.[0]}{member.lastName?.[0]}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {member.email}
                          </p>
                        </div>

                        {selectedUserId === member.id && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                disabled={isSubmitting || !selectedUserId || projectMembers.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Assigning...
                  </>
                ) : (
                  'Assign User'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}