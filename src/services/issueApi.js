import ApiService from "./ApiService";

export const issueApi = {
  // Get all issues for a project
  getIssuesByProjectId: async (projectId) => {
    try {
      const response = await ApiService.get(`/api/issues/project/${projectId}`);
      // Handle the case where backend returns empty array with success message
      return response.data || [];
    } catch (error) {
      console.error("Error fetching issues:", error);
      // If it's a 404 or "no issues found" scenario, return empty array instead of throwing
      if (error.status === 404 || error.message?.includes("No issues found")) {
        return [];
      }
      throw new Error("Failed to fetch issues");
    }
  },

  // Get single issue by ID
  getIssueById: async (issueId) => {
    try {
      const response = await ApiService.get(`/api/issues/${issueId}`);
      return response;
    } catch (error) {
      console.error("Error fetching issue:", error);
      throw new Error("Failed to fetch issue");
    }
  },

  // Create new issue
  createIssue: async (projectId, issueData) => {
    try {
      const response = await ApiService.post(
        `/api/issues/${projectId}`,
        issueData
      );
      return response.data;
    } catch (error) {
      console.error("Error creating issue:", error);
      throw new Error("Failed to create issue");
    }
  },

  // Update issue
  updateIssue: async (issueId, issueData) => {
    try {
      const response = await ApiService.put(
        `/api/issues/${issueId}`,
        issueData
      );
      return response.data;
    } catch (error) {
      console.error("Error updating issue:", error);
      throw new Error("Failed to update issue");
    }
  },

  // Delete issue
  deleteIssue: async (issueId) => {
    try {
      const response = await ApiService.delete(`/api/issues/${issueId}`);
      return response;
    } catch (error) {
      console.error("Error deleting issue:", error);
      throw new Error("Failed to delete issue");
    }
  },

  // Add assignee to issue
  addAssigneeToIssue: async (issueId, userId) => {
    try {
      const response = await ApiService.put(
        `/api/issues/${issueId}/assignee/${userId}`
      );
      return response.data;
    } catch (error) {
      console.error("Error adding assignee:", error);
      throw new Error("Failed to add assignee");
    }
  },

  getIssueDetailById: async (issueId) => {
    try {
      const response = await ApiService.get(`/api/issues/${issueId}/detail`);
      return response.data;
    } catch (error) {
      console.error("Error fetching issue detail:", error);
      throw new Error("Failed to fetch issue detail");
    }
  },

  // Update issue status
  updateIssueStatus: async (issueId, status) => {
    try {
      const response = await ApiService.put(
        `/api/issues/${issueId}/status/${status}`
      );
      return response.data;
    } catch (error) {
      console.error("Error updating issue status:", error);

      // Provide more specific error messages based on common scenarios
      if (error.status === 401 || error.status === 403) {
        throw new Error("Only the assignee can update the issue status");
      } else if (error.status === 404) {
        throw new Error("Issue not found");
      } else if (error.status === 400) {
        throw new Error("Invalid status value");
      } else {
        throw new Error("Failed to update issue status");
      }
    }
  },
};
