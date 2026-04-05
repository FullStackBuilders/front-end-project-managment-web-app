import { updateIssue, updateIssueStatus, addAssignee, clearAssignee } from '../store/issueSlice';
import {
  normalizeTitleForCompare,
  normalizeDescriptionForCompare,
  baselineDescriptionFromIssue,
} from './taskFormNormalization';
import { UNASSIGNED, assigneeIdStringFromIssue, isUnassignedSelection } from '../constants/assigneeForm';

export function buildEditBaselineFromIssue(issue) {
  if (!issue) return null;
  return {
    title: issue.title ?? '',
    description: baselineDescriptionFromIssue(issue),
    priority: issue.priority || 'MEDIUM',
    dueDate: issue.dueDate ? issue.dueDate.split('T')[0] : '',
    status: issue.status || 'TO_DO',
    assigneeId: assigneeIdStringFromIssue(issue),
  };
}

/**
 * @returns {{ statusChanged: boolean, nonStatusFieldsChanged: boolean, assigneeChanged: boolean }}
 */
export function computeTaskEditDelta(formData, baseline, canEditFullDetails) {
  const normTitle = normalizeTitleForCompare(formData.title);
  const normDesc = normalizeDescriptionForCompare(formData.description);
  const baseTitle = normalizeTitleForCompare(baseline.title);
  const baseDesc = normalizeDescriptionForCompare(baseline.description);

  const statusChanged = formData.status !== baseline.status;
  const nonStatusFieldsChanged =
    !!canEditFullDetails &&
    (normTitle !== baseTitle ||
      normDesc !== baseDesc ||
      formData.priority !== baseline.priority ||
      (formData.dueDate || '') !== (baseline.dueDate || ''));

  const formAssignee = isUnassignedSelection(formData.assigneeId) ? UNASSIGNED : String(formData.assigneeId);
  const baseAssignee = isUnassignedSelection(baseline.assigneeId) ? UNASSIGNED : String(baseline.assigneeId);
  const assigneeChanged = !!canEditFullDetails && formAssignee !== baseAssignee;

  return { statusChanged, nonStatusFieldsChanged, assigneeChanged };
}

/**
 * Assignee-only: only updateIssueStatus when status changed.
 * Creator/owner: updateIssue when non-status fields changed, then updateIssueStatus, then assignee (add or clear).
 */
export async function persistTaskEdits(dispatch, { issueId, formData, baseline, canEditFullDetails }) {
  const { statusChanged, nonStatusFieldsChanged, assigneeChanged } = computeTaskEditDelta(
    formData,
    baseline,
    canEditFullDetails
  );

  if (!canEditFullDetails) {
    if (!statusChanged) return;
    await dispatch(updateIssueStatus({ issueId, status: formData.status })).unwrap();
    return;
  }

  if (nonStatusFieldsChanged) {
    await dispatch(
      updateIssue({
        issueId,
        issueData: {
          title: normalizeTitleForCompare(formData.title),
          description: formData.description.replace(/\r\n/g, '\n').trim(),
          priority: formData.priority,
          dueDate: formData.dueDate || null,
        },
      })
    ).unwrap();
  }

  if (statusChanged) {
    await dispatch(updateIssueStatus({ issueId, status: formData.status })).unwrap();
  }

  if (assigneeChanged) {
    if (isUnassignedSelection(formData.assigneeId)) {
      await dispatch(clearAssignee(issueId)).unwrap();
    } else {
      await dispatch(addAssignee({ issueId, userId: Number(formData.assigneeId) })).unwrap();
    }
  }
}
