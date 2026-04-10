import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import { BarChart2, SlidersHorizontal } from 'lucide-react';
import SprintSelectPopoverField from '@/components/SprintSelectPopoverField';
import { sprintApi } from '../../services/sprintApi';
import {
  makeSelectSprintIssueSummary,
  makeSelectSprintStatusDistribution,
  makeSelectSprintPriorityDistribution,
  makeSelectSprintDueDateSummary,
  makeSelectSprintAssigneeDistribution,
  makeSelectSprintCompletionTrendLast14Days,
} from '../../store/issueSlice';

const CORE_CARDS = [
  { key: 'total', label: 'Total', border: 'border-l-gray-400', text: 'text-gray-700' },
  { key: 'completed', label: 'Completed', border: 'border-l-green-500', text: 'text-green-600' },
  { key: 'inProgress', label: 'In Progress', border: 'border-l-blue-500', text: 'text-blue-600' },
  { key: 'overdue', label: 'Overdue', border: 'border-l-red-500', text: 'text-red-600' },
];

const OPTIONAL_CARDS = [
  { id: 'dueToday', label: 'Due Today', border: 'border-l-amber-500', text: 'text-amber-600' },
  { id: 'dueThisWeek', label: 'Due This Week', border: 'border-l-orange-500', text: 'text-orange-600' },
  { id: 'dueThisMonth', label: 'Due This Month', border: 'border-l-violet-500', text: 'text-violet-600' },
];

const STORAGE_KEY = 'scrum-summary:visibleOptionals';
const DEFAULT_VISIBILITY = { dueToday: true, dueThisWeek: true, dueThisMonth: true };

function readStoredVisibility() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULT_VISIBILITY, ...JSON.parse(stored) } : DEFAULT_VISIBILITY;
  } catch {
    return DEFAULT_VISIBILITY;
  }
}

function compareNullableDesc(left, right) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  if (left > right) return -1;
  if (left < right) return 1;
  return 0;
}

function compareActiveSprintPreference(a, b) {
  const byStart = compareNullableDesc(a?.startDate, b?.startDate);
  if (byStart !== 0) return byStart;
  const byCreatedAt = compareNullableDesc(a?.createdAt, b?.createdAt);
  if (byCreatedAt !== 0) return byCreatedAt;
  return compareNullableDesc(Number(a?.id) || 0, Number(b?.id) || 0);
}

function completionTrendTickFormatter(value, index) {
  return index % 2 === 0 ? value : '';
}

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
              <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
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
  return <text x={x + width + 6} y={y + 12} fill="#6b7280" fontSize={13} textAnchor="start">{value}</text>;
}

function EmptySummaryState({ message }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart2 className="w-14 h-14 text-gray-300 mb-4" />
        <h3 className="text-base font-medium text-gray-500 mb-1">{message}</h3>
      </div>
    </div>
  );
}

export default function ScrumSummaryView({ projectId }) {
  const selectIssueSummary = useMemo(makeSelectSprintIssueSummary, []);
  const selectStatusDistribution = useMemo(makeSelectSprintStatusDistribution, []);
  const selectPriorityDistribution = useMemo(makeSelectSprintPriorityDistribution, []);
  const selectDueDateSummary = useMemo(makeSelectSprintDueDateSummary, []);
  const selectAssigneeDistribution = useMemo(makeSelectSprintAssigneeDistribution, []);
  const selectCompletionTrend = useMemo(makeSelectSprintCompletionTrendLast14Days, []);

  const [activeSprints, setActiveSprints] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [loadingSprints, setLoadingSprints] = useState(true);

  const [configOpen, setConfigOpen] = useState(false);
  const [visibleOptionals, setVisibleOptionals] = useState(readStoredVisibility);
  const configRef = useRef(null);

  const summary = useSelector((state) => selectIssueSummary(state, selectedSprintId));
  const statusData = useSelector((state) => selectStatusDistribution(state, selectedSprintId));
  const priorityData = useSelector((state) => selectPriorityDistribution(state, selectedSprintId));
  const dueDates = useSelector((state) => selectDueDateSummary(state, selectedSprintId));
  const assigneeDistribution = useSelector((state) => selectAssigneeDistribution(state, selectedSprintId));
  const completionTrend = useSelector((state) => selectCompletionTrend(state, selectedSprintId));

  const statusTotal = statusData.reduce((sum, d) => sum + d.value, 0);
  const priorityTotal = priorityData.reduce((sum, d) => sum + d.value, 0);
  const visibleOptionalCards = OPTIONAL_CARDS.filter((c) => visibleOptionals[c.id]);

  const selectedSprint = useMemo(
    () => activeSprints.find((s) => String(s.id) === String(selectedSprintId)) ?? null,
    [activeSprints, selectedSprintId],
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingSprints(true);
      try {
        const list = await sprintApi.listByProject(projectId);
        if (!mounted) return;
        const active = (Array.isArray(list) ? list : []).filter((s) => s.status === 'ACTIVE');
        setActiveSprints(active);
      } finally {
        if (mounted) setLoadingSprints(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleOptionals));
    } catch {
      // no-op
    }
  }, [visibleOptionals]);

  useEffect(() => {
    const activeIds = new Set(activeSprints.map((s) => String(s.id)));
    if (selectedSprintId != null && activeIds.has(String(selectedSprintId))) return;
    if (!activeSprints.length) {
      setSelectedSprintId(null);
      return;
    }
    const fallbackDefault = [...activeSprints].sort(compareActiveSprintPreference)[0];
    setSelectedSprintId(fallbackDefault?.id ?? null);
  }, [activeSprints, selectedSprintId]);

  const handleOutsideClick = useCallback((e) => {
    if (configRef.current && !configRef.current.contains(e.target)) setConfigOpen(false);
  }, []);

  useEffect(() => {
    if (!configOpen) return undefined;
    document.addEventListener('mousedown', handleOutsideClick);
    const handleEscape = (e) => { if (e.key === 'Escape') setConfigOpen(false); };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [configOpen, handleOutsideClick]);

  if (!loadingSprints && activeSprints.length === 0) {
    return <EmptySummaryState message="No active sprints available. Start a sprint to view summary." />;
  }

  const sprintOptions = activeSprints.map((s) => ({ id: s.id, name: s.name, status: s.status }));

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
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
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Display</p>
                {OPTIONAL_CARDS.map((card) => (
                  <label key={card.id} className="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={visibleOptionals[card.id]}
                      onChange={() => setVisibleOptionals((prev) => ({ ...prev, [card.id]: !prev[card.id] }))}
                      className="rounded text-primary"
                    />
                    {card.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <SprintSelectPopoverField
            showLabel={false}
            options={sprintOptions}
            value={selectedSprintId}
            onChange={setSelectedSprintId}
            disabled={loadingSprints || !activeSprints.length}
            placeholder="Select active sprint"
            triggerId="scrum-summary-sprint-trigger"
            rootClassName="min-w-[220px]"
          />
        </div>
        {summary.total > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full px-3 py-1 text-xs font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            {summary.completionRate}% complete
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500">
        {selectedSprint ? `Sprint: ${selectedSprint.name}` : 'Sprint: —'}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {CORE_CARDS.map(({ key, label, border, text }) => (
          <StatCard key={key} label={label} value={summary[key]} border={border} text={text} />
        ))}
        {visibleOptionalCards.map(({ id, label, border, text }) => (
          <StatCard key={id} label={label} value={dueDates[id]} border={border} text={text} />
        ))}
      </div>

      {summary.total === 0 ? (
        <EmptySummaryState message="No tasks found in the selected active sprint." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-w-0 h-[306px] flex flex-col">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Task Status Distribution</h3>
            <div className="flex flex-col sm:flex-row items-center gap-6 flex-1 min-h-0">
              <div className="w-full sm:w-48 h-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" dataKey="value" strokeWidth={0}>
                      {statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 w-full overflow-auto min-h-0">
                <DonutLegend payload={statusData.map((d) => ({ value: d.name, color: d.color, payload: d }))} total={statusTotal} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-w-0 h-[306px] flex flex-col">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Task Priority Distribution</h3>
            <div className="h-48 flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }} barCategoryGap="30%">
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[0, priorityTotal || 1]} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fill: '#374151' }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} label={<BarLabel />}>
                    {priorityData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-w-0 h-[306px] flex flex-col">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 shrink-0">Task Distribution By Assignee</h3>
            <div className="h-48 flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assigneeDistribution.data} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 4 }} barCategoryGap="18%">
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[0, assigneeDistribution.total || 1]} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#374151' }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} label={<BarLabel />}>
                    {assigneeDistribution.data.map((entry) => <Cell key={entry.rowKey} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-w-0 h-[306px] flex flex-col">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Task Completion Trend</h3>
            <div className="h-48 flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={completionTrend} margin={{ top: 6, right: 16, left: 0, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={completionTrendTickFormatter} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip cursor={{ stroke: '#e5e7eb' }} />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 2, fill: '#10b981' }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
