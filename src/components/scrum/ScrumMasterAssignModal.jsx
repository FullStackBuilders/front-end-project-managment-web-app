import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { projectApi } from '@/services/projectApi';

export default function ScrumMasterAssignModal({
  open,
  onClose,
  projectId,
  members,
  onSuccess,
}) {
  const [userId, setUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) return;
    setSubmitting(true);
    setError(null);
    try {
      await projectApi.updateMemberRole(projectId, Number(userId), 'SCRUM_MASTER');
      onSuccess?.();
      onClose();
      setUserId('');
    } catch (err) {
      const status = err?.status;
      const msg =
        status === 409
          ? 'One Scrum Master is already assigned to this project. Only one Scrum Master is allowed.'
          : err?.message || 'Could not assign Scrum Master';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Assign Scrum Master</h2>
        <p className="text-sm text-gray-600 mb-4">
          Choose a team member to hold the Scrum Master role for this Scrum project.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="sm-member" className="block text-sm font-medium text-gray-700 mb-1">
              Team member
            </label>
            <select
              id="sm-member"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            >
              <option value="">Select…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName} ({m.email || 'member'})
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => {
                setError(null);
                setUserId('');
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !userId}>
              {submitting ? 'Saving…' : 'Assign'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
