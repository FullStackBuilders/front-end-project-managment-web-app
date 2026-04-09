import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  selectIssueSummary,
  selectStatusDistribution,
  selectPriorityDistribution,
  selectDueDateSummary,
  selectAssigneeDistribution,
} from '../store/issueSlice';
import { BarChart2, SlidersHorizontal } from 'lucide-react';

// ── Core card configuration (always visible) ─────────────────────────────────

const CORE_CARDS = [
  { key: 'total',      label: 'Total',       border: 'border-l-gray-400',  text: 'text-gray-700'  },
  { key: 'completed',  label: 'Completed',   border: 'border-l-green-500', text: 'text-green-600' },
  { key: 'inProgress', label: 'In Progress', border: 'border-l-blue-500',  text: 'text-blue-600'  },
  { key: 'overdue',    label: 'Overdue',     border: 'border-l-red-500',   text: 'text-red-600'   },
];

// ── Optional card configuration (user-configurable) ───────────────────────────

const OPTIONAL_CARDS = [
  { id: 'dueToday',     label: 'Due Today',      border: 'border-l-amber-500',  text: 'text-amber-600'  },
  { id: 'dueThisWeek',  label: 'Due This Week',  border: 'border-l-orange-500', text: 'text-orange-600' },
  { id: 'dueThisMonth', label: 'Due This Month', border: 'border-l-violet-500', text: 'text-violet-600' },
];

const STORAGE_KEY = 'summary:visibleOptionals';
const LEGACY_STORAGE_KEY = 'analytics:visibleOptionals';

const DEFAULT_VISIBILITY = { dueToday: true, dueThisWeek: true, dueThisMonth: true };

function readStoredVisibility() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_VISIBILITY, ...JSON.parse(stored) };
    }
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const merged = { ...DEFAULT_VISIBILITY, ...JSON.parse(legacy) };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        /* ignore */
      }
      return merged;
    }
    return DEFAULT_VISIBILITY;
  } catch {
    return DEFAULT_VISIBILITY;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, border, text }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${border} p-4`}>
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${text}`}>{value}</p>
    </div>
  );
}

function DonutLegend({ payload, total }) {
  return (
    <ul className="flex flex-col gap-2 mt-2">
      {payload.map((entry) => {
        const pct = total > 0 ? Math.round((entry.payload.value / total) * 100) : 0;
        return (
          <li key={entry.value} className="flex items-center justify-between text-sm gap-4">
            <span className="flex items-center gap-2 text-gray-600">
              <span
                className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              {entry.value}
            </span>
            <span className="text-gray-700 font-medium tabular-nums">
              {entry.payload.value}
              <span className="text-gray-400 font-normal ml-1">({pct}%)</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function BarLabel({ x, y, width, value }) {
  if (!value) return null;
  return (
    <text x={x + width + 6} y={y + 12} fill="#6b7280" fontSize={13} textAnchor="start">
      {value}
    </text>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <BarChart2 className="w-14 h-14 text-gray-300 mb-4" />
      <h3 className="text-base font-medium text-gray-500 mb-1">No tasks yet</h3>
      <p className="text-sm text-gray-400">
        Create tasks in the Board or List view and your summary will appear here.
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProjectSummary() {
  const summary      = useSelector(selectIssueSummary);
  const statusData   = useSelector(selectStatusDistribution);
  const priorityData = useSelector(selectPriorityDistribution);
  const dueDates     = useSelector(selectDueDateSummary);
  const assigneeDistribution = useSelector(selectAssigneeDistribution);

  const statusTotal   = statusData.reduce((sum, d) => sum + d.value, 0);
  const priorityTotal = priorityData.reduce((sum, d) => sum + d.value, 0);

  // Config panel state
  const [configOpen, setConfigOpen]           = useState(false);
  const [visibleOptionals, setVisibleOptionals] = useState(readStoredVisibility);
  const configRef                               = useRef(null);

  // Persist visibility to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleOptionals));
    } catch { /* storage unavailable — fail silently */ }
  }, [visibleOptionals]);

  // Close panel on outside click or Escape
  const handleOutsideClick = useCallback((e) => {
    if (configRef.current && !configRef.current.contains(e.target)) {
      setConfigOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!configOpen) return;
    document.addEventListener('mousedown', handleOutsideClick);
    const handleEscape = (e) => { if (e.key === 'Escape') setConfigOpen(false); };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [configOpen, handleOutsideClick]);

  const toggleOptional = (id) => {
    setVisibleOptionals((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const visibleOptionalCards = OPTIONAL_CARDS.filter((c) => visibleOptionals[c.id]);

  return (
    <div className="space-y-6 pb-8">

      {/* ── Section header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        {/* Left: title + customize */}
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-800">Task Summary</h2>

          <div className="relative" ref={configRef}>
            <button
              type="button"
              onClick={() => setConfigOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-md text-gray-600 bg-white hover:bg-gray-50 transition-colors"
              aria-expanded={configOpen}
              aria-haspopup="true"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Customize
            </button>

            {configOpen && (
              <div className="absolute left-0 top-full mt-1 z-40 w-56 rounded-lg border border-gray-200 bg-white shadow-lg p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Display
                </p>
                {OPTIONAL_CARDS.map((card) => (
                  <label
                    key={card.id}
                    className="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={visibleOptionals[card.id]}
                      onChange={() => toggleOptional(card.id)}
                      className="rounded text-primary"
                    />
                    {card.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: completion rate badge */}
        {summary.total > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 text-xs font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            {summary.completionRate}% complete
          </span>
        )}
      </div>

      {/* ── Cards grid (core + optional) ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Core cards — always visible */}
        {CORE_CARDS.map(({ key, label, border, text }) => (
          <StatCard key={key} label={label} value={summary[key]} border={border} text={text} />
        ))}

        {/* Optional cards — shown based on config */}
        {visibleOptionalCards.map(({ id, label, border, text }) => (
          <StatCard key={id} label={label} value={dueDates[id]} border={border} text={text} />
        ))}
      </div>

      {/* ── Charts or empty state ─────────────────────────────────────────── */}
      {summary.total === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <EmptyState />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: Status, then assignee distribution */}
          <div className="space-y-6 min-w-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Task Status Distribution</h3>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-full sm:w-48 h-48 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius="55%"
                        outerRadius="80%"
                        paddingAngle={statusData.filter((d) => d.value > 0).length > 1 ? 3 : 0}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {statusData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [
                          `${value} (${statusTotal > 0 ? Math.round((value / statusTotal) * 100) : 0}%)`,
                        ]}
                        contentStyle={{
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb',
                          fontSize: '13px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 w-full">
                  <DonutLegend
                    payload={statusData.map((d) => ({ value: d.name, color: d.color, payload: d }))}
                    total={statusTotal}
                  />
                </div>
              </div>
            </div>

            <section
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              aria-labelledby="summary-assignee-distribution-heading"
            >
              <h3
                id="summary-assignee-distribution-heading"
                className="text-sm font-semibold text-gray-700 mb-4"
              >
                Task Distribution By Assignee
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                Share of all project tasks by current assignee (includes Unassigned when applicable).
              </p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={assigneeDistribution.data}
                    layout="vertical"
                    margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
                    barCategoryGap="18%"
                  >
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, assigneeDistribution.total || 1]}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 12, fill: '#374151' }}
                      axisLine={false}
                      tickLine={false}
                      width={120}
                    />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      formatter={(value, _name, props) => {
                        const pct =
                          props?.payload?.pct ??
                          (assigneeDistribution.total > 0
                            ? Math.round((Number(value) / assigneeDistribution.total) * 100)
                            : 0);
                        return [
                          `${value} task${value !== 1 ? 's' : ''} (${pct}% of all tasks)`,
                          props.payload.name,
                        ];
                      }}
                      contentStyle={{
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        fontSize: '13px',
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} label={<BarLabel />}>
                      {assigneeDistribution.data.map((entry) => (
                        <Cell key={entry.rowKey} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Priority bar chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-w-0">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Task Priority Distribution</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={priorityData}
                  layout="vertical"
                  margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, priorityTotal || 1]}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 13, fill: '#374151' }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(value, _name, props) => [
                      `${value} task${value !== 1 ? 's' : ''} (${priorityTotal > 0 ? Math.round((value / priorityTotal) * 100) : 0}%)`,
                      props.payload.name,
                    ]}
                    contentStyle={{
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      fontSize: '13px',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} label={<BarLabel />}>
                    {priorityData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-5 mt-3 flex-wrap">
              {priorityData.map((entry) => (
                <span key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name}
                  <span className="font-medium text-gray-700">{entry.value}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
