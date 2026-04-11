import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  parseISO,
  differenceInMinutes,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  format,
  isValid,
  min,
} from 'date-fns';
import { BarChart2 } from 'lucide-react';
import SprintSelectPopoverField from '@/components/SprintSelectPopoverField';
import { selectAllIssuesRaw } from '../../store/issueSlice';
import { useActiveSprintSelection } from '@/hooks/useActiveSprintSelection';

const DATE_FMT = 'MMM d';

const METRIC_COLORS = {
  cycle: '#dc2626',
  lead: '#ca8a04',
  velocity: '#10b981',
};

const TOOLTIP_STYLE = {
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
  fontSize: '13px',
};

function normalizeSprintId(sprintId) {
  const n = Number(sprintId);
  return Number.isFinite(n) ? n : null;
}

function issueInSprint(issue, sprintId) {
  return normalizeSprintId(issue?.sprintId) === normalizeSprintId(sprintId);
}

function minutesToDays(mins) {
  return (mins / (60 * 24)).toFixed(1);
}

function parseBoundary(value) {
  if (!value) return null;
  try {
    const d = parseISO(String(value));
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

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

function VelocityTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div style={TOOLTIP_STYLE} className="bg-white p-2.5 shadow-sm">
      <p className="text-xs font-medium text-gray-600 mb-1">{row.name}</p>
      <p className="text-xs font-medium" style={{ color: METRIC_COLORS.velocity }}>
        {row.count} task{row.count !== 1 ? 's' : ''} completed
        {row.isActive ? ' (sprint in progress)' : ''}
      </p>
    </div>
  );
}

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

function EmptyMetricsState({ message }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart2 className="w-14 h-14 text-gray-300 mb-4" />
        <h3 className="text-base font-medium text-gray-500 mb-1">{message}</h3>
      </div>
    </div>
  );
}

/** Inclusive calendar-day range for trend chart; caps active sprint at today. */
function sprintChartDayBounds(sprint, completedInSprint) {
  const now = new Date();
  const todayEnd = endOfDay(now);

  let start = sprint?.startDate ? startOfDay(parseISO(String(sprint.startDate))) : null;
  let endDay = sprint?.endDate ? endOfDay(parseISO(String(sprint.endDate))) : todayEnd;

  if (sprint?.status === 'ACTIVE') {
    endDay = min([endDay, todayEnd]);
  }

  if (!start) {
    const times = completedInSprint
      .map((i) => parseBoundary(i.taskCompletedAt))
      .filter(Boolean)
      .map((d) => d.getTime());
    if (times.length) {
      start = startOfDay(new Date(Math.min(...times)));
    } else {
      start = startOfDay(now);
    }
  }

  let lastDay = startOfDay(endDay);
  if (start > lastDay) {
    const tmp = start;
    start = lastDay;
    lastDay = tmp;
  }

  return { start, end: lastDay };
}

export default function ScrumMetricsView({ projectId }) {
  const issues = useSelector(selectAllIssuesRaw);
  const {
    reportSprints,
    selectedSprintId,
    setSelectedSprintId,
    loadingSprints,
    selectedSprint,
    sprintOptions,
    velocitySprints,
  } = useActiveSprintSelection(projectId);

  const issuesInSelectedSprint = useMemo(
    () => issues.filter((i) => issueInSprint(i, selectedSprintId)),
    [issues, selectedSprintId],
  );

  const wipCount = useMemo(
    () => issuesInSelectedSprint.filter((i) => i.status === 'IN_PROGRESS').length,
    [issuesInSelectedSprint],
  );

  const velocityCount = useMemo(
    () => issuesInSelectedSprint.filter((i) => i.status === 'DONE').length,
    [issuesInSelectedSprint],
  );

  const completedInSprint = useMemo(
    () =>
      issuesInSelectedSprint.filter(
        (i) => i.status === 'DONE' && i.taskCompletedAt && parseBoundary(i.taskCompletedAt),
      ),
    [issuesInSelectedSprint],
  );

  const avgCycleTime = useMemo(() => {
    const eligible = completedInSprint.filter((i) => i.taskStartedAt && parseBoundary(i.taskStartedAt));
    if (!eligible.length) return null;
    const totalMins = eligible.reduce(
      (sum, i) =>
        sum + differenceInMinutes(parseISO(i.taskCompletedAt), parseISO(i.taskStartedAt)),
      0,
    );
    return minutesToDays(totalMins / eligible.length);
  }, [completedInSprint]);

  const avgLeadTime = useMemo(() => {
    const eligible = completedInSprint.filter((i) => i.taskCreatedAt && parseBoundary(i.taskCreatedAt));
    if (!eligible.length) return null;
    const totalMins = eligible.reduce(
      (sum, i) =>
        sum + differenceInMinutes(parseISO(i.taskCompletedAt), parseISO(i.taskCreatedAt)),
      0,
    );
    return minutesToDays(totalMins / eligible.length);
  }, [completedInSprint]);

  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => sprintChartDayBounds(selectedSprint, completedInSprint),
    [selectedSprint, completedInSprint],
  );

  const daysInSprint = useMemo(() => {
    try {
      return eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    } catch {
      return [startOfDay(new Date())];
    }
  }, [rangeStart, rangeEnd]);

  const cycleLeadChartData = useMemo(() => {
    const byDay = new Map();
    completedInSprint.forEach((i) => {
      const key = format(parseISO(i.taskCompletedAt), DATE_FMT);
      if (!byDay.has(key)) byDay.set(key, { cycleSum: 0, cycleCount: 0, leadSum: 0, leadCount: 0 });
      const entry = byDay.get(key);
      if (i.taskStartedAt && parseBoundary(i.taskStartedAt)) {
        entry.cycleSum += differenceInMinutes(parseISO(i.taskCompletedAt), parseISO(i.taskStartedAt));
        entry.cycleCount += 1;
      }
      if (i.taskCreatedAt && parseBoundary(i.taskCreatedAt)) {
        entry.leadSum += differenceInMinutes(parseISO(i.taskCompletedAt), parseISO(i.taskCreatedAt));
        entry.leadCount += 1;
      }
    });

    return daysInSprint.map((day) => {
      const key = format(day, DATE_FMT);
      const entry = byDay.get(key);
      return {
        date: key,
        cycleTime:
          entry && entry.cycleCount > 0 ? Number(minutesToDays(entry.cycleSum / entry.cycleCount)) : null,
        leadTime:
          entry && entry.leadCount > 0 ? Number(minutesToDays(entry.leadSum / entry.leadCount)) : null,
      };
    });
  }, [completedInSprint, daysInSprint]);

  const velocityChartData = useMemo(() => {
    return velocitySprints.map((s) => {
      const sid = normalizeSprintId(s.id);
      const count = issues.filter(
        (i) => normalizeSprintId(i.sprintId) === sid && i.status === 'DONE',
      ).length;
      return {
        rowKey: String(s.id),
        name: s.name || `Sprint ${s.id}`,
        count,
        isActive: s.status === 'ACTIVE',
      };
    });
  }, [velocitySprints, issues]);

  const hasCompletions = completedInSprint.length > 0;
  const maxVelocity = velocityChartData.reduce((m, r) => Math.max(m, r.count), 0);

  const tickFormatter = (value, index) => {
    if (daysInSprint.length > 14) return index % 3 === 0 ? value : '';
    if (daysInSprint.length > 7) return index % 2 === 0 ? value : '';
    return value;
  };

  if (!loadingSprints && reportSprints.length === 0) {
    return (
      <EmptyMetricsState message="No sprints available for metrics. Start a sprint to view metrics." />
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-start flex-wrap gap-3">
        <SprintSelectPopoverField
          showLabel={false}
          options={sprintOptions}
          value={selectedSprintId}
          onChange={setSelectedSprintId}
          disabled={loadingSprints || !reportSprints.length}
          placeholder="Select sprint"
          triggerId="scrum-metrics-sprint-trigger"
          rootClassName="min-w-[220px]"
        />
      </div>

      <div className="flex flex-wrap gap-4 items-stretch">
        <div className="min-w-[11rem] flex-1 basis-[12rem]">
          <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-indigo-500 p-4">
            <p className="text-sm text-gray-500 mb-1">Work In Progress</p>
            <p className="text-2xl font-semibold text-indigo-600">{wipCount}</p>
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
            title="Velocity"
            primary={`${velocityCount}`}
            accentColor={METRIC_COLORS.velocity}
            valueColor={METRIC_COLORS.velocity}
          />
        </div>
      </div>

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
            <ChartEmpty message="No completed tasks in this sprint" />
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
                <Line
                  type="monotone"
                  dataKey="cycleTime"
                  name="Avg Cycle Time"
                  stroke={METRIC_COLORS.cycle}
                  strokeWidth={2}
                  dot={{ r: 3, fill: METRIC_COLORS.cycle }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="leadTime"
                  name="Avg Lead Time"
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <h3 className="text-sm font-semibold text-gray-700 shrink-0">Sprint Velocity</h3>
          <div className="flex items-center gap-2 shrink-0 sm:justify-end">
            <span
              className="inline-block w-3.5 h-3.5 shrink-0 rounded-none"
              style={{ backgroundColor: METRIC_COLORS.velocity }}
              aria-hidden
            />
            <span className="text-xs text-gray-600">Completed tasks</span>
          </div>
        </div>

        <div className="h-52">
          {velocityChartData.length === 0 ? (
            <ChartEmpty message="No sprints to display" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={velocityChartData}
                margin={{ top: 4, right: 16, left: 8, bottom: 48 }}
                barCategoryGap="28%"
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-28}
                  textAnchor="end"
                  height={48}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                  domain={[0, Math.max(1, maxVelocity)]}
                />
                <Tooltip content={<VelocityTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="count" fill={METRIC_COLORS.velocity} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
