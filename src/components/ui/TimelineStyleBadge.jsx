/** Matches Issue timeline History/Comment category pill (IssueTimelineRow). */
export const TIMELINE_STYLE_BADGE_CLASS =
  'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border bg-gray-200 text-black border-gray-300';

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className] — appended to base classes
 */
export function TimelineStyleBadge({ children, className = '' }) {
  return (
    <span className={`${TIMELINE_STYLE_BADGE_CLASS} ${className}`.trim()}>
      {children}
    </span>
  );
}

/**
 * Sprint lifecycle pill: same visual as timeline category pill.
 * @param {object} props
 * @param {string} [props.sprintStatus] — e.g. ACTIVE, COMPLETED from API
 */
export function SprintLifecycleBadge({ sprintStatus }) {
  if (sprintStatus === 'ACTIVE' || sprintStatus === 'COMPLETED') {
    return (
      <TimelineStyleBadge>
        {sprintStatus === 'COMPLETED' ? 'Completed' : 'ACTIVE'}
      </TimelineStyleBadge>
    );
  }
  return null;
}
