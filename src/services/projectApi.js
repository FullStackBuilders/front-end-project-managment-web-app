import api from './api';

export const projectApi = {
  // Get all projects with optional filters
  getAllProjects: async (category = '', tag = '') => {
    try {
      let url = '/api/projects';
      const params = new URLSearchParams();
      
      if (category) params.append('category', category);
      if (tag) params.append('tag', tag);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await api.authenticatedRequest(url);
      return response;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw new Error('Failed to fetch projects');
    }
  },

  // Get single project by ID
  getProjectById: async (id) => {
    try {
      const response = await api.authenticatedRequest(`/api/projects/${id}`);
      return response;
    } catch (error) {
      console.error('Error fetching project:', error);
      throw new Error('Failed to fetch project');
    }
  },

  // Create new project
  createProject: async (projectData) => {
    try {
      const response = await api.authenticatedRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify(projectData),
      });
      return response;
    } catch (error) {
      console.error('Error creating project:', error);
      throw new Error('Failed to create project');
    }
  },

  // Update existing project
  updateProject: async (id, projectData) => {
    try {
      const response = await api.authenticatedRequest(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(projectData),
      });
      return response;
    } catch (error) {
      console.error('Error updating project:', error);
      throw new Error('Failed to update project');
    }
  },

  // Delete project
  deleteProject: async (id) => {
    try {
      const response = await api.authenticatedRequest(`/api/projects/${id}`, {
        method: 'DELETE',
      });
      return response;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw new Error('Failed to delete project');
    }
  },

  // Search projects by keyword
  searchProjects: async (keyword) => {
    try {
      const response = await api.authenticatedRequest(`/api/projects/search?keyword=${encodeURIComponent(keyword)}`);
      return response;
    } catch (error) {
      console.error('Error searching projects:', error);
      throw new Error('Failed to search projects');
    }
  },

  // Get chat by project ID
  getChatByProjectId: async (projectId) => {
    try {
      const response = await api.authenticatedRequest(`/api/projects/${projectId}/chat`);
      return response;
    } catch (error) {
      console.error('Error fetching project chat:', error);
      throw new Error('Failed to fetch project chat');
    }
  },

  // Send invitation to project
  inviteUserToProject: async (email, projectId) => {
    try {
      const response = await api.authenticatedRequest('/api/projects/invite', {
        method: 'POST',
        body: JSON.stringify({ email, projectId }),
      });
      return response;
    } catch (error) {
      console.error('Error sending invitation:', error);
      throw new Error('Failed to send invitation');
    }
  },

  // Accept project invitation
  acceptInvitation: async (token) => {
    try {
      const response = await api.authenticatedRequest(`/api/projects/accept-invitation?token=${token}`);
      return response;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw new Error('Failed to accept invitation');
    }
  }
};