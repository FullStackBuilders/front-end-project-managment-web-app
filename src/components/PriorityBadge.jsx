import { Flag } from 'lucide-react';
import { PRIORITY_BADGE_CLASSES } from '../constants/priorityStyles';

const LABELS = { HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' };

export default function PriorityBadge({ priority, className = '' }) {
  const p = priority || 'MEDIUM';
  const classes = PRIORITY_BADGE_CLASSES[p] || PRIORITY_BADGE_CLASSES.MEDIUM;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${classes} ${className}`}
    >
      <Flag className="w-3 h-3 mr-1 shrink-0" />
      {LABELS[p] || p}
    </span>
  );
}
