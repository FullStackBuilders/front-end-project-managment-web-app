import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { projectApi } from '../services/projectApi';

export default function CreateProjectModal({ showModal, setShowModal, onProjectCreated }) {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState([]);
  const [currentTag, setCurrentTag] = useState('');
  const [tagWarning, setTagWarning] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const addTag = () => {
    const trimmedTag = currentTag.trim();
    if (!trimmedTag) return;

    if (tags.includes(trimmedTag)) {
      setTagWarning('This tag already exists');
      return;
    }

    setTags([...tags, trimmedTag]);
    setCurrentTag('');
    setTagWarning('');
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const resetForm = () => {
    setProjectName('');
    setDescription('');
    setCategory('');
    setTags([]);
    setCurrentTag('');
    setTagWarning('');
    setError('');
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    
    // Validate category is not empty or just whitespace/tabs
    const trimmedCategory = category.replace(/[\s\t]+/g, ' ').trim();
    if (!trimmedCategory) {
      setError('Category cannot be empty or contain only spaces/tabs');
      setCreating(false);
      return;
    }
    
    try {
      await projectApi.createProject({
        name: projectName,
        description,
        category: trimmedCategory,
        tags,
      });
      setShowModal(false);
      resetForm();
      if (onProjectCreated) onProjectCreated();
    } catch (err) {
      setError(err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Create New Project</h2>
          <button
            className="text-gray-400 hover:text-gray-600 transition-colors"
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Project Name *</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              required
              placeholder="Enter project name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              rows="3"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              placeholder="Enter project description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={category}
              onChange={e => setCategory(e.target.value)}
              required
              placeholder="Enter project category (e.g., Full Stack, Mobile, DevOps)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tags</label>
            <div className="flex gap-2 mb-1">
              <input
                type="text"
                className={`flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 ${
                  tagWarning ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-primary'
                }`}
                value={currentTag}
                onChange={e => {
                  const value = e.target.value;
                  setCurrentTag(value);
                  if (tags.includes(value.trim())) {
                    setTagWarning('This tag already exists');
                  } else {
                    setTagWarning('');
                  }
                }}
                onKeyPress={handleKeyPress}
                placeholder="Enter a tag"
              />
              <Button
                type="button"
                onClick={addTag}
                variant="outline"
                disabled={!currentTag.trim() || tags.includes(currentTag.trim())}
              >
                Add
              </Button>
            </div>
            {tagWarning && (
              <div className="text-red-600 text-sm mb-1">{tagWarning}</div>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-blue-600 hover:text-blue-800 ml-1"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}