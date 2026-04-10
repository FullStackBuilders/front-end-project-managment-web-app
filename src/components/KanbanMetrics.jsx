import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  parseISO,
  differenceInMinutes,
  startOfWeek, startOfMonth, startOfDay, endOfDay,
  subDays, eachDayOfInterval, format, isWithinInterval,
} from 'date-fns';
import { selectAllIssuesRaw, selectIssueSummary } from '../store/issueSlice';
import { Activity } from 'lucide-react';

// ── Time range constants ─────────────────────────────────────────────────────

const TIME_RANGES = [
  { id: 'THIS_WEEK',   label: 'This Week'   },
  { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
  { id: 'THIS_MONTH',  label: 'This Month'  },
];

function getRangeBounds(rangeId) {
  const now   = new Date();
  const today = endOfDay(now);

  switch (rangeId) {
    case 'THIS_WEEK':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: today };
    case 'LAST_7_DAYS':
      return { start: startOfDay(subDays(now, 6)), end: today };
    case 'THIS_MONTH':
      return { start: startOfMonth(now), end: today };
    default:
      return { start: startOfDay(subDays(now, 6)), end: today };
  }
}

// Convert minutes to days with one decimal place
function minutesToDays(mins) {
  return (mins / (60 * 24)).toFixed(1);
}

const DATE_FMT = 'MMM d';

/** Single source for KPI cards, line series, bars, and legends */
const METRIC_COLORS = {
  cycle: '#dc2626',
  lead: '#ca8a04',
  throughput: '#10b981',
};

// ── Custom tooltip ────────────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
  fontSize: '13px',
};

function CycleLeadTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TOOLTIP_STYLE} className="bg-white p-2.5 shadow-sm">
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-xs" style={{ color: p.color }}>
          {p.name}: {p.value != null ? `${p.value}d` : '—'}
        </p>
      ))}
    </div>
  );
}

function ThroughputTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value ?? 0;
  return (
    <div style={TOOLTIP_STYLE} className="bg-white p-2.5 shadow-sm">
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      <p className="text-xs font-medium" style={{ color: METRIC_COLORS.throughput }}>
        {v} task{v !== 1 ? 's' : ''} completed
      </p>
    </div>
  );
}

// ── Empty chart state ─────────────────────────────────────────────────────────

function ChartEmpty({ message }) {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

function KpiMetricsCard({ title, primary, accentColor, valueColor, className = '' }) {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 p-4 min-w-0 ${className}`}
      style={{ borderLeftColor: accentColor }}
    >
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-semibold tabular-nums" style={{ color: valueColor }}>
        {primary}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function KanbanMetrics() {
  const issues  = useSelector(selectAllIssuesRaw);
  const summary = useSelector(selectIssueSummary);

  const [timeRange, setTimeRange] = useState('LAST_7_DAYS');

  // ── Issues completed within selected time range ───────────────────────────

  const { completedInRange, rangeStart, rangeEnd } = useMemo(() => {
    const { start, end } = getRangeBounds(timeRange);
    const interval = { start, end };
    const completed = issues.filter(
      (i) => i.taskCompletedAt && isWithinInterval(parseISO(i.taskCompletedAt), interval)
    );
    return { completedInRange: completed, rangeStart: start, rangeEnd: end };
  }, [issues, timeRange]);

  // ── Summary metrics ───────────────────────────────────────────────────────

  const avgCycleTime = useMemo(() => {
    const eligible = completedInRange.filter((i) => i.taskStartedAt);
    if (!eligible.length) return null;
    const totalMins = eligible.reduce(
      (sum, i) => sum + differenceInMinutes(parseISO(i.taskCompletedAt), parseISO(i.taskStartedAt)),
      0
    );
    return minutesToDays(totalMins / eligible.length);
  }, [completedInRange]);

  const avgLeadTime = useMemo(() => {
    const eligible = completedInRange.filter((i) => i.taskCreatedAt);
    if (!eligible.length) return null;
    const totalMins = eligible.reduce(
      (sum, i) => sum + differenceInMinutes(parseISO(i.taskCompletedAt), parseISO(i.taskCreatedAt)),
      0
    );
    return minutesToDays(totalMins / eligible.length);
  }, [completedInRange]);

  const throughput = completedInRange.length;

  // ── All days in range (for chart x-axis) ─────────────────────────────────

  const daysInRange = useMemo(
    () => eachDayOfInterval({ start: rangeStart, end: rangeEnd }),
    [rangeStart, rangeEnd]
  );

  // ── Cycle Time + Lead Time trend data ─────────────────────────────────────
  // Days with no completions → null (renders as gap in Recharts Line)

  const cycleLeadChartData = useMemo(() => {
    // Group by completion date
    const byDay = new Map();
    completedInRange.forEach((i) => {
      const key = format(parseISO(i.taskCompletedAt), DATE_FMT);
      if (!byDay.has(key)) byDay.set(key, { cycleSum: 0, cycleCount: 0, leadSum: 0, leadCount: 0 });
      const entry = byDay.get(key);
      if (i.taskStartedAt) {
        entry.cycleSum   += differenceInMinutes(parseISO(i.taskCompletedAt), parseISO(i.taskStartedAt));
        entry.cycleCount += 1;
      }
      if (i.taskCreatedAt) {
        entry.leadSum   += differenceInMinutes(parseISO(i.taskCompletedAt), parseISO(i.taskCreatedAt));
        entry.leadCount += 1;
      }
    });

    return daysInRange.map((day) => {
      const key   = format(day, DATE_FMT);
      const entry = byDay.get(key);
      return {
        date:      key,
        cycleTime: entry && entry.cycleCount > 0 ? Number(minutesToDays(entry.cycleSum / entry.cycleCount)) : null,
        leadTime:  entry && entry.leadCount  > 0 ? Number(minutesToDays(entry.leadSum  / entry.leadCount))  : null,
      };
    });
  }, [completedInRange, daysInRange]);

  // ── Throughput trend data ─────────────────────────────────────────────────
  // All days included; 0 for days with no completions

  const throughputChartData = useMemo(() => {
    const countByDay = new Map();
    daysInRange.forEach((day) => countByDay.set(format(day, DATE_FMT), 0));
    completedInRange.forEach((i) => {
      const key = format(parseISO(i.taskCompletedAt), DATE_FMT);
      if (countByDay.has(key)) countByDay.set(key, countByDay.get(key) + 1);
    });
    return daysInRange.map((day) => {
      const key = format(day, DATE_FMT);
      return { date: key, count: countByDay.get(key) };
    });
  }, [completedInRange, daysInRange]);

  const hasCompletions = completedInRange.length > 0;

  // ── Axis tick helper — show every other label when range is wide ──────────

  const tickFormatter = (value, index) => {
    if (daysInRange.length > 14) return index % 3 === 0 ? value : '';
    if (daysInRange.length > 7)  return index % 2 === 0 ? value : '';
    return value;
  };

  return (
    <div className="space-y-6">

      {/* ── Section header with time range selector ───────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-500" />
          <h2 className="text-base font-semibold text-gray-800">Kanban Metrics</h2>
        </div>

        {/* Time range selector */}
        <div className="flex items-center rounded-md border border-gray-200 overflow-hidden bg-white">
          {TIME_RANGES.map((range) => (
            <button
              key={range.id}
              onClick={() => setTimeRange(range.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors border-r border-gray-200 last:border-r-0
                ${timeRange === range.id
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── WIP + KPI cards: one row when space allows, wrap on narrow viewports ─ */}
      <div className="flex flex-wrap gap-4 items-stretch">
        <div className="min-w-[11rem] flex-1 basis-[12rem]">
          <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-indigo-500 p-4">
            <p className="text-sm text-gray-500 mb-1">Work In Progress</p>
            <p className="text-2xl font-semibold text-indigo-600">{summary.inProgress}</p>
          </div>
        </div>
        <div className="min-w-[11rem] flex-1 basis-[12rem]">
          <KpiMetricsCard
            className="h-full"
            title="Avg Cycle Time"
            primary={avgCycleTime != null ? `${avgCycleTime} days` : '—'}
            accentColor={METRIC_COLORS.cycle}
            valueColor={METRIC_COLORS.cycle}
          />
        </div>
        <div className="min-w-[11rem] flex-1 basis-[12rem]">
          <KpiMetricsCard
            className="h-full"
            title="Avg Lead Time"
            primary={avgLeadTime != null ? `${avgLeadTime} days` : '—'}
            accentColor={METRIC_COLORS.lead}
            valueColor={METRIC_COLORS.lead}
          />
        </div>
        <div className="min-w-[11rem] flex-1 basis-[12rem]">
          <KpiMetricsCard
            className="h-full"
            title="Throughput"
            primary={`${throughput}`}
            accentColor={METRIC_COLORS.throughput}
            valueColor={METRIC_COLORS.throughput}
          />
        </div>
      </div>

      {/* ── Section 2: Cycle Time + Lead Time ───────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-gray-700 shrink-0">
            Cycle Time &amp; Lead Time Trend
          </h3>
          <div
            className="flex flex-wrap items-center gap-x-6 gap-y-2 shrink-0 sm:justify-end"
            role="list"
            aria-label="Line series"
          >
            <div className="flex items-center gap-2" role="listitem">
              <span
                className="inline-block h-0.5 w-7 shrink-0 rounded-full"
                style={{ backgroundColor: METRIC_COLORS.cycle }}
                aria-hidden
              />
              <span className="text-xs text-gray-600">Avg Cycle Time</span>
            </div>
            <div className="flex items-center gap-2" role="listitem">
              <span
                className="inline-block h-0.5 w-7 shrink-0 rounded-full"
                style={{ backgroundColor: METRIC_COLORS.lead }}
                aria-hidden
              />
              <span className="text-xs text-gray-600">Avg Lead Time</span>
            </div>
          </div>
        </div>

        <div className="h-52">
          {!hasCompletions ? (
            <ChartEmpty message="No completed tasks in this period" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cycleLeadChartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={tickFormatter}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}d`}
                  width={32}
                />
                <Tooltip content={<CycleLeadTooltip />} />
                {/* connectNulls={false} is the default — gaps render for null values */}
                <Line
                  type="monotone"
                  dataKey="cycleTime"
                  name="Cycle Time"
                  stroke={METRIC_COLORS.cycle}
                  strokeWidth={2}
                  dot={{ r: 3, fill: METRIC_COLORS.cycle }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="leadTime"
                  name="Lead Time"
                  stroke={METRIC_COLORS.lead}
                  strokeWidth={2}
                  dot={{ r: 3, fill: METRIC_COLORS.lead }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Section 3: Throughput ────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <h3 className="text-sm font-semibold text-gray-700 shrink-0">Throughput Trend</h3>
          <div className="flex items-center gap-2 shrink-0 sm:justify-end">
            <span
              className="inline-block w-3.5 h-3.5 shrink-0 rounded-none"
              style={{ backgroundColor: METRIC_COLORS.throughput }}
              aria-hidden
            />
            <span className="text-xs text-gray-600">Throughput</span>
          </div>
        </div>

        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={throughputChartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }} barCategoryGap="35%">
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={tickFormatter}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip content={<ThroughputTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar
                dataKey="count"
                name="Completed"
                fill={METRIC_COLORS.throughput}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
