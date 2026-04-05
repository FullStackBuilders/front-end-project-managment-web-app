import { useState, useMemo } from 'react';
import FormSelectPopover from './FormSelectPopover';
import { getAvatarColor } from '../utils/avatarColor';
import { memberFullName } from '../utils/memberUtils';
import { UNASSIGNED, isUnassignedSelection, sameUserId } from '../constants/assigneeForm';

function memberInitials(member) {
  const a = member.firstName?.[0] || '';
  const b = member.lastName?.[0] || '';
  const pair = `${a}${b}`.toUpperCase();
  if (pair) return pair;
  return (member.email?.[0] || '?').toUpperCase();
}

function MemberAvatar({ member }) {
  const name = memberFullName(member);
  return (
    <div
      className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-medium text-white ${getAvatarColor(name)}`}
    >
      {memberInitials(member)}
    </div>
  );
}

/**
 * Order: (1) Unassigned — only when a person is currently selected
 * (2) Assign to me — only when logged-in user is in project and is not the current assignee
 * (3) Other members — exclude current assignee and exclude current user if already in step 2
 */
export default function TaskFormAssigneeField({
  value,
  onChange,
  projectMembers,
  currentUserId,
  triggerId = 'task-form-assignee-trigger',
}) {
  const [open, setOpen] = useState(false);

  const currentUserMember = useMemo(
    () =>
      currentUserId != null
        ? projectMembers.find((m) => sameUserId(m.id, currentUserId))
        : null,
    [projectMembers, currentUserId]
  );

  const selectedMember = useMemo(() => {
    if (isUnassignedSelection(value)) return null;
    return projectMembers.find((m) => sameUserId(m.id, value)) || null;
  }, [value, projectMembers]);

  const dropdownRows = useMemo(() => {
    const rows = [];
    const vUnassigned = isUnassignedSelection(value);

    if (!vUnassigned) {
      rows.push(
        <li key="unassigned" role="presentation">
          <button
            type="button"
            role="option"
            className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => {
              onChange(UNASSIGNED);
              setOpen(false);
            }}
          >
            Unassigned
          </button>
        </li>
      );
    }

    const showAssignToMe =
      currentUserMember != null && (vUnassigned || !sameUserId(value, currentUserId));

    if (showAssignToMe) {
      rows.push(
        <li key="assign-to-me" role="presentation">
          <button
            type="button"
            role="option"
            className="w-full px-3 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3"
            onClick={() => {
              onChange(String(currentUserId));
              setOpen(false);
            }}
          >
            <MemberAvatar member={currentUserMember} />
            <div className="min-w-0 text-left">
              <span className="text-xs font-medium text-gray-500 block">Assign to me</span>
              <span className="text-sm text-gray-900 truncate block">{memberFullName(currentUserMember)}</span>
            </div>
          </button>
        </li>
      );
    }

    projectMembers.forEach((m) => {
      if (!vUnassigned && sameUserId(m.id, value)) return;
      if (showAssignToMe && sameUserId(m.id, currentUserId)) return;
      rows.push(
        <li key={`member-${m.id}`} role="presentation">
          <button
            type="button"
            role="option"
            className="w-full px-3 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3"
            onClick={() => {
              onChange(String(m.id));
              setOpen(false);
            }}
          >
            <MemberAvatar member={m} />
            <span className="text-sm text-gray-900 truncate">{memberFullName(m)}</span>
          </button>
        </li>
      );
    });

    return rows;
  }, [value, currentUserId, currentUserMember, projectMembers, onChange]);

  const triggerContent = !selectedMember ? (
    <span className="text-gray-600 text-sm">Unassigned</span>
  ) : (
    <div className="flex items-center gap-2 min-w-0">
      <MemberAvatar member={selectedMember} />
      <span className="text-sm text-gray-900 truncate">{memberFullName(selectedMember)}</span>
    </div>
  );

  return (
    <FormSelectPopover
      label="Assignee"
      triggerId={triggerId}
      open={open}
      onOpenChange={setOpen}
      triggerContent={triggerContent}
    >
      {dropdownRows}
    </FormSelectPopover>
  );
}
