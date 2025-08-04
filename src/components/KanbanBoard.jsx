import { useState, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Plus, GripVertical } from 'lucide-react';
import IssueCard from './IssueCard';
import CreateIssueModal from './CreateIssueModal';
import { updateIssueStatus, moveIssue, rollbackIssueMove, clearError } from '../store/issueSlice';
import AuthService from '../services/AuthService';

const COLUMNS = [
  { id: 'TO_DO', title: 'To Do', color: 'bg-gray-100' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-100' },
  { id: 'DONE', title: 'Done', color: 'bg-green-100' }
];

// Sortable Issue Card Component with Drag Handle
function SortableIssueCard({ issue, projectId, onEditIssue }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'rotate-3 shadow-lg z-10' : ''}`}
    >
      {/* Expanded Drag Handle - covers the top portion of the card */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-x-0 top-0 h-8 cursor-grab hover:bg-gray-100 hover:bg-opacity-50 rounded-t-lg z-10 flex items-center justify-center group transition-colors"
        aria-label="Drag to move issue"
      >
        {/* Visual indicator for drag area */}
        <div className="opacity-0 group-hover:opacity-60 transition-opacity">
          <GripVertical className="w-4 h-4 text-gray-500" />
        </div>
      </div>
      
      {/* Issue Card - with top padding to account for drag handle */}
      <div className="pt-8">
        <IssueCard 
          issue={issue} 
          projectId={projectId}
          onEditIssue={onEditIssue}
        />
      </div>
    </div>
  );
}

// Droppable Column Component
function DroppableColumn({ column, issues, projectId, onCreateIssue, onEditIssue }) {
  const {
    setNodeRef,
    isOver,
  } = useSortable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  });

  return (
    <div className="flex flex-col">
      {/* Column Header */}
      <div className={`${column.color} rounded-t-lg p-4 border-b`}>
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-800">{column.title}</h3>
          <span className="text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded-full">
            {issues?.length || 0}
          </span>
        </div>
        
        {/* Create Issue Button - Only for TO_DO column */}
        {column.id === 'TO_DO' && (
          <Button
            onClick={onCreateIssue}
            className="w-full mt-3 flex items-center justify-center gap-2 text-sm"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            Create Issue
          </Button>
        )}
      </div>

      {/* Column Content - Drop Zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[400px] p-4 rounded-b-lg border-l border-r border-b transition-colors ${
          isOver ? 'bg-blue-50 border-blue-300' : 'bg-gray-50'
        }`}
      >
        <SortableContext items={issues?.map(issue => issue.id) || []} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {issues?.map((issue) => (
              <SortableIssueCard
                key={issue.id}
                issue={issue}
                projectId={projectId}
                onEditIssue={onEditIssue}
              />
            ))}
          </div>
        </SortableContext>

        {/* Empty State */}
        {(!issues || issues.length === 0) && (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-sm">No issues</p>
            {column.id === 'TO_DO' && (
              <p className="text-xs mt-1">Create your first issue!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ projectId }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [dragError, setDragError] = useState(null);
  const dispatch = useDispatch();
  
  const { issues, loading, error } = useSelector(state => state.issues);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Clear drag error after 3 seconds
  useEffect(() => {
    if (dragError) {
      const timer = setTimeout(() => {
        setDragError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [dragError]);

  // Remove the general error clearing effect since we're not setting general errors for drag operations anymore

  // Group issues by status
  const groupedIssues = useMemo(() => {
    const grouped = {
      TO_DO: [],
      IN_PROGRESS: [],
      DONE: []
    };

    issues.forEach(issue => {
      if (grouped[issue.status]) {
        grouped[issue.status].push(issue);
      }
    });

    return grouped;
  }, [issues]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    // Find the active issue
    const activeIssue = issues.find(issue => issue.id === activeId);
    if (!activeIssue) {
      return;
    }

    // Store original status for potential rollback
    const originalStatus = activeIssue.status;

    // Determine the target column
    let targetColumn = null;
    
    // Check if dropped directly on a column
    if (COLUMNS.some(col => col.id === overId)) {
      targetColumn = overId;
    } else {
      // Check if dropped on an issue, find its column
      const targetIssue = issues.find(issue => issue.id === overId);
      if (targetIssue) {
        targetColumn = targetIssue.status;
      }
    }

    // If no valid target column found, try to find from over data
    if (!targetColumn && over.data?.current?.type === 'column') {
      targetColumn = over.data.current.column.id;
    }

    // If still no target column or same column, don't proceed
    if (!targetColumn || targetColumn === activeIssue.status) {
      return;
    }

    // Update issue status
    const issueId = parseInt(activeId);
    const newStatus = targetColumn;

    // Optimistically update UI
    dispatch(moveIssue({ issueId, newStatus }));

    // Update on server
    try {
      await dispatch(updateIssueStatus({ issueId, status: newStatus })).unwrap();
      setDragError(null); // Clear any previous drag errors
    } catch (error) {
      // Rollback the optimistic update
      dispatch(rollbackIssueMove({ issueId, originalStatus }));
      
      // Show user-friendly drag-specific error message
      let errorMessage = 'You don\'t have access to update this issue status';
      
      // Keep the original error for debugging but show user-friendly message
      console.error('Failed to update issue status:', error);
      setDragError(errorMessage);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleEditIssue = (issue) => {
    setEditingIssue(issue);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingIssue(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-gray-600">Loading issues...</p>
        </div>
      </div>
    );
  }

  // Find the active issue for drag overlay
  const activeIssue = activeId ? issues.find(issue => issue.id === activeId) : null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Issues Board</h2>
        <div className="text-sm text-gray-500">
          {issues.length} issue{issues.length !== 1 ? 's' : ''} total
        </div>
      </div>

      {/* Error Messages - Only show drag errors here, not general errors */}
      {dragError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{dragError}</p>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map((column) => (
            <DroppableColumn
              key={column.id}
              column={column}
              issues={groupedIssues[column.id]}
              projectId={projectId}
              onCreateIssue={() => setShowCreateModal(true)}
              onEditIssue={handleEditIssue}
            />
          ))}
        </div>

        <DragOverlay>
          {activeIssue ? (
            <div className="rotate-3 shadow-lg">
              <div className="relative">
                <div className="absolute inset-x-0 top-0 h-8 bg-gray-100 rounded-t-lg flex items-center justify-center">
                  <GripVertical className="w-4 h-4 text-gray-500" />
                </div>
                <div className="pt-8">
                  <IssueCard issue={activeIssue} projectId={projectId} />
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Create/Edit Issue Modal */}
      {showCreateModal && (
        <CreateIssueModal
          showModal={showCreateModal}
          setShowModal={handleCloseModal}
          projectId={projectId}
          editingIssue={editingIssue}
        />
      )}
    </div>
  );
}