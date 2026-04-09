import { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Filter } from 'lucide-react';
import { setFilters, clearFilters } from '../store/issueSlice';
import { countActiveFilters } from '../utils/issueFilters';
import SprintSelectPopoverField from './SprintSelectPopoverField';

// ── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: 'LOW',    label: 'Low'    },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH',   label: 'High'   },
];

const STATUS_OPTIONS = [
  { value: 'TO_DO',       label: 'To Do'       },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE',        label: 'Done'        },
];

const DUE_DATE_PRESETS = [
  { value: 'TODAY',      label: 'Today'      },
  { value: 'THIS_WEEK',  label: 'This Week'  },
  { value: 'THIS_MONTH', label: 'This Month' },
];

// ── Small helpers ─────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
      {children}
    </p>
  );
}

function PillButton({ active, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer
        ${active
          ? 'bg-primary text-white border-primary'
          : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
        } ${className}`}
    >
      {children}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * A single "Filter" button that opens a view-specific popup panel below it.
 * Filter changes apply immediately to Redux (no Apply button).
 *
 * @param {'board'|'scrumBoard'|'scrumCalendar'|'scrumList'|'list'|'calendar'} view - controls which filter sections appear
 * @param {{ id: number; name: string; status?: string }[]} [sprintFilterOptions] - scrum board/list sprint row (optional status for badge)
 */
export default function IssueFilterButton({ view, align = 'end', sprintFilterOptions }) {
  const dispatch = useDispatch();
  const activeFilterCount = useSelector((state) =>
    countActiveFilters(state.issues.filtersByView[view]),
  );
  const reduxFilters = useSelector((state) => state.issues.filtersByView[view]);

  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  const showAssignedToMe =
    view === 'board' ||
    view === 'scrumBoard' ||
    view === 'scrumCalendar' ||
    view === 'scrumList' ||
    view === 'list';
  const showStatus =
    view === 'list' || view === 'scrumList' || view === 'calendar';

  const patchFilters = useCallback(
    (patch) => {
      let next = { ...reduxFilters, ...patch };
      if (view === 'scrumBoard' || view === 'scrumCalendar' || view === 'scrumList') {
        const { sprintId: _legacy, ...rest } = next;
        next = rest;
      }
      dispatch(setFilters({ view, filters: next }));
    },
    [dispatch, view, reduxFilters],
  );

  // Close on outside click (same pattern as Columns button in IssueListView)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!panelRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const togglePriority = useCallback(
    (value) => {
      const p = reduxFilters.priorities ?? [];
      const priorities = p.includes(value)
        ? p.filter((v) => v !== value)
        : [...p, value];
      patchFilters({ priorities });
    },
    [patchFilters, reduxFilters.priorities],
  );

  const toggleStatus = useCallback(
    (value) => {
      const s = reduxFilters.statuses ?? [];
      const statuses = s.includes(value)
        ? s.filter((v) => v !== value)
        : [...s, value];
      patchFilters({ statuses });
    },
    [patchFilters, reduxFilters.statuses],
  );

  const toggleAssignedToMe = useCallback(() => {
    patchFilters({ assignedToMe: !reduxFilters.assignedToMe });
  }, [patchFilters, reduxFilters.assignedToMe]);

  /** Today / This week / This month — mutually exclusive with each other; clears custom range. */
  const selectQuickDuePreset = useCallback(
    (value) => {
      const nextPreset = reduxFilters.dueDatePreset === value ? null : value;
      patchFilters({
        dueDatePreset: nextPreset,
        dueDateFrom: null,
        dueDateTo: null,
      });
    },
    [patchFilters, reduxFilters.dueDatePreset],
  );

  /** Toggle Custom: enables date inputs; turning off clears range. Does not count as active until both dates set. */
  const toggleCustomDueRange = useCallback(() => {
    if (reduxFilters.dueDatePreset === 'CUSTOM') {
      patchFilters({ dueDatePreset: null, dueDateFrom: null, dueDateTo: null });
    } else {
      patchFilters({
        dueDatePreset: 'CUSTOM',
        dueDateFrom: null,
        dueDateTo: null,
      });
    }
  }, [patchFilters, reduxFilters.dueDatePreset]);

  const customDatesEnabled = reduxFilters.dueDatePreset === 'CUSTOM';

  const handleDateFromChange = useCallback(
    (e) => {
      if (!customDatesEnabled) return;
      const val = e.target.value || null;
      patchFilters({
        dueDatePreset: 'CUSTOM',
        dueDateFrom: val,
      });
    },
    [patchFilters, customDatesEnabled],
  );

  const handleDateToChange = useCallback(
    (e) => {
      if (!customDatesEnabled) return;
      const val = e.target.value || null;
      patchFilters({
        dueDatePreset: 'CUSTOM',
        dueDateTo: val,
      });
    },
    [patchFilters, customDatesEnabled],
  );

  const handleClearAll = useCallback(() => {
    dispatch(clearFilters({ view }));
    setOpen(false);
  }, [dispatch, view]);

  const sprintIds = Array.isArray(reduxFilters.sprintIds)
    ? reduxFilters.sprintIds
    : [];

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border rounded-md transition-colors cursor-pointer
          ${activeFilterCount > 0
            ? 'border-primary text-primary bg-primary/5 hover:bg-primary/10'
            : 'border-gray-300 text-gray-600 bg-white hover:bg-gray-50'
          }`}
      >
        <Filter className="w-4 h-4" />
        Filter
        {activeFilterCount > 0 && (
          <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold leading-none">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Popup panel */}
      {open && (
        <div
          className={`absolute top-full mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg w-80 max-w-[calc(100vw-1rem)] ${align === 'start' ? 'left-0' : 'right-0'}`}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Filters</span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>

          <div className="px-5 py-4 space-y-5">

            {/* ── Sprint (Scrum board) ─ */}
            {(view === 'scrumBoard' ||
              view === 'scrumCalendar' ||
              view === 'scrumList') &&
              sprintFilterOptions &&
              sprintFilterOptions.length > 0 && (
                <div>
                  <label
                    htmlFor="issue-filter-scrum-sprint-trigger"
                    className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 cursor-pointer"
                  >
                    Sprint
                  </label>
                  <SprintSelectPopoverField
                    selectionMode="multi"
                    showLabel={false}
                    options={sprintFilterOptions}
                    value={sprintIds}
                    onChange={(ids) => patchFilters({ sprintIds: ids })}
                    triggerId="issue-filter-scrum-sprint-trigger"
                    rootClassName="mb-0"
                  />
                </div>
              )}

            {/* ── Assigned to Me (Board + List only) ─────────────────────── */}
            {showAssignedToMe && (
              <div>
                <SectionLabel>Assigned to</SectionLabel>
                <PillButton
                  active={reduxFilters.assignedToMe}
                  onClick={toggleAssignedToMe}
                >
                  Assigned to Me
                </PillButton>
              </div>
            )}

            {/* ── Priority ───────────────────────────────────────────────── */}
            <div>
              <SectionLabel>Priority</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map(({ value, label }) => (
                  <PillButton
                    key={value}
                    active={(reduxFilters.priorities ?? []).includes(value)}
                    onClick={() => togglePriority(value)}
                  >
                    {label}
                  </PillButton>
                ))}
              </div>
            </div>

            {/* ── Due Date ───────────────────────────────────────────────── */}
            <div>
              <SectionLabel>Due Date</SectionLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {DUE_DATE_PRESETS.map(({ value, label }) => (
                  <PillButton
                    key={value}
                    active={reduxFilters.dueDatePreset === value}
                    onClick={() => selectQuickDuePreset(value)}
                  >
                    {label}
                  </PillButton>
                ))}
              </div>
              <div className="mb-2">
                <PillButton
                  active={reduxFilters.dueDatePreset === 'CUSTOM'}
                  onClick={toggleCustomDueRange}
                  className="w-full flex justify-center"
                >
                  Custom
                </PillButton>
              </div>
              <p className="text-[10px] text-gray-500 mb-1.5">
                Start date and end date apply as one filter when both are set.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  disabled={!customDatesEnabled}
                  value={customDatesEnabled ? (reduxFilters.dueDateFrom ?? '') : ''}
                  onChange={handleDateFromChange}
                  className="min-w-0 flex-1 text-xs border border-gray-300 rounded-md px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-50"
                />
                <span className="text-xs text-gray-400 shrink-0">to</span>
                <input
                  type="date"
                  disabled={!customDatesEnabled}
                  value={customDatesEnabled ? (reduxFilters.dueDateTo ?? '') : ''}
                  onChange={handleDateToChange}
                  min={customDatesEnabled ? (reduxFilters.dueDateFrom ?? '') : ''}
                  className="min-w-0 flex-1 text-xs border border-gray-300 rounded-md px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:bg-gray-50"
                />
              </div>
            </div>

            {/* ── Status (List + Calendar only) ──────────────────────────── */}
            {showStatus && (
              <div>
                <SectionLabel>Status</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(({ value, label }) => (
                    <PillButton
                      key={value}
                      active={(reduxFilters.statuses ?? []).includes(value)}
                      onClick={() => toggleStatus(value)}
                    >
                      {label}
                    </PillButton>
                  ))}
                </div>
              </div>
            )}

          </div>

          <div className="px-5 pb-4 pt-2 border-t border-gray-100 flex justify-center">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-6 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
