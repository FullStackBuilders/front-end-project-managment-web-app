import ApiService from "./ApiService";

export const issueApi = {
  // Get all issues for a project
  getIssuesByProjectId: async (projectId) => {
    try {
      const response = await ApiService.get(`/api/issues/project/${projectId}`);
      // ApiService returns the parsed backend wrapper object,
      // so response.data contains the actual issues array.
      return response.data ?? [];
    } catch (error) {
      console.error("Error fetching issues:", error);

      // If backend returns a "no issues found" style error or 404,
      // treat it as an empty project for the UI.
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
        issueData,
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
        issueData,
      );
      return response.data;
    } catch (error) {
      console.error("Error updating issue:", error);
      throw error;
    }
  },

  // Delete issue
  deleteIssue: async (issueId) => {
    try {
      const response = await ApiService.delete(`/api/issues/${issueId}`);
      return response;
    } catch (error) {
      console.error("Error deleting issue:", error);
      throw error;
    }
  },

  // Add assignee to issue
  addAssigneeToIssue: async (issueId, userId) => {
    try {
      const response = await ApiService.put(
        `/api/issues/${issueId}/assignee/${userId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error adding assignee:", error);
      throw error;
    }
  },

  removeAssigneeFromIssue: async (issueId) => {
    try {
      const response = await ApiService.delete(`/api/issues/${issueId}/assignee`);
      return response.data;
    } catch (error) {
      console.error("Error removing assignee:", error);
      throw error;
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

  /** Merged activity + comments, newest first (see IssueTimelineData on backend). */
  getIssueTimeline: async (issueId, limit = 200) => {
    try {
      const q = limit != null ? `?limit=${encodeURIComponent(limit)}` : "";
      const response = await ApiService.get(
        `/api/issues/${issueId}/timeline${q}`,
      );
      return response.data ?? { items: [], limit: limit ?? 200 };
    } catch (error) {
      console.error("Error fetching issue timeline:", error);
      throw new Error("Failed to fetch issue timeline");
    }
  },

  assignIssueSprint: async (issueId, sprintId) => {
    try {
      const response = await ApiService.patch(`/api/issues/${issueId}/sprint`, {
        sprintId: sprintId ?? null,
      });
      return response.data;
    } catch (error) {
      console.error("Error assigning sprint:", error);
      throw error;
    }
  },

  // Update issue status
  updateIssueStatus: async (issueId, status) => {
    try {
      const response = await ApiService.put(
        `/api/issues/${issueId}/status/${status}`,
      );
      return response.data;
    } catch (error) {
      console.error("Error updating issue status:", error);
      throw error;
    }
  },

  // Get issue counts for the logged-in user (dashboard stats)
  getIssueCounts: async () => {
    try {
      const response = await ApiService.get("/api/issues/summary");
      return response.data;
    } catch (error) {
      console.error("Error fetching issue summary:", error);
      throw new Error("Failed to fetch issue summary");
    }
  },
};
