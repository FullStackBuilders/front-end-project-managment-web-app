import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Eye, Trash2, Users, Tag, Calendar } from 'lucide-react';
import { projectApi } from '../services/projectApi';
import DeleteConfirmationModal from './DeleteConfirmationModal';

export default function ProjectCard({ project, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const navigate = useNavigate();

  const handleView = () => {
    navigate(`/project/${project.id}`);
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await projectApi.deleteProject(project.id);
      onDelete(project.id);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const getProjectWarningMessage = () => {
    const hasIssues = project.issues && project.issues.length > 0;
    const hasTeamMembers = project.team && project.team.length > 1; // more than just owner
    
    let warningParts = [];
    
    if (hasIssues) {
      warningParts.push(`${project.issues.length} issue${project.issues.length !== 1 ? 's' : ''}`);
    }
    
    if (hasTeamMembers) {
      warningParts.push(`${project.team.length} team member${project.team.length !== 1 ? 's' : ''}`);
    }

    let baseMessage = "This action cannot be undone. The project will be permanently deleted from the system.";
    
    if (warningParts.length > 0) {
      baseMessage += ` This will also remove all associated ${warningParts.join(' and ')}.`;
    }
    
    return baseMessage;
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
              {project.name}
            </h3>
            <p className="text-sm text-gray-500">
              Created by {project.owner?.firstName} {project.owner?.lastName}
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 line-clamp-2">
            {project.description || 'No description provided'}
          </p>
        </div>

        {/* Category */}
        <div className="mb-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {project.category}
          </span>
        </div>

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {project.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
              {project.tags.length > 3 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                  +{project.tags.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Team Members */}
        {project.team && project.team.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {project.team.length} member{project.team.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Issues Count */}
        {project.issues && (
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 text-gray-500">📋</div>
              <span className="text-sm text-gray-600">
                {project.issues.length} issue{project.issues.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
          <Button
            onClick={handleView}
            className="flex-1 flex items-center gap-2"
            size="sm"
          >
            <Eye className="w-4 h-4" />
            View Project
          </Button>
          
          <Button
            onClick={handleDeleteClick}
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:border-red-300 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        showModal={showDeleteModal}
        setShowModal={setShowDeleteModal}
        onConfirm={handleDeleteConfirm}
        title="Delete Project"
        message={`Are you sure you want to delete the project "${project.name}"?`}
        warningMessage={getProjectWarningMessage()}
        confirmText="Delete Project"
        isDeleting={isDeleting}
        itemType="project"
      />
    </>
  );
}