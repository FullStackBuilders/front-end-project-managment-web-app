import { STATUS_BADGE_CLASSES, STATUS_LABELS } from '../constants/statusStyles';

export default function StatusBadge({ status, className = '' }) {
  const s = status || 'TO_DO';
  const classes = STATUS_BADGE_CLASSES[s] || STATUS_BADGE_CLASSES.TO_DO;
  const label = STATUS_LABELS[s] || s;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${classes} ${className}`}
    >
      {label}
    </span>
  );
}
