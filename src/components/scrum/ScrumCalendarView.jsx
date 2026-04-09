import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isBefore,
  isToday,
  parseISO,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, SlidersHorizontal, X, Flag } from "lucide-react";
import { sprintApi } from "@/services/sprintApi";
import { setFilters } from "@/store/issueSlice";
import {
  applyFilters,
  countActiveFilters,
  EMPTY_STATE_FILTER_ACTIVE_MESSAGE,
  getScrumSprintIdsFilter,
} from "@/utils/issueFilters";
import { issueSprintId } from "@/utils/scrumBacklogUtils";
import AuthService from "@/services/AuthService";
import { SprintLifecycleBadge } from "@/components/ui/TimelineStyleBadge";
import IssueFilterButton from "@/components/IssueFilterButton";
import IssueDetailModal from "@/components/IssueDetailModal";
import {
  assignLanesCapped,
  buildVisibleSprintIdsByDayKey,
  hiddenSprintsForDay,
  MAX_SPRINT_STRIP_LANES,
  shouldShowSprintNameOnSegment,
  sortActiveSprintsForCalendar,
  sprintStripRadiusClass,
  sprintsTouchingDay,
  subSegmentsVisibleInWeek,
} from "./scrumCalendarLayout.js";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TASK_CHIP_STYLES = {
  HIGH: "bg-red-100 text-red-700 border border-red-200",
  MEDIUM: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  LOW: "bg-green-100 text-green-700 border border-green-200",
};

const SPRINT_STRIP_STYLES = {
  ACTIVE: "bg-green-100 text-green-800 border border-green-200 hover:opacity-90",
  COMPLETED: "bg-gray-200 text-gray-800 border border-gray-300 hover:opacity-90",
  INACTIVE: "bg-gray-100 text-gray-700 border border-gray-200 hover:opacity-90",
};

/** Chip height inside the strip grid (px). */
const STRIP_HEIGHT_PX = 24;
const STRIP_ROW_GAP_PX = 4;
const STRIP_BAND_PAD_V_PX = 6;
/** Matches `pt-2` + `pb-1` + `h-7` on the date row (strip overlay starts below). */
const DAY_DATE_BAND_PX = 40;
/** Minimum height for the “+N more” footer inside each day cell. */
const MORE_ROW_MIN_HEIGHT_PX = 44;

function computeStripBandHeightPx(placedSegments) {
  const maxLane =
    placedSegments.length === 0
      ? -1
      : Math.max(...placedSegments.map((s) => s.lane));
  const laneCount = maxLane + 1;
  if (laneCount <= 0) {
    return Math.max(STRIP_BAND_PAD_V_PX, STRIP_HEIGHT_PX / 2);
  }
  return (
    laneCount * STRIP_HEIGHT_PX +
    (laneCount - 1) * STRIP_ROW_GAP_PX +
    STRIP_BAND_PAD_V_PX
  );
}

/**
 * Week-level overlay: multi-day strips aligned to the 7 day columns (single-block
 * cell layout below reserves the same vertical band per week row).
 */
function SprintWeekStripOverlay({
  weekRowIndex,
  placedSegments,
  onSprintSelect,
  topPx,
  heightPx,
}) {
  const maxLane =
    placedSegments.length === 0
      ? -1
      : Math.max(...placedSegments.map((s) => s.lane));
  const laneCount = maxLane + 1;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-10 min-w-0"
      style={{ top: topPx, height: heightPx }}
    >
      {laneCount > 0 ? (
        <div
          className="relative z-[1] grid h-full min-w-0 grid-cols-7"
          style={{
            gridTemplateRows: `repeat(${laneCount}, ${STRIP_HEIGHT_PX}px)`,
            rowGap: STRIP_ROW_GAP_PX,
            paddingTop: STRIP_BAND_PAD_V_PX / 2,
            paddingBottom: STRIP_BAND_PAD_V_PX / 2,
          }}
        >
          {placedSegments.map(
            ({ sprint, colStart, colSpan, lane, segStart, segEnd }) => {
              const showName = shouldShowSprintNameOnSegment(sprint, segStart);
              const radiusClass = sprintStripRadiusClass(
                segStart,
                segEnd,
                sprint,
              );
              return (
                <button
                  key={`${sprint.id}-${weekRowIndex}-${lane}-${colStart}-${colSpan}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSprintSelect(sprint);
                  }}
                  style={{
                    gridColumn: `${colStart + 1} / span ${colSpan}`,
                    gridRow: lane + 1,
                  }}
                  className={`min-h-0 min-w-0 self-center overflow-hidden text-left text-xs leading-snug ${radiusClass} ${SPRINT_STRIP_STYLES[sprint.status] || SPRINT_STRIP_STYLES.COMPLETED} pointer-events-auto`}
                  title={sprint.name}
                >
                  <span className="block truncate px-1.5 py-0.5">
                    {showName ? sprint.name : "\u00a0"}
                  </span>
                </button>
              );
            },
          )}
        </div>
      ) : null}
    </div>
  );
}

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
  while (days.length < 42) {
    days.push(addDays(days[days.length - 1], 1));
  }
  return days;
}

function toDateKey(date) {
  return format(date, "yyyy-MM-dd");
}

// ── Popups ───────────────────────────────────────────────────────────────────

function SprintDetailModal({ sprint, onClose }) {
  const panelRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!sprint) return null;

  const fmt = (iso) => {
    if (!iso) return "—";
    try {
      return format(parseISO(String(iso).split("T")[0]), "MMM d, yyyy");
    } catch {
      return String(iso).split("T")[0];
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-xl"
        role="dialog"
        aria-label="Sprint details"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-base font-semibold text-gray-900">Sprint</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-0.5"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {(sprint.status === "ACTIVE" || sprint.status === "COMPLETED") && (
            <SprintLifecycleBadge sprintStatus={sprint.status} />
          )}
          {sprint.status === "INACTIVE" && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border bg-gray-100 text-gray-700 border-gray-200">
              Inactive
            </span>
          )}
        </div>
        <p
          className="text-sm font-medium text-gray-900 mb-4 truncate"
          title={sprint.name}
        >
          {sprint.name}
        </p>
        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
          <div>
            <span className="block font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
              Start date
            </span>
            <span className="text-gray-900">{fmt(sprint.startDate)}</span>
          </div>
          <div>
            <span className="block font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
              End date
            </span>
            <span className="text-gray-900">{fmt(sprint.endDate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DaySprintsModal({ day, sprints, onClose, onPickSprint }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const label = day ? format(day, "MMMM d, yyyy") : "";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">{label}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-3 max-h-80 overflow-y-auto space-y-2">
          {sprints.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate leading-5 ${SPRINT_STRIP_STYLES[s.status] || SPRINT_STRIP_STYLES.COMPLETED} hover:opacity-90`}
              onClick={() => {
                onClose();
                onPickSprint(s);
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskChip({ task, onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(task.id);
      }}
      className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate leading-5 ${TASK_CHIP_STYLES[task.priority] || TASK_CHIP_STYLES.LOW} hover:opacity-80 transition-opacity`}
      title={task.title}
    >
      {task.title}
    </button>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ScrumCalendarView({ projectId }) {
  const dispatch = useDispatch();
  const allIssues = useSelector((state) => state.issues.issues);
  const { loading: issuesLoading } = useSelector((state) => state.issues);
  const scrumFilters = useSelector(
    (state) => state.issues.filtersByView.scrumCalendar,
  );

  const [displayDate, setDisplayDate] = useState(() => new Date());
  const [sprints, setSprints] = useState([]);
  const [sprintsLoading, setSprintsLoading] = useState(true);
  const [sprintsError, setSprintsError] = useState(null);

  const [displayMode, setDisplayMode] = useState(() => {
    try {
      return localStorage.getItem(`scrum_cal_display_${projectId}`) || "sprints";
    } catch {
      return "sprints";
    }
  });
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const customizeRef = useRef(null);

  const [sprintDetail, setSprintDetail] = useState(null);

  const [daySprintsModal, setDaySprintsModal] = useState(null);

  const [detailIssueId, setDetailIssueId] = useState(null);

  const [dayDetailTasks, setDayDetailTasks] = useState(null);
  const [dayDetailLabel, setDayDetailLabel] = useState("");

  const loadSprints = useCallback(async () => {
    setSprintsLoading(true);
    setSprintsError(null);
    try {
      const list = await sprintApi.listByProject(projectId);
      setSprints(Array.isArray(list) ? list : []);
    } catch (e) {
      setSprintsError(e?.message || "Failed to load sprints");
      setSprints([]);
    } finally {
      setSprintsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSprints();
  }, [loadSprints]);

  useEffect(() => {
    try {
      localStorage.setItem(`scrum_cal_display_${projectId}`, displayMode);
    } catch {
      /* ignore */
    }
  }, [displayMode, projectId]);

  useEffect(() => {
    if (!customizeOpen) return;
    const onDown = (e) => {
      if (customizeRef.current?.contains(e.target)) return;
      setCustomizeOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [customizeOpen]);

  const monthGrid = useMemo(() => buildMonthGrid(displayDate), [displayDate]);

  const calendarSprints = useMemo(
    () => sortActiveSprintsForCalendar(sprints),
    [sprints],
  );

  const visibleSprintIdsByDayKey = useMemo(
    () => buildVisibleSprintIdsByDayKey(monthGrid, calendarSprints),
    [monthGrid, calendarSprints],
  );

  /** Same ACTIVE sprint scope as ScrumBoardView (API order preserved). */
  const activeSprintsInApiOrder = useMemo(
    () => (sprints || []).filter((s) => s.status === "ACTIVE"),
    [sprints],
  );

  const activeIds = useMemo(
    () => new Set(activeSprintsInApiOrder.map((s) => Number(s.id))),
    [activeSprintsInApiOrder],
  );

  const sprintFilterOptions = useMemo(
    () =>
      activeSprintsInApiOrder.map((s) => ({
        id: Number(s.id),
        name: s.name,
        status: s.status,
      })),
    [activeSprintsInApiOrder],
  );

  useEffect(() => {
    if (sprintsLoading || activeSprintsInApiOrder.length === 0) return;

    const ids = getScrumSprintIdsFilter(scrumFilters);
    const pruned = ids.filter((id) => activeIds.has(Number(id)));
    if (pruned.length !== ids.length) {
      const { sprintId: _legacy, ...rest } = scrumFilters;
      dispatch(
        setFilters({
          view: "scrumCalendar",
          filters: { ...rest, sprintIds: pruned },
        }),
      );
    }
  }, [
    sprintsLoading,
    activeSprintsInApiOrder.length,
    activeIds,
    scrumFilters,
    dispatch,
  ]);

  const selectedSprintIds = getScrumSprintIdsFilter(scrumFilters);

  const boardReady =
    !sprintsLoading &&
    activeSprintsInApiOrder.length > 0 &&
    (selectedSprintIds.length === 0 ||
      selectedSprintIds.every((id) => activeIds.has(Number(id))));

  const activeSprintIssues = useMemo(() => {
    return allIssues.filter((issue) => {
      const sid = issueSprintId(issue);
      return sid != null && activeIds.has(sid);
    });
  }, [allIssues, activeIds]);

  const scrumCalendarTaskIssues = useMemo(() => {
    if (!boardReady) return [];
    return applyFilters(
      activeSprintIssues,
      scrumFilters,
      AuthService.getCurrentUserId(),
    );
  }, [activeSprintIssues, scrumFilters, boardReady]);

  const tasksByDate = useMemo(() => {
    const map = {};
    scrumCalendarTaskIssues.forEach((issue) => {
      if (!issue.dueDate) return;
      const key = issue.dueDate.split("T")[0];
      if (!map[key]) map[key] = [];
      map[key].push(issue);
    });
    return map;
  }, [scrumCalendarTaskIssues]);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const openDayTaskDetail = (e, dateKey, label) => {
    e.stopPropagation();
    const tasks = tasksByDate[dateKey];
    if (!tasks || tasks.length === 0) return;
    setDayDetailLabel(label);
    setDayDetailTasks(tasks);
  };

  const monthHasSprints = useMemo(() => {
    return monthGrid.some((day) => {
      if (!isSameMonth(day, displayDate)) return false;
      return sprintsTouchingDay(calendarSprints, day).length > 0;
    });
  }, [monthGrid, displayDate, calendarSprints]);

  const monthHasTasks = useMemo(() => {
    return monthGrid.some((day) => {
      if (!isSameMonth(day, displayDate)) return false;
      return !!tasksByDate[toDateKey(day)];
    });
  }, [monthGrid, displayDate, tasksByDate]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setDisplayDate((d) => subMonths(d, 1))}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">
          {format(displayDate, "MMMM yyyy")}
        </h2>
        <button
          type="button"
          onClick={() => setDisplayDate((d) => addMonths(d, 1))}
          className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2 relative" ref={customizeRef}>
          <button
            type="button"
            onClick={() => setCustomizeOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-md text-gray-600 bg-white hover:bg-gray-50 transition-colors"
            aria-expanded={customizeOpen}
            aria-haspopup="true"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Customize
          </button>
          {displayMode === "tasks" && boardReady && (
            <IssueFilterButton
              view="scrumCalendar"
              align="start"
              sprintFilterOptions={sprintFilterOptions}
            />
          )}
          {customizeOpen && (
            <div className="absolute left-0 top-full mt-1 z-40 w-56 rounded-lg border border-gray-200 bg-white shadow-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Display
              </p>
              <label className="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-800">
                <input
                  type="radio"
                  name="scrum-cal-display"
                  checked={displayMode === "sprints"}
                  onChange={() => setDisplayMode("sprints")}
                  className="text-primary"
                />
                Sprints
              </label>
              <label className="flex items-center gap-2 py-1.5 cursor-pointer text-sm text-gray-800">
                <input
                  type="radio"
                  name="scrum-cal-display"
                  checked={displayMode === "tasks"}
                  onChange={() => setDisplayMode("tasks")}
                  className="text-primary"
                />
                Tasks
              </label>
            </div>
          )}
        </div>
      </div>

      {displayMode === "tasks" && (sprintsLoading || issuesLoading) && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center text-gray-600 text-sm">Loading…</div>
        </div>
      )}

      {displayMode === "tasks" &&
        !sprintsLoading &&
        !issuesLoading &&
        sprintsError && (
          <p className="text-center text-red-600 text-sm py-6">{sprintsError}</p>
        )}

      {displayMode === "tasks" &&
        !sprintsLoading &&
        !issuesLoading &&
        !sprintsError &&
        activeSprintsInApiOrder.length === 0 && (
          <div className="rounded-md border border-gray-200 bg-white py-10 px-4 text-center">
            <p className="font-medium text-gray-800">No active sprint</p>
            <p className="text-sm text-gray-600 mt-2">
              Start one from the Backlog tab to see tasks on the calendar.
            </p>
          </div>
        )}

      {displayMode === "tasks" &&
        !sprintsLoading &&
        !issuesLoading &&
        !sprintsError &&
        activeSprintsInApiOrder.length > 0 &&
        !boardReady && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center text-gray-600 text-sm">Loading…</div>
          </div>
        )}

      {displayMode === "tasks" && boardReady && (
        <div className="mb-0 grid grid-cols-7 border-b border-gray-200">
          {DAYS_OF_WEEK.map((d) => (
            <div
              key={d}
              className="border-r border-gray-200 py-2 text-center text-xs font-semibold text-gray-500 last:border-r-0"
            >
              {d}
            </div>
          ))}
        </div>
      )}

      {displayMode === "sprints" && sprintsLoading && (
        <p className="text-center text-gray-500 text-sm py-8">Loading sprints…</p>
      )}

      {displayMode === "sprints" && sprintsError && (
        <p className="text-center text-red-600 text-sm py-4">{sprintsError}</p>
      )}

      {displayMode === "sprints" && !sprintsLoading && !sprintsError && (
        <>
          <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/80">
              {DAYS_OF_WEEK.map((d, i) => (
                <div
                  key={d}
                  className={`py-2.5 text-center text-xs font-semibold text-gray-500 ${
                    i < 6 ? "border-r border-gray-200" : ""
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>
            {Array.from({ length: 6 }, (_, row) => {
              const weekDays = monthGrid.slice(row * 7, row * 7 + 7);
              const weekStart = startOfDay(weekDays[0]);
              const weekEnd = startOfDay(weekDays[6]);
              const rawSubSegs = [];
              for (const sprint of calendarSprints) {
                rawSubSegs.push(
                  ...subSegmentsVisibleInWeek(
                    sprint,
                    weekStart,
                    weekEnd,
                    visibleSprintIdsByDayKey,
                  ),
                );
              }
              const { placed: withLanes } = assignLanesCapped(
                rawSubSegs,
                MAX_SPRINT_STRIP_LANES,
              );
              const stripBandH = computeStripBandHeightPx(withLanes);

              return (
                <div
                  key={row}
                  className="relative grid grid-cols-7 border-b border-gray-200 last:border-b-0 bg-white"
                >
                  {weekDays.map((day, colIdx) => {
                    const isCurrentMonth = isSameMonth(day, displayDate);
                    const isPast = isBefore(day, today);
                    const isTodayDate = isToday(day);
                    const hidden = isCurrentMonth
                      ? hiddenSprintsForDay(day, calendarSprints)
                      : [];

                    const cellBg = !isCurrentMonth
                      ? "bg-gray-50"
                      : isPast
                        ? "bg-gray-50/80"
                        : "bg-white";

                    return (
                      <div
                        key={colIdx}
                        className={`flex min-h-0 flex-col border-r border-gray-200 ${colIdx === 6 ? "border-r-0" : ""} ${cellBg}`}
                      >
                        <div className="shrink-0 px-2 pt-2 pb-1">
                          <button
                            type="button"
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                              isTodayDate
                                ? "bg-primary text-white"
                                : !isCurrentMonth
                                  ? "text-gray-400"
                                  : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {format(day, "d")}
                          </button>
                        </div>
                        <div
                          className="min-w-0 shrink-0"
                          style={{ minHeight: stripBandH }}
                          aria-hidden
                        />
                        <div
                          className="mt-auto shrink-0 px-2 pb-2 pt-1"
                          style={{ minHeight: MORE_ROW_MIN_HEIGHT_PX }}
                        >
                          {isCurrentMonth && hidden.length > 0 ? (
                            <button
                              type="button"
                              className="w-full rounded text-left text-xs font-medium text-primary hover:bg-primary/5 hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDaySprintsModal({
                                  day,
                                  sprints: hidden,
                                });
                              }}
                            >
                              +{hidden.length} more
                            </button>
                          ) : (
                            <span
                              className="block min-h-[1.25rem]"
                              aria-hidden
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <SprintWeekStripOverlay
                    weekRowIndex={row}
                    placedSegments={withLanes}
                    onSprintSelect={setSprintDetail}
                    topPx={DAY_DATE_BAND_PX}
                    heightPx={stripBandH}
                  />
                </div>
              );
            })}
          </div>

          {!monthHasSprints && (
            <p className="text-center text-gray-400 text-sm mt-6">
              No sprints overlap {format(displayDate, "MMMM yyyy")}.
            </p>
          )}
        </>
      )}

      {displayMode === "tasks" && boardReady && (
        <>
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
                ${!isCurrentMonth ? "bg-gray-50" : isOverdue ? "bg-red-50" : "bg-white"}
              `}
                >
                  <button
                    type="button"
                    className={`self-start w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1
                  ${
                    isTodayDate
                      ? "bg-primary text-white"
                      : !isCurrentMonth
                        ? "text-gray-400"
                        : isOverdue
                          ? "text-red-600 font-semibold cursor-pointer hover:bg-red-100"
                          : "text-gray-700 cursor-pointer hover:bg-gray-100"
                  }`}
                    onClick={(e) =>
                      openDayTaskDetail(
                        e,
                        dateKey,
                        format(day, "MMMM d, yyyy"),
                      )
                    }
                  >
                    {format(day, "d")}
                  </button>
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
                          type="button"
                          className="text-xs text-primary hover:underline text-left px-1"
                          onClick={(e) =>
                            openDayTaskDetail(
                              e,
                              dateKey,
                              format(day, "MMMM d, yyyy"),
                            )
                          }
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
          {!monthHasTasks && (
            <p className="text-center text-gray-400 text-sm mt-6">
              {countActiveFilters(scrumFilters) > 0
                ? EMPTY_STATE_FILTER_ACTIVE_MESSAGE
                : `No tasks with due dates in active sprints for ${format(displayDate, "MMMM yyyy")}.`}
            </p>
          )}
        </>
      )}

      {dayDetailTasks && (
        <DayTasksOverlay
          label={dayDetailLabel}
          tasks={dayDetailTasks}
          onClose={() => setDayDetailTasks(null)}
          onSelectTask={(id) => {
            setDayDetailTasks(null);
            setDetailIssueId(id);
          }}
        />
      )}

      {daySprintsModal && (
        <DaySprintsModal
          day={daySprintsModal.day}
          sprints={daySprintsModal.sprints}
          onClose={() => setDaySprintsModal(null)}
          onPickSprint={(s) => setSprintDetail(s)}
        />
      )}

      {sprintDetail && (
        <SprintDetailModal
          sprint={sprintDetail}
          onClose={() => setSprintDetail(null)}
        />
      )}

      {detailIssueId && (
        <IssueDetailModal
          showModal={!!detailIssueId}
          setShowModal={(open) => {
            if (!open) setDetailIssueId(null);
          }}
          issueId={detailIssueId}
        />
      )}
    </div>
  );
}

/** Inline clone of CalendarView day popup for tasks */
function DayTasksOverlay({ label, tasks, onClose, onSelectTask }) {
  const overlayRef = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">
            Tasks due on {label}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-3 max-h-80 overflow-y-auto divide-y divide-gray-100">
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              className="w-full flex items-center gap-3 py-3 text-left hover:bg-gray-50 rounded transition-colors"
              onClick={() => {
                onClose();
                onSelectTask(task.id);
              }}
            >
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${TASK_CHIP_STYLES[task.priority] || TASK_CHIP_STYLES.LOW}`}
              >
                <Flag className="w-3 h-3 mr-1" />
                {task.priority}
              </span>
              <span className="text-sm text-gray-800 truncate flex-1">
                {task.title}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
