import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Flag, SlidersHorizontal, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatSmartTimestamp } from '../utils/dateUtils';
import { isIssueOverdue } from '../utils/issueDue';
import { useAuth } from '../context/AuthContext';
import { deleteIssue, selectListFilteredIssues } from '@/store/issueSlice';
import { countActiveFilters, EMPTY_STATE_FILTER_ACTIVE_MESSAGE } from '@/utils/issueFilters';
import CreateIssueModal from './CreateIssueModal';
import EditTaskModal from './EditTaskModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import IssueFilterButton from './IssueFilterButton';
import StatusBadge from './StatusBadge';
import { SprintLifecycleBadge } from '@/components/ui/TimelineStyleBadge';

const BASE_COLUMN_DEFINITIONS = [
  { id: 'name',         label: 'Name',           defaultVisible: true  },
  { id: 'status',       label: 'Status',         defaultVisible: true  },
  { id: 'priority',     label: 'Priority',       defaultVisible: true  },
  { id: 'assignedTo',   label: 'Assigned To',    defaultVisible: true  },
  { id: 'createdBy',    label: 'Created By',     defaultVisible: true  },
  { id: 'dueDate',      label: 'Due Date',       defaultVisible: true  },
  { id: 'description',  label: 'Description',    defaultVisible: true  },
  { id: 'lastUpdatedBy', label: 'Last Updated By', defaultVisible: false },
  { id: 'lastUpdatedAt', label: 'Last Updated At', defaultVisible: false },
  { id: 'assignedBy',   label: 'Assigned By',    defaultVisible: false },
];

const SCRUM_LIST_COLUMN_DEFINITIONS = [
  BASE_COLUMN_DEFINITIONS[0],
  { id: 'sprint', label: 'Sprint', defaultVisible: true },
  { id: 'sprintStatus', label: 'Sprint Status', defaultVisible: true },
  ...BASE_COLUMN_DEFINITIONS.slice(1),
];

function columnDefinitionsForVariant(variant) {
  return variant === 'scrum' ? SCRUM_LIST_COLUMN_DEFINITIONS : BASE_COLUMN_DEFINITIONS;
}

function listColumnStorageKey(projectId, variant) {
  return variant === 'scrum'
    ? `teamboard_list_cols_${projectId}_scrum`
    : `teamboard_list_cols_${projectId}`;
}

const PRIORITY_ORDER = { HIGH: 1, MEDIUM: 2, LOW: 3 };
const SORT_DEFAULT_DIR = { lastUpdatedAt: 'desc' };

const getSortValue = (issue, col) => {
  switch (col) {
    case 'name':         return (issue.title || '').toLowerCase();
    case 'priority':     return PRIORITY_ORDER[issue.priority] ?? 99;
    case 'assignedTo':   return (issue.assigneeName || '').toLowerCase();
    case 'createdBy':    return (issue.createdByName || '').toLowerCase();
    case 'dueDate':      return issue.dueDate
                           ? new Date(issue.dueDate + 'T00:00:00').getTime()
                           : Infinity;
    case 'lastUpdatedBy': return (issue.lastUpdatedByName || '').toLowerCase();
    case 'lastUpdatedAt': return issue.lastUpdatedAt
                           ? new Date(issue.lastUpdatedAt).getTime()
                           : 0;
    case 'assignedBy':   return (issue.assignedByName || '').toLowerCase();
    case 'sprint':        return (issue.sprintName || '').toLowerCase();
    case 'sprintStatus':  return (issue.sprintStatus || '').toLowerCase();
    default: return '';
  }
};

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col)
    return <ChevronsUpDown className="w-3 h-3 opacity-50 flex-shrink-0" />;
  return sortDir === 'asc'
    ? <ChevronUp   className="w-3 h-3 text-primary flex-shrink-0" />
    : <ChevronDown className="w-3 h-3 text-primary flex-shrink-0" />;
}

const PRIORITY_COLORS = {
  HIGH: 'bg-red-100 text-red-700 border-red-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LOW: 'bg-green-100 text-green-700 border-green-200',
};

function Badge({ value, colorMap, withFlag = false, withBorder = false }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${withBorder ? 'border' : ''} ${colorMap[value] || 'bg-gray-100 text-gray-600'}`}
    >
      {withFlag && <Flag className="w-3 h-3 mr-1" />}
      {value}
    </span>
  );
}

function TruncatedCell({
  value,
  issueId,
  field,
  expandedCell,
  setExpandedCell,
  emptyLabel = '—',
  emptyClassName = 'text-gray-400',
}) {
  const isExpanded = expandedCell?.issueId === issueId && expandedCell?.field === field;
  const triggerRef = useRef(null);
  const popupRef   = useRef(null);

  useEffect(() => {
    if (!isExpanded) return;
    const handler = (e) => {
      if (
        !triggerRef.current?.contains(e.target) &&
        !popupRef.current?.contains(e.target)
      ) {
        setExpandedCell(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isExpanded, setExpandedCell]);

  let popupStyle = null;
  if (isExpanded && triggerRef.current) {
    const rect       = triggerRef.current.getBoundingClientRect();
    const popupWidth = Math.min(320, window.innerWidth - 24);
    const pad        = 12;
    const gap        = 6;
    const estH       = 100;
    const showAbove  = window.innerHeight - rect.bottom < estH && rect.top > estH;
    const left       = Math.max(pad, Math.min(rect.left, window.innerWidth - popupWidth - pad));
    popupStyle = {
      position: 'fixed',
      left,
      top: showAbove ? rect.top - gap : rect.bottom + gap,
      width: popupWidth,
      transform: showAbove ? 'translateY(-100%)' : 'none',
    };
  }

  return (
    <div className="relative">
      <div
        ref={triggerRef}
        className="max-w-[160px] truncate cursor-pointer hover:text-primary"
        title={value || emptyLabel}
        onClick={(e) => {
          e.stopPropagation();
          if (value) setExpandedCell(isExpanded ? null : { issueId, field });
        }}
      >
        {value || <span className={emptyClassName}>{emptyLabel}</span>}
      </div>
      {isExpanded && popupStyle && createPortal(
        <div
          ref={popupRef}
          className="z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl p-3 text-sm text-gray-800 break-words"
          style={popupStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </div>,
        document.body
      )}
    </div>
  );
}

function loadVisibleColumnsFromStorage(storageKey, defaultColumns) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultColumns;
    const parsed = JSON.parse(raw);
    const merged = { ...defaultColumns, ...parsed };
    if (Object.prototype.hasOwnProperty.call(parsed, 'lastEditedBy') && !Object.prototype.hasOwnProperty.call(parsed, 'lastUpdatedBy')) {
      merged.lastUpdatedBy = parsed.lastEditedBy;
    }
    if (Object.prototype.hasOwnProperty.call(parsed, 'lastEditedAt') && !Object.prototype.hasOwnProperty.call(parsed, 'lastUpdatedAt')) {
      merged.lastUpdatedAt = parsed.lastEditedAt;
    }
    delete merged.lastEditedBy;
    delete merged.lastEditedAt;
    return merged;
  } catch {
    return defaultColumns;
  }
}

export default function IssueListView({
  projectId,
  issues: issuesProp,
  filterView = 'list',
  sprintFilterOptions,
  variant = 'kanban',
}) {
  const dispatch = useDispatch();
  const { isCreator, isProjectOwner, canUpdateIssueStatus } = useAuth();
  const listFiltered = useSelector(selectListFilteredIssues);
  const issues = issuesProp ?? listFiltered;
  const { currentProject } = useSelector((state) => state.project);
  const viewFilters = useSelector((state) => state.issues.filtersByView[filterView]);
  const listFiltersActive = countActiveFilters(viewFilters) > 0;

  const columnDefs = columnDefinitionsForVariant(variant);
  const columnsStorageKey = listColumnStorageKey(projectId, variant);

  const [expandedCell, setExpandedCell] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalEditIssue, setModalEditIssue] = useState(null);
  const [pendingDeleteIssue, setPendingDeleteIssue] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const defaultColumns = Object.fromEntries(
      columnDefs.map((c) => [c.id, c.defaultVisible]),
    );
    return loadVisibleColumnsFromStorage(columnsStorageKey, defaultColumns);
  });
  const [colsOpen, setColsOpen] = useState(false);

  const containerRef = useRef(null);
  const colsRef = useRef(null);

  const allMembers = useMemo(() => {
    const owner = currentProject?.owner;
    const team = currentProject?.team || [];
    if (!owner) return team;
    const seen = new Set([owner.id]);
    return [owner, ...team.filter((m) => !seen.has(m.id))];
  }, [currentProject]);

  const sortedIssues = useMemo(() => {
    if (!sortCol) return issues;
    return [...issues].sort((a, b) => {
      const va = getSortValue(a, sortCol);
      const vb = getSortValue(b, sortCol);
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [issues, sortCol, sortDir]);

  useEffect(() => {
    const handleMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setExpandedCell(null);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  useEffect(() => {
    localStorage.setItem(columnsStorageKey, JSON.stringify(visibleColumns));
  }, [visibleColumns, columnsStorageKey]);

  useEffect(() => {
    if (!colsOpen) return;
    const handler = (e) => { if (!colsRef.current?.contains(e.target)) setColsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [colsOpen]);

  const myRole = currentProject?.myRole ?? null;

  const canDeleteTask = useCallback(
    (issue) => {
      const canAdministerAllTasks =
        myRole === 'OWNER' ||
        myRole === 'ADMIN' ||
        (!myRole && isProjectOwner(issue.projectOwnerId));
      return isCreator(issue.createdById) || canAdministerAllTasks;
    },
    [myRole, isCreator, isProjectOwner]
  );

  const canOpenEditModal = useCallback(
    (issue) => canDeleteTask(issue) || canUpdateIssueStatus(issue),
    [canDeleteTask, canUpdateIssueStatus]
  );

  const showActionsColumn = useMemo(() => {
    if (variant === 'scrum') {
      return issues.some(
        (issue) =>
          issue.sprintStatus === 'ACTIVE' &&
          (canOpenEditModal(issue) || canDeleteTask(issue)),
      );
    }
    return issues.some((issue) => canOpenEditModal(issue));
  }, [issues, variant, canOpenEditModal, canDeleteTask]);

  const toggleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir(SORT_DEFAULT_DIR[col] ?? 'asc');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeleteIssue) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteIssue(pendingDeleteIssue.id)).unwrap();
      setPendingDeleteIssue(null);
    } catch {
      // errors surfaced via Redux if needed
    } finally {
      setIsDeleting(false);
    }
  };

  const col = (id) => {
    const def = columnDefs.find((c) => c.id === id);
    if (!def) return false;
    return visibleColumns[id] ?? def.defaultVisible;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const [year, month, day] = dateStr.split('T')[0].split('-');
      return `${month}/${day}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const openEditModal = (issue) => {
    setExpandedCell(null);
    setModalEditIssue(issue);
  };

  return (
    <div ref={containerRef} onClick={() => setExpandedCell(null)} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="relative" ref={colsRef}>
            <button
              onClick={() => setColsOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-md text-gray-600 bg-white hover:bg-gray-50 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Columns
            </button>
            {colsOpen && (
              <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[180px]">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Toggle columns</p>
                {columnDefs.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 py-1 cursor-pointer text-sm text-gray-700 hover:text-gray-900">
                    <input
                      type="checkbox"
                      checked={col(c.id)}
                      onChange={() => setVisibleColumns((v) => ({ ...v, [c.id]: !v[c.id] }))}
                      className="rounded"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <IssueFilterButton
            view={filterView}
            align="start"
            sprintFilterOptions={sprintFilterOptions}
          />
        </div>

        {variant !== 'scrum' && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        )}
      </div>

      {issues.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-white rounded-lg border border-gray-200">
          <p className="text-base font-medium mb-1">
            {listFiltersActive
              ? EMPTY_STATE_FILTER_ACTIVE_MESSAGE
              : variant === 'scrum'
                ? 'No tasks in active or completed sprints'
                : 'No tasks yet'}
          </p>
          {!listFiltersActive && (
            <p className="text-sm">
              {variant === 'scrum'
                ? 'Start a sprint from the Backlog tab or adjust filters.'
                : 'Create a task to get started.'}
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">ID</th>
                {col('name') && (
                  <th
                    onClick={() => toggleSort('name')}
                    className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100"
                  >
                    <span className="flex items-center gap-1">Name <SortIcon col="name" sortCol={sortCol} sortDir={sortDir} /></span>
                  </th>
                )}
                {col('sprint') && (
                  <th
                    onClick={() => toggleSort('sprint')}
                    className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100"
                  >
                    <span className="flex items-center gap-1">Sprint <SortIcon col="sprint" sortCol={sortCol} sortDir={sortDir} /></span>
                  </th>
                )}
                {col('sprintStatus') && (
                  <th
                    onClick={() => toggleSort('sprintStatus')}
                    className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100"
                  >
                    <span className="flex items-center gap-1">Sprint Status <SortIcon col="sprintStatus" sortCol={sortCol} sortDir={sortDir} /></span>
                  </th>
                )}
                {col('status') && <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Status</th>}
                {col('priority') && (
                  <th
                    onClick={() => toggleSort('priority')}
                    className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100"
                  >
                    <span className="flex items-center gap-1">Priority <SortIcon col="priority" sortCol={sortCol} sortDir={sortDir} /></span>
                  </th>
                )}
                {col('assignedTo') && (
                  <th
                    onClick={() => toggleSort('assignedTo')}
                    className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100"
                  >
                    <span className="flex items-center gap-1">Assigned To <SortIcon col="assignedTo" sortCol={sortCol} sortDir={sortDir} /></span>
                  </th>
                )}
                {col('createdBy') && (
                  <th
                    onClick={() => toggleSort('createdBy')}
                    className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100"
                  >
                    <span className="flex items-center gap-1">Created By <SortIcon col="createdBy" sortCol={sortCol} sortDir={sortDir} /></span>
                  </th>
                )}
                {col('dueDate') && (
                  <th
                    onClick={() => toggleSort('dueDate')}
                    className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100"
                  >
                    <span className="flex items-center gap-1">Due Date <SortIcon col="dueDate" sortCol={sortCol} sortDir={sortDir} /></span>
                  </th>
                )}
                {col('description') && <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Description</th>}
                {col('lastUpdatedBy') && (
                  <th
                    onClick={() => toggleSort('lastUpdatedBy')}
                    className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100"
                  >
                    <span className="flex items-center gap-1">Last Updated By <SortIcon col="lastUpdatedBy" sortCol={sortCol} sortDir={sortDir} /></span>
                  </th>
                )}
                {col('lastUpdatedAt') && (
                  <th
                    onClick={() => toggleSort('lastUpdatedAt')}
                    className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100"
                  >
                    <span className="flex items-center gap-1">Last Updated At <SortIcon col="lastUpdatedAt" sortCol={sortCol} sortDir={sortDir} /></span>
                  </th>
                )}
                {col('assignedBy') && (
                  <th
                    onClick={() => toggleSort('assignedBy')}
                    className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100"
                  >
                    <span className="flex items-center gap-1">Assigned By <SortIcon col="assignedBy" sortCol={sortCol} sortDir={sortDir} /></span>
                  </th>
                )}
                {showActionsColumn && (
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedIssues.map((issue) => {
                const overdue = isIssueOverdue(issue);
                const rowBg = overdue ? 'bg-red-50' : 'bg-white';

                return (
                  <tr
                    key={issue.id}
                    className={`${rowBg} hover:brightness-[0.98] transition-colors`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <td className="px-3 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                      #{issue.id}
                    </td>

                    {col('name') && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <TruncatedCell
                          value={issue.title}
                          issueId={issue.id}
                          field="title"
                          expandedCell={expandedCell}
                          setExpandedCell={setExpandedCell}
                        />
                      </td>
                    )}

                    {col('sprint') && (
                      <td className="px-3 py-3 whitespace-nowrap text-gray-700">
                        <TruncatedCell
                          value={issue.sprintName || null}
                          issueId={issue.id}
                          field="sprintName"
                          expandedCell={expandedCell}
                          setExpandedCell={setExpandedCell}
                          emptyLabel="—"
                        />
                      </td>
                    )}

                    {col('sprintStatus') && (
                      <td className="px-3 py-3 whitespace-nowrap text-gray-700">
                        {issue.sprintStatus === 'ACTIVE' ||
                        issue.sprintStatus === 'COMPLETED' ? (
                          <SprintLifecycleBadge
                            sprintStatus={issue.sprintStatus}
                          />
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    )}

                    {col('status') && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <StatusBadge status={issue.status} />
                      </td>
                    )}

                    {col('priority') && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <Badge
                          value={issue.priority}
                          colorMap={PRIORITY_COLORS}
                          withFlag
                          withBorder
                        />
                      </td>
                    )}

                    {col('assignedTo') && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <TruncatedCell
                          value={issue.assigneeName}
                          issueId={issue.id}
                          field="assigneeName"
                          expandedCell={expandedCell}
                          setExpandedCell={setExpandedCell}
                          emptyLabel="Unassigned"
                          emptyClassName="text-gray-600 text-sm"
                        />
                      </td>
                    )}

                    {col('createdBy') && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <TruncatedCell
                          value={issue.createdByName}
                          issueId={issue.id}
                          field="createdByName"
                          expandedCell={expandedCell}
                          setExpandedCell={setExpandedCell}
                        />
                      </td>
                    )}

                    {col('dueDate') && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`text-gray-700 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                          {formatDate(issue.dueDate)}
                        </span>
                      </td>
                    )}

                    {col('description') && (
                      <td className="px-3 py-3">
                        <TruncatedCell
                          value={issue.description}
                          issueId={issue.id}
                          field="description"
                          expandedCell={expandedCell}
                          setExpandedCell={setExpandedCell}
                        />
                      </td>
                    )}

                    {col('lastUpdatedBy') && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <TruncatedCell
                          value={issue.lastUpdatedByName || null}
                          issueId={issue.id}
                          field="lastUpdatedByName"
                          expandedCell={expandedCell}
                          setExpandedCell={setExpandedCell}
                        />
                      </td>
                    )}

                    {col('lastUpdatedAt') && (
                      <td className="px-3 py-3 whitespace-nowrap text-gray-500 text-xs">
                        {formatSmartTimestamp(issue.lastUpdatedAt) || '—'}
                      </td>
                    )}

                    {col('assignedBy') && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <TruncatedCell
                          value={issue.assignedByName || null}
                          issueId={issue.id}
                          field="assignedByName"
                          expandedCell={expandedCell}
                          setExpandedCell={setExpandedCell}
                        />
                      </td>
                    )}

                    {showActionsColumn && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex gap-2 flex-wrap">
                          {(variant !== 'scrum' || issue.sprintStatus === 'ACTIVE') &&
                            canOpenEditModal(issue) && (
                            <button
                              type="button"
                              onClick={() => openEditModal(issue)}
                              className="px-3 py-1 text-xs font-medium border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                            >
                              Edit
                            </button>
                          )}
                          {(variant !== 'scrum' || issue.sprintStatus === 'ACTIVE') &&
                            canDeleteTask(issue) && (
                            <button
                              type="button"
                              onClick={() => setPendingDeleteIssue(issue)}
                              className="px-3 py-1 text-xs font-medium border border-red-200 text-red-600 rounded hover:bg-red-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateIssueModal
          showModal={showCreateModal}
          setShowModal={setShowCreateModal}
          projectId={projectId}
          projectMembers={allMembers}
        />
      )}

      <EditTaskModal
        showModal={!!modalEditIssue}
        onClose={() => setModalEditIssue(null)}
        issue={modalEditIssue}
        projectMembers={allMembers}
      />

      {pendingDeleteIssue && (
        <DeleteConfirmationModal
          showModal={!!pendingDeleteIssue}
          setShowModal={(open) => { if (!open) setPendingDeleteIssue(null); }}
          onConfirm={confirmDelete}
          title="Delete Task"
          message={`Are you sure you want to delete "${pendingDeleteIssue.title}"?`}
          warningMessage="This action cannot be undone. The task will be permanently deleted."
          confirmText="Delete"
          isDeleting={isDeleting}
          itemType="task"
        />
      )}
    </div>
  );
}
