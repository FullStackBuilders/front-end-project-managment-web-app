import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Users, X, RefreshCw } from 'lucide-react';
import { projectApi } from '@/services/projectApi';
import { getAvatarColor } from '@/utils/avatarColor';
import FormSelectPopover from './FormSelectPopover';

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MEMBER', label: 'Member' },
];

const ROLE_LABELS = {
  ADMIN: 'Admin',
  MEMBER: 'Member',
  SCRUM_MASTER: 'Scrum Master',
};

const SCRUM_MASTER_OPTION = { value: 'SCRUM_MASTER', label: 'Scrum Master' };

function resolveRoleErrorMessage(err) {
  const status = err?.status ?? err?.response?.status;
  if (status === 409) {
    return 'A Scrum Master is already assigned. Change their role first, then assign a new one.';
  }
  if (status === 404) {
    return 'This member is no longer part of the project. Please refresh.';
  }
  if (status === 403) {
    return 'You do not have permission to change this member\'s role.';
  }
  return err?.message || 'Failed to update role. Please try again.';
}

function resolveRemoveErrorMessage(err) {
  const status = err?.status ?? err?.response?.status;
  if (status === 403) {
    return 'You do not have permission to remove this member.';
  }
  if (status === 404) {
    return 'This member is no longer part of the project. Please refresh.';
  }
  return err?.message || 'Failed to remove member. Please try again.';
}

export default function ManageTeamMembersModal({
  open,
  onClose,
  projectId,
  ownerId,
  callerId,
  myRole,
  framework,
}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [rowErrors, setRowErrors] = useState({});
  const [savingRows, setSavingRows] = useState({});
  const [removingRows, setRemovingRows] = useState({});
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [localRoles, setLocalRoles] = useState({});
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const isScrum = framework === 'SCRUM';

  const roleOptions = isScrum
    ? [...ROLE_OPTIONS, SCRUM_MASTER_OPTION]
    : ROLE_OPTIONS;

  const filterMembers = useCallback(
    (all) => {
      return all.filter((m) => {
        if (m.userId === callerId) return false;
        if (myRole === 'ADMIN' && m.userId === ownerId) return false;
        return true;
      });
    },
    [callerId, myRole, ownerId],
  );

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setConfirmRemoveId(null);
    try {
      const data = await projectApi.getProjectMembers(projectId);
      const filtered = filterMembers(data);
      setMembers(filtered);
      const initial = {};
      filtered.forEach((m) => {
        initial[m.userId] = m.role;
      });
      setLocalRoles(initial);
      setRowErrors({});
    } catch (err) {
      setFetchError(err?.message || 'Failed to load team members.');
    } finally {
      setLoading(false);
    }
  }, [projectId, filterMembers]);

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, fetchMembers]);

  const handleRoleChange = (userId, role) => {
    setLocalRoles((prev) => ({ ...prev, [userId]: role }));
    setRowErrors((prev) => ({ ...prev, [userId]: null }));
  };

  const handleSave = async (member) => {
    const newRole = localRoles[member.userId];
    if (!newRole || newRole === member.role) return;

    setSavingRows((prev) => ({ ...prev, [member.userId]: true }));
    setRowErrors((prev) => ({ ...prev, [member.userId]: null }));

    try {
      await projectApi.updateMemberRole(projectId, member.userId, newRole);
      await fetchMembers();
    } catch (err) {
      setRowErrors((prev) => ({
        ...prev,
        [member.userId]: resolveRoleErrorMessage(err),
      }));
      setLocalRoles((prev) => ({ ...prev, [member.userId]: member.role }));
    } finally {
      setSavingRows((prev) => ({ ...prev, [member.userId]: false }));
    }
  };

  const handleRemoveConfirm = async (userId) => {
    setRemovingRows((prev) => ({ ...prev, [userId]: true }));
    setRowErrors((prev) => ({ ...prev, [userId]: null }));
    setConfirmRemoveId(null);

    try {
      await projectApi.removeProjectMember(projectId, userId);
      await fetchMembers();
    } catch (err) {
      setRowErrors((prev) => ({
        ...prev,
        [userId]: resolveRemoveErrorMessage(err),
      }));
    } finally {
      setRemovingRows((prev) => ({ ...prev, [userId]: false }));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Manage Team Members
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Loading members…
            </div>
          )}

          {!loading && fetchError && (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm text-red-600 text-center">{fetchError}</p>
              <Button variant="outline" size="sm" onClick={fetchMembers}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          )}

          {!loading && !fetchError && members.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">
              No members to manage. Invite members to the project first.
            </p>
          )}

          {!loading && !fetchError && members.length > 0 && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">
                {isScrum
                  ? 'Change member roles or remove members. Only one Scrum Master is allowed per project.'
                  : 'Change member roles or remove members from this project.'}
              </p>
              {members.map((member) => {
                const fullName = `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim();
                const currentLocalRole = localRoles[member.userId] ?? member.role;
                const isDirty = currentLocalRole !== member.role;
                const isSaving = !!savingRows[member.userId];
                const isRemoving = !!removingRows[member.userId];
                const isConfirming = confirmRemoveId === member.userId;
                const isBusy = isSaving || isRemoving;
                const rowError = rowErrors[member.userId];

                return (
                  <div key={member.userId}>
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 flex-shrink-0 ${getAvatarColor(fullName)} text-white rounded-full flex items-center justify-center text-sm font-medium`}
                      >
                        {member.firstName?.[0]}
                        {member.lastName?.[0]}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{fullName}</p>
                        <p className="text-xs text-gray-500 truncate">{member.email}</p>
                      </div>

                      {isConfirming ? (
                        /* Two-step remove confirmation */
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600 font-medium whitespace-nowrap">Remove member?</span>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isRemoving}
                            onClick={() => handleRemoveConfirm(member.userId)}
                            className="text-xs"
                          >
                            {isRemoving ? 'Removing…' : 'Confirm'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmRemoveId(null)}
                            className="text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        /* Normal row: role select + Save + Remove */
                        <>
                          <FormSelectPopover
                            triggerId={`role-select-${member.userId}`}
                            open={openDropdownId === member.userId}
                            onOpenChange={(v) => setOpenDropdownId(v ? member.userId : null)}
                            disabled={isBusy}
                            rootClassName="mb-0"
                            triggerContent={
                              <span className="text-sm text-gray-700">
                                {ROLE_LABELS[currentLocalRole] ?? currentLocalRole}
                              </span>
                            }
                          >
                            {roleOptions
                              .filter((opt) => opt.value !== currentLocalRole)
                              .map((opt) => (
                                <li key={opt.value} role="presentation">
                                  <button
                                    type="button"
                                    role="option"
                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={() => {
                                      handleRoleChange(member.userId, opt.value);
                                      setOpenDropdownId(null);
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                </li>
                              ))}
                          </FormSelectPopover>

                          <Button
                            size="sm"
                            variant={isDirty ? 'default' : 'outline'}
                            disabled={!isDirty || isBusy}
                            onClick={() => handleSave(member)}
                            className="text-xs min-w-[56px]"
                          >
                            {isSaving ? 'Saving…' : 'Save'}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => {
                              setConfirmRemoveId(member.userId);
                              setRowErrors((prev) => ({ ...prev, [member.userId]: null }));
                            }}
                            className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400"
                          >
                            Remove
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Per-row error */}
                    {rowError && (
                      <p className="text-xs text-red-600 mt-1 ml-12" role="alert">
                        {rowError}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
