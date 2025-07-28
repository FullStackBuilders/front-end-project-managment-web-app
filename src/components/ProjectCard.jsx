import { Eye, Trash2, Users, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { projectApi } from '../services/projectApi';

export default function ProjectCard({ project, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await projectApi.deleteProject(project.id);
      if (onDelete) {
        onDelete(project.id);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      // You might want to show a toast notification here
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleView = () => {
    // Navigate to project details page
    // For now, we'll just log it
    console.log('Viewing project:', project.id);
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
        {/* Project Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
            {project.name}
          </h3>
          <p className="text-gray-600 text-sm line-clamp-2 mb-3">
            {project.description}
          </p>
        </div>

        {/* Project Details */}
        <div className="space-y-3 mb-4">
          {/* Category */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600">{project.category}</span>
          </div>

          {/* Team Size */}
          <div className="flex items-center gap-2 text-gray-600">
            <Users size={16} />
            <span className="text-sm">
              {project.team ? project.team.length : 0} member{project.team?.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <div className="flex items-start gap-2">
              <Tag size={16} className="text-gray-400 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {project.tags.slice(0, 3).map((tag, index) => (
                  <span 
                    key={index}
                    className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
                {project.tags.length > 3 && (
                  <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                    +{project.tags.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-gray-100">
          <Button 
            onClick={handleView}
            className="flex-1 flex items-center justify-center gap-2"
            size="sm"
          >
            <Eye size={16} />
            View
          </Button>
          <Button 
            onClick={() => setShowDeleteConfirm(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
          >
            <Trash2 size={16} />
            Delete
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Project
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{project.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}