import { STATUS_COLORS, PRIORITY_COLORS } from '../../utils/helpers';

export function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const label = priority ? `${priority}`.replace('_', ' ') : 'normal';
  return (
    <span className={`badge capitalize ${PRIORITY_COLORS[priority] || 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
}
