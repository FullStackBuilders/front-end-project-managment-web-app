import { useState, useMemo, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectCalendarFilteredIssues } from '../store/issueSlice';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isBefore, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, X, Flag } from 'lucide-react';
import IssueDetailModal from './IssueDetailModal';
import IssueFilterButton from './IssueFilterButton';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CHIP_STYLES = {
  HIGH:   'bg-red-100 text-red-700 border border-red-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  LOW:    'bg-green-100 text-green-700 border border-green-200',
};

// Build a 6-row × 7-col grid of Date objects for the given month
function buildMonthGrid(displayDate) {
  const monthStart = startOfMonth(displayDate);
  const monthEnd = endOfMonth(displayDate);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);

  const days = [];
  let current = gridStart;
  while (current <= gridEnd) {
    days.push(current);
    current = addDays(current, 1);
  }
  // Pad to exactly 42 cells (6 rows) for a stable grid height
  while (days.length < 42) {
    days.push(addDays(days[days.length - 1], 1));
  }
  return days;
}

function toDateKey(date) {
  return format(date, 'yyyy-MM-dd');
}

// ── Day-detail popup ──────────────────────────────────────────────────────────
function DayDetailPopup({ label, tasks, onClose, onSelectTask }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Tasks due on {label}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task list */}
        <div className="px-5 py-3 max-h-80 overflow-y-auto divide-y divide-gray-100">
          {tasks.map((task) => (
            <button
              key={task.id}
              className="w-full flex items-center gap-3 py-3 text-left hover:bg-gray-50 rounded transition-colors"
              onClick={() => { onClose(); onSelectTask(task.id); }}
            >
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${CHIP_STYLES[task.priority] || CHIP_STYLES.LOW}`}>
                <Flag className="w-3 h-3 mr-1" />
                {task.priority}
              </span>
              <span className="text-sm text-gray-800 truncate flex-1">{task.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Task chip ─────────────────────────────────────────────────────────────────
function TaskChip({ task, onClick }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(task.id); }}
      className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate leading-5 ${CHIP_STYLES[task.priority] || CHIP_STYLES.LOW} hover:opacity-80 transition-opacity`}
      title={task.title}
    >
      {task.title}
    </button>
  );
}

// ── Main CalendarView ─────────────────────────────────────────────────────────
export default function CalendarView() {
  const issues = useSelector(selectCalendarFilteredIssues);

  const [displayDate, setDisplayDate] = useState(new Date());
  const [dayDetailTasks, setDayDetailTasks] = useState(null);  // array | null
  const [dayDetailLabel, setDayDetailLabel] = useState('');
  const [detailIssueId, setDetailIssueId] = useState(null);

  // Group by YYYY-MM-DD — filtering is handled by selectCalendarFilteredIssues
  const tasksByDate = useMemo(() => {
    const map = {};
    issues.forEach((issue) => {
      if (!issue.dueDate) return;
      const key = issue.dueDate.split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(issue);
    });
    return map;
  }, [issues]);

  const monthGrid = useMemo(() => buildMonthGrid(displayDate), [displayDate]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handlePrevMonth = () => setDisplayDate((d) => subMonths(d, 1));
  const handleNextMonth = () => setDisplayDate((d) => addMonths(d, 1));

  const openDayDetail = (e, dateKey, label) => {
    e.stopPropagation();
    const tasks = tasksByDate[dateKey];
    if (!tasks || tasks.length === 0) return;
    setDayDetailLabel(label);
    setDayDetailTasks(tasks);
  };

  // Check if this month has any tasks with due dates
  const monthHasTasks = monthGrid.some((day) => {
    if (!isSameMonth(day, displayDate)) return false;
    return !!tasksByDate[toDateKey(day)];
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold text-gray-900">
          {format(displayDate, 'MMMM yyyy')}
        </h2>

        <button
          onClick={handleNextMonth}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="mb-4">
        <div className="flex justify-end mb-2">
          <IssueFilterButton view="calendar" />
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="font-medium text-gray-700">Priority:</span>
          {Object.entries(CHIP_STYLES).map(([priority, cls]) => (
            <span key={priority} className={`inline-flex items-center px-2 py-0.5 rounded-full border ${cls}`}>
              <Flag className="w-3 h-3 mr-1" />
              {priority}
            </span>
          ))}
        </div>
      </div>

      {/* Day-of-week header row */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-t border-gray-200">
        {monthGrid.map((day, idx) => {
          const dateKey = toDateKey(day);
          const tasksForDay = tasksByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, displayDate);
          const isPast = isBefore(day, today);
          const isOverdue = isPast && tasksForDay.length > 0;
          const isTodayDate = isToday(day);

          const visible = tasksForDay.slice(0, 2);
          const overflow = tasksForDay.length - visible.length;

          return (
            <div
              key={idx}
              className={`min-h-[96px] border-r border-b border-gray-200 p-1.5 flex flex-col
                ${!isCurrentMonth ? 'bg-gray-50' : isOverdue ? 'bg-red-50' : 'bg-white'}
              `}
            >
              {/* Day number */}
              <button
                className={`self-start w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1
                  ${isTodayDate
                    ? 'bg-primary text-white'
                    : !isCurrentMonth
                    ? 'text-gray-400'
                    : isOverdue
                    ? 'text-red-600 font-semibold cursor-pointer hover:bg-red-100'
                    : 'text-gray-700 cursor-pointer hover:bg-gray-100'
                  }`}
                onClick={(e) => openDayDetail(e, dateKey, format(day, 'MMMM d, yyyy'))}
              >
                {format(day, 'd')}
              </button>

              {/* Task chips */}
              {isCurrentMonth && (
                <div className="flex flex-col gap-0.5 flex-1">
                  {visible.map((task) => (
                    <TaskChip
                      key={task.id}
                      task={task}
                      onClick={(id) => setDetailIssueId(id)}
                    />
                  ))}
                  {overflow > 0 && (
                    <button
                      className="text-xs text-primary hover:underline text-left px-1"
                      onClick={(e) => openDayDetail(e, dateKey, format(day, 'MMMM d, yyyy'))}
                    >
                      +{overflow} more
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state for this month */}
      {!monthHasTasks && (
        <p className="text-center text-gray-400 text-sm mt-6">
          No tasks with due dates in {format(displayDate, 'MMMM yyyy')}.
        </p>
      )}

      {/* Day-detail popup */}
      {dayDetailTasks && (
        <DayDetailPopup
          label={dayDetailLabel}
          tasks={dayDetailTasks}
          onClose={() => setDayDetailTasks(null)}
          onSelectTask={(id) => setDetailIssueId(id)}
        />
      )}

      {/* Issue detail modal */}
      {detailIssueId && (
        <IssueDetailModal
          showModal={!!detailIssueId}
          setShowModal={(open) => { if (!open) setDetailIssueId(null); }}
          issueId={detailIssueId}
        />
      )}
    </div>
  );
}
