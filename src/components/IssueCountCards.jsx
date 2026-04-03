const CARDS = [
  { key: 'assignedTasks', label: 'Assigned', border: 'border-l-blue-500', text: 'text-blue-600' },
  { key: 'overdueTasks', label: 'Overdue', border: 'border-l-red-500', text: 'text-red-600' },
  { key: 'dueTodayTasks', label: 'Due Today', border: 'border-l-yellow-500', text: 'text-yellow-600' },
  { key: 'highPriorityTasks', label: 'High Priority', border: 'border-l-red-500', text: 'text-red-600' },
  { key: 'completedTasks', label: 'Completed', border: 'border-l-green-500', text: 'text-green-600' },
];

export default function IssueCountCards({ counts, loading }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {CARDS.map(({ key, label, border, text }) => (
        <div
          key={key}
          className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${border} p-4`}
        >
          <p className="text-sm text-gray-500 mb-1">{label}</p>

          {loading ? (
            <div className="h-7 w-12 bg-gray-100 animate-pulse rounded mt-1" />
          ) : (
            <p className={`text-2xl font-semibold ${text}`}>
              {counts?.[key] ?? 0}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}