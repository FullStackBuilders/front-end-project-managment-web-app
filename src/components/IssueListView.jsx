import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Flag, SlidersHorizontal, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatSmartTimestamp } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';
import {
  updateIssue,
  updateIssueStatus,
  addAssignee,
  deleteIssue,
  selectFilteredIssues,
} from '../store/issueSlice';
import CreateIssueModal from './CreateIssueModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import ErrorModal from './ErrorModal';

const COLUMN_DEFINITIONS = [
  { id: 'name',         label: 'Name',           defaultVisible: true  },
  { id: 'status',       label: 'Status',         defaultVisible: true  },
  { id: 'priority',     label: 'Priority',       defaultVisible: true  },
  { id: 'assignedTo',   label: 'Assigned To',    defaultVisible: true  },
  { id: 'createdBy',    label: 'Created By',     defaultVisible: true  },
  { id: 'dueDate',      label: 'Due Date',       defaultVisible: true  },
  { id: 'description',  label: 'Description',    defaultVisible: true  },
  { id: 'lastEditedBy', label: 'Last Edited By', defaultVisible: false },
  { id: 'lastEditedAt', label: 'Last Edited At', defaultVisible: false },
];

const SORTABLE_COLUMNS = new Set([
  'name', 'priority', 'assignedTo', 'createdBy', 'dueDate', 'lastEditedBy', 'lastEditedAt',
]);

// Lower number = sorts first when ascending (High → Medium → Low)
const PRIORITY_ORDER = { HIGH: 1, MEDIUM: 2, LOW: 3 };

// First-click direction: 'asc' for most columns, 'desc' for "newest first" timestamp
const SORT_DEFAULT_DIR = { lastEditedAt: 'desc' };

const getSortValue = (issue, col) => {
  switch (col) {
    case 'name':         return (issue.title || '').toLowerCase();
    case 'priority':     return PRIORITY_ORDER[issue.priority] ?? 99;
    case 'assignedTo':   return (issue.assigneeName || '').toLowerCase();
    case 'createdBy':    return (issue.createdByName || '').toLowerCase();
    case 'dueDate':      return issue.dueDate
                           ? new Date(issue.dueDate + 'T00:00:00').getTime()
                           : Infinity;   // nulls last when ascending
    case 'lastEditedBy': return (issue.lastEditedByName || '').toLowerCase();
    case 'lastEditedAt': return issue.lastEditedAt
                           ? new Date(issue.lastEditedAt).getTime()
                           : 0;         // never-edited sorts oldest
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

const STATUS_OPTIONS = ['TO_DO', 'IN_PROGRESS', 'DONE'];
const PRIORITY_OPTIONS = ['HIGH', 'MEDIUM', 'LOW'];

const STATUS_LABELS = { TO_DO: 'TO DO', IN_PROGRESS: 'IN PROGRESS', DONE: 'DONE' };
const STATUS_COLORS = {
  TO_DO: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  DONE: 'bg-green-100 text-green-700',
};
const PRIORITY_COLORS = {
  HIGH: 'bg-red-100 text-red-700 border-red-200',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  LOW: 'bg-green-100 text-green-700 border-green-200',
};

function Badge({ value, colorMap, withFlag = false, withBorder = false, labelMap = null }) {
  const displayValue = labelMap?.[value] || value;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${withBorder ? 'border' : ''} ${colorMap[value] || 'bg-gray-100 text-gray-600'}`}
    >
      {withFlag && <Flag className="w-3 h-3 mr-1" />}
      {displayValue}
    </span>
  );
}

function TruncatedCell({ value, issueId, field, expandedCell, setExpandedCell }) {
  const isExpanded = expandedCell?.issueId === issueId && expandedCell?.field === field;
  const triggerRef = useRef(null);
  const popupRef   = useRef(null);

  // Close when clicking outside both the trigger and the portal popup
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

  // Calculate position inline — no state needed, ref is always available from previous render
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
        title={value || '—'}
        onClick={(e) => {
          e.stopPropagation();
          if (value) setExpandedCell(isExpanded ? null : { issueId, field });
        }}
      >
        {value || <span className="text-gray-400">—</span>}
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

function memberFullName(member) {
  return `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email || `User #${member.id}`;
}

export default function IssueListView({ projectId }) {
  const dispatch = useDispatch();
  const { isCreator, isProjectOwner } = useAuth();
  const issues = useSelector(selectFilteredIssues);
  const { currentProject } = useSelector((state) => state.project);

  const [editingRowId, setEditingRowId] = useState(null);
  const [editingValues, setEditingValues] = useState({});
  const [expandedCell, setExpandedCell] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pendingDeleteIssue, setPendingDeleteIssue] = useState(null);
  const [saveError, setSaveError] = useState(null);   // string | null
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [sortCol, setSortCol] = useState(null);  // column id or null
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(`teamboard_list_cols_${projectId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return Object.fromEntries(COLUMN_DEFINITIONS.map((c) => [c.id, c.defaultVisible]));
  });
  const [colsOpen, setColsOpen] = useState(false);

  const containerRef = useRef(null);
  const colsRef = useRef(null);

  // Build deduplicated member list: owner first, then team
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

  // Close expanded cell on outside click
  useEffect(() => {
    const handleMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setExpandedCell(null);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // Persist column visibility to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`teamboard_list_cols_${projectId}`, JSON.stringify(visibleColumns));
  }, [visibleColumns, projectId]);

  // Close the columns dropdown on outside click
  useEffect(() => {
    if (!colsOpen) return;
    const handler = (e) => { if (!colsRef.current?.contains(e.target)) setColsOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [colsOpen]);

  const canEditOrDelete = (issue) =>
    isCreator(issue.createdById) || isProjectOwner(issue.projectOwnerId);

  const showActionsColumn = useMemo(
    () => issues.some((issue) => canEditOrDelete(issue)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [issues]
  );

  const isOverdue = (issue) =>
    issue.dueDate &&
    issue.status !== 'DONE' &&
    new Date(issue.dueDate + 'T00:00:00') < new Date();

  const toggleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir(SORT_DEFAULT_DIR[col] ?? 'asc');
    }
  };

  const startEdit = (issue) => {
    setSaveError(null);
    setExpandedCell(null);
    setEditingRowId(issue.id);
    setEditingValues({
      title: issue.title || '',
      description: issue.description || '',
      priority: issue.priority || 'MEDIUM',
      dueDate: issue.dueDate ? issue.dueDate.split('T')[0] : '',
      status: issue.status || 'TO_DO',
      // Store as string for controlled select comparison; '' = None
      assigneeId: issue.assigneeId != null ? String(issue.assigneeId) : '',
    });
  };

  const cancelEdit = () => {
    setEditingRowId(null);
    setEditingValues({});
    setSaveError(null);
  };

  const saveEdit = async (issue) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await dispatch(
        updateIssue({
          issueId: issue.id,
          issueData: {
            title: editingValues.title,
            description: editingValues.description,
            priority: editingValues.priority,
            dueDate: editingValues.dueDate || null,
          },
        })
      ).unwrap();

      if (editingValues.status !== issue.status) {
        await dispatch(
          updateIssueStatus({ issueId: issue.id, status: editingValues.status })
        ).unwrap();
      }

      const originalAssigneeId = issue.assigneeId != null ? String(issue.assigneeId) : '';
      if (editingValues.assigneeId && editingValues.assigneeId !== originalAssigneeId) {
        await dispatch(
          addAssignee({ issueId: issue.id, userId: editingValues.assigneeId })
        ).unwrap();
      }

      setEditingRowId(null);
      setEditingValues({});
    } catch (err) {
      const msg = err?.message || String(err) || 'Failed to save changes. Please try again.';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeleteIssue) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteIssue(pendingDeleteIssue.id)).unwrap();
      setPendingDeleteIssue(null);
    } catch {
      // delete errors are surfaced via Redux state if needed
    } finally {
      setIsDeleting(false);
    }
  };

  const col = (id) => visibleColumns[id] ?? true;

  // mm/dd/yyyy
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const [year, month, day] = dateStr.split('T')[0].split('-');
      return `${month}/${day}/${year}`;
    } catch {
      return dateStr;
    }
  };


  return (
    <div ref={containerRef} onClick={() => setExpandedCell(null)} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header row */}
      <div className="flex justify-between items-center mb-4">
        {/* Column visibility toggle */}
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
              {COLUMN_DEFINITIONS.map((c) => (
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

        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Task
        </Button>
      </div>

      {issues.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-white rounded-lg border border-gray-200">
          <p className="text-base font-medium mb-1">No tasks yet</p>
          <p className="text-sm">Create a task to get started.</p>
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
                {col('lastEditedBy') && (
                  <th
                    onClick={() => toggleSort('lastEditedBy')}
                    className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100"
                  >
                    <span className="flex items-center gap-1">Last Edited By <SortIcon col="lastEditedBy" sortCol={sortCol} sortDir={sortDir} /></span>
                  </th>
                )}
                {col('lastEditedAt') && (
                  <th
                    onClick={() => toggleSort('lastEditedAt')}
                    className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap cursor-pointer select-none hover:bg-gray-100"
                  >
                    <span className="flex items-center gap-1">Last Edited At <SortIcon col="lastEditedAt" sortCol={sortCol} sortDir={sortDir} /></span>
                  </th>
                )}
                {showActionsColumn && (
                  <th className="px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedIssues.map((issue) => {
                const editing = editingRowId === issue.id;
                const overdue = isOverdue(issue);
                const rowBg = editing
                  ? 'bg-gray-50'
                  : overdue
                  ? 'bg-red-50'
                  : 'bg-white';

                return (
                  <tr
                    key={issue.id}
                    className={`${rowBg} hover:brightness-[0.98] transition-colors`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* ID */}
                    <td className="px-3 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                      #{issue.id}
                    </td>

                    {/* Name */}
                    {col('name') && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        {editing ? (
                          <input
                            type="text"
                            value={editingValues.title}
                            onChange={(e) =>
                              setEditingValues((v) => ({ ...v, title: e.target.value }))
                            }
                            className="w-40 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        ) : (
                          <TruncatedCell
                            value={issue.title}
                            issueId={issue.id}
                            field="title"
                            expandedCell={expandedCell}
                            setExpandedCell={setExpandedCell}
                          />
                        )}
                      </td>
                    )}

                    {/* Status */}
                    {col('status') && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        {editing ? (
                          <select
                            value={editingValues.status}
                            onChange={(e) =>
                              setEditingValues((v) => ({ ...v, status: e.target.value }))
                            }
                            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge
                            value={issue.status}
                            colorMap={STATUS_COLORS}
                            labelMap={STATUS_LABELS}
                          />
                        )}
                      </td>
                    )}

                    {/* Priority */}
                    {col('priority') && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        {editing ? (
                          <select
                            value={editingValues.priority}
                            onChange={(e) =>
                              setEditingValues((v) => ({ ...v, priority: e.target.value }))
                            }
                            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            {PRIORITY_OPTIONS.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Badge
                            value={issue.priority}
                            colorMap={PRIORITY_COLORS}
                            withFlag
                            withBorder
                          />
                        )}
                      </td>
                    )}

                    {/* Assigned To */}
                    {col('assignedTo') && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        {editing ? (
                          <select
                            value={editingValues.assigneeId}
                            onChange={(e) =>
                              setEditingValues((v) => ({ ...v, assigneeId: e.target.value }))
                            }
                            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="">— None —</option>
                            {allMembers.map((member) => (
                              <option key={member.id} value={String(member.id)}>
                                {memberFullName(member)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <TruncatedCell
                            value={issue.assigneeName}
                            issueId={issue.id}
                            field="assigneeName"
                            expandedCell={expandedCell}
                            setExpandedCell={setExpandedCell}
                          />
                        )}
                      </td>
                    )}

                    {/* Created By */}
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

                    {/* Due Date */}
                    {col('dueDate') && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        {editing ? (
                          <input
                            type="date"
                            value={editingValues.dueDate}
                            onChange={(e) =>
                              setEditingValues((v) => ({ ...v, dueDate: e.target.value }))
                            }
                            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        ) : (
                          <span className={`text-gray-700 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                            {formatDate(issue.dueDate)}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Description */}
                    {col('description') && (
                      <td className="px-3 py-3">
                        {editing ? (
                          <textarea
                            value={editingValues.description}
                            onChange={(e) =>
                              setEditingValues((v) => ({ ...v, description: e.target.value }))
                            }
                            rows={2}
                            className="w-48 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                          />
                        ) : (
                          <TruncatedCell
                            value={issue.description}
                            issueId={issue.id}
                            field="description"
                            expandedCell={expandedCell}
                            setExpandedCell={setExpandedCell}
                          />
                        )}
                      </td>
                    )}

                    {/* Last Edited By */}
                    {col('lastEditedBy') && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        <TruncatedCell
                          value={issue.lastEditedByName || null}
                          issueId={issue.id}
                          field="lastEditedByName"
                          expandedCell={expandedCell}
                          setExpandedCell={setExpandedCell}
                        />
                      </td>
                    )}

                    {/* Last Edited At */}
                    {col('lastEditedAt') && (
                      <td className="px-3 py-3 whitespace-nowrap text-gray-500 text-xs">
                        {formatSmartTimestamp(issue.lastEditedAt) || '—'}
                      </td>
                    )}

                    {/* Actions */}
                    {showActionsColumn && (
                      <td className="px-3 py-3 whitespace-nowrap">
                        {canEditOrDelete(issue) ? (
                          editing ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEdit(issue)}
                                disabled={isSaving}
                                className="px-3 py-1 text-xs font-medium bg-primary text-white rounded hover:opacity-90 disabled:opacity-50"
                              >
                                {isSaving ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={isSaving}
                                className="px-3 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded hover:bg-gray-50 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEdit(issue)}
                                className="px-3 py-1 text-xs font-medium border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setPendingDeleteIssue(issue)}
                                className="px-3 py-1 text-xs font-medium border border-red-200 text-red-600 rounded hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          )
                        ) : null}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Save Error Modal */}
      <ErrorModal
        open={!!saveError}
        onClose={() => setSaveError(null)}
        title="Failed to save changes"
        message={saveError}
        onRetry={null}
      />

      {/* Create Issue Modal */}
      {showCreateModal && (
        <CreateIssueModal
          showModal={showCreateModal}
          setShowModal={setShowCreateModal}
          projectId={projectId}
          editingIssue={null}
          projectMembers={allMembers}
        />
      )}

      {/* Delete Confirmation Modal */}
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
