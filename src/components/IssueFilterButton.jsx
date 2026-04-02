import { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SlidersHorizontal } from 'lucide-react';
import { setFilters, clearFilters, selectActiveFilterCount } from '../store/issueSlice';
import { INITIAL_FILTERS } from '../utils/issueFilters';

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

function PillButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer
        ${active
          ? 'bg-primary text-white border-primary'
          : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
        }`}
    >
      {children}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * A single "Filter" button that opens a view-specific popup panel below it.
 * Follows the identical outside-click + ref pattern used by the Columns button
 * in IssueListView.jsx.
 *
 * @param {'board'|'list'|'calendar'} view - controls which filter sections appear
 */
export default function IssueFilterButton({ view }) {
  const dispatch = useDispatch();
  const activeFilterCount = useSelector(selectActiveFilterCount);
  const reduxFilters = useSelector((state) => state.issues.activeFilters);

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState({ ...INITIAL_FILTERS });
  const panelRef = useRef(null);

  const showAssignedToMe = view === 'board' || view === 'list';
  const showStatus       = view === 'list'  || view === 'calendar';

  // Sync pending state from Redux whenever the panel opens
  useEffect(() => {
    if (open) {
      setPending({
        ...reduxFilters,
        priorities: [...reduxFilters.priorities],
        statuses:   [...reduxFilters.statuses],
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Pending state helpers ──────────────────────────────────────────────────

  const togglePriority = useCallback((value) => {
    setPending((prev) => ({
      ...prev,
      priorities: prev.priorities.includes(value)
        ? prev.priorities.filter((v) => v !== value)
        : [...prev.priorities, value],
    }));
  }, []);

  const toggleStatus = useCallback((value) => {
    setPending((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(value)
        ? prev.statuses.filter((v) => v !== value)
        : [...prev.statuses, value],
    }));
  }, []);

  const toggleAssignedToMe = useCallback(() => {
    setPending((prev) => ({ ...prev, assignedToMe: !prev.assignedToMe }));
  }, []);

  // Due date presets are mutually exclusive; clicking the active one deselects it
  const selectPreset = useCallback((value) => {
    setPending((prev) => ({
      ...prev,
      dueDatePreset: prev.dueDatePreset === value ? null : value,
      // Selecting a preset always clears the custom date range
      dueDateFrom: null,
      dueDateTo:   null,
    }));
  }, []);

  const handleDateFromChange = useCallback((e) => {
    const val = e.target.value || null;
    setPending((prev) => ({
      ...prev,
      dueDatePreset: 'CUSTOM',
      dueDateFrom:   val,
    }));
  }, []);

  const handleDateToChange = useCallback((e) => {
    const val = e.target.value || null;
    setPending((prev) => ({
      ...prev,
      dueDatePreset: 'CUSTOM',
      dueDateTo: val,
    }));
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleApply = () => {
    dispatch(setFilters(pending));
    setOpen(false);
  };

  const handleClearAll = () => {
    dispatch(clearFilters());
    setPending({ ...INITIAL_FILTERS });
    setOpen(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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
        <SlidersHorizontal className="w-4 h-4" />
        Filter
        {activeFilterCount > 0 && (
          <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold leading-none">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Popup panel */}
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-lg shadow-lg w-72">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Filters</span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>

          <div className="px-4 py-3 space-y-4">

            {/* ── Assigned to Me (Board + List only) ─────────────────────── */}
            {showAssignedToMe && (
              <div>
                <SectionLabel>Assigned to</SectionLabel>
                <PillButton
                  active={pending.assignedToMe}
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
                    active={pending.priorities.includes(value)}
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
              {/* Presets — mutually exclusive */}
              <div className="flex flex-wrap gap-2 mb-2">
                {DUE_DATE_PRESETS.map(({ value, label }) => (
                  <PillButton
                    key={value}
                    active={pending.dueDatePreset === value}
                    onClick={() => selectPreset(value)}
                  >
                    {label}
                  </PillButton>
                ))}
              </div>
              {/* Custom date range */}
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="date"
                  value={pending.dueDatePreset === 'CUSTOM' ? (pending.dueDateFrom ?? '') : ''}
                  onChange={handleDateFromChange}
                  className="flex-1 text-xs border border-gray-300 rounded-md px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="Start"
                />
                <span className="text-xs text-gray-400 shrink-0">to</span>
                <input
                  type="date"
                  value={pending.dueDatePreset === 'CUSTOM' ? (pending.dueDateTo ?? '') : ''}
                  onChange={handleDateToChange}
                  min={pending.dueDatePreset === 'CUSTOM' ? (pending.dueDateFrom ?? '') : ''}
                  className="flex-1 text-xs border border-gray-300 rounded-md px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  placeholder="End"
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
                      active={pending.statuses.includes(value)}
                      onClick={() => toggleStatus(value)}
                    >
                      {label}
                    </PillButton>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Panel footer — Apply */}
          <div className="px-4 pb-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleApply}
              className="w-full py-2 text-sm font-medium rounded-md bg-primary text-white hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
