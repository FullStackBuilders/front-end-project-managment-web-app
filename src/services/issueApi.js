import ApiService from './ApiService';

export const issueApi = {
  // Get all issues for a project
  getIssuesByProjectId: async (projectId) => {
    try {
      const response = await ApiService.get(`/api/issues/project/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching issues:', error);
      throw new Error('Failed to fetch issues');
    }
  },

  // Get single issue by ID
  getIssueById: async (issueId) => {
    try {
      const response = await ApiService.get(`/api/issues/${issueId}`);
      return response;
    } catch (error) {
      console.error('Error fetching issue:', error);
      throw new Error('Failed to fetch issue');
    }
  },

  // Create new issue
  createIssue: async (projectId, issueData) => {
    try {
      const response = await ApiService.post(`/api/issues/${projectId}`, issueData);
      return response.data;
    } catch (error) {
      console.error('Error creating issue:', error);
      throw new Error('Failed to create issue');
    }
  },

  // Update issue
  updateIssue: async (issueId, issueData) => {
    try {
      const response = await ApiService.put(`/api/issues/${issueId}`, issueData);
      return response.data;
    } catch (error) {
      console.error('Error updating issue:', error);
      throw new Error('Failed to update issue');
    }
  },

  // Delete issue
  deleteIssue: async (issueId) => {
    try {
      const response = await ApiService.delete(`/api/issues/${issueId}`);
      return response;
    } catch (error) {
      console.error('Error deleting issue:', error);
      throw new Error('Failed to delete issue');
    }
  },

  // Add assignee to issue
  addAssigneeToIssue: async (issueId, userId) => {
    try {
      const response = await ApiService.put(`/api/issues/${issueId}/assignee/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error adding assignee:', error);
      throw new Error('Failed to add assignee');
    }
  },

  // Update issue status
  updateIssueStatus: async (issueId, status) => {
    try {
      const response = await ApiService.put(`/api/issues/${issueId}/status/${status}`);
      return response.data;
    } catch (error) {
      console.error('Error updating issue status:', error);
      throw new Error('Failed to update issue status');
    }
  }
};