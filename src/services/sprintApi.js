import ApiService from "./ApiService";

export const sprintApi = {
  listByProject: async (projectId) => {
    try {
      const response = await ApiService.get(`/api/projects/${projectId}/sprints`);
      return response.data ?? [];
    } catch (error) {
      console.error("Error fetching sprints:", error);
      throw new Error(error.message || "Failed to fetch sprints");
    }
  },

  create: async (projectId, body) => {
    try {
      const response = await ApiService.post(
        `/api/projects/${projectId}/sprints`,
        body,
      );
      return response.data;
    } catch (error) {
      console.error("Error creating sprint:", error);
      throw new Error(error.message || "Failed to create sprint");
    }
  },

  /**
   * @param {string|number} projectId
   * @param {number} sprintId
   * @param {{ name: string; goal?: string | null; startDate: string; endDate: string }} body
   */
  update: async (projectId, sprintId, body) => {
    try {
      const response = await ApiService.put(
        `/api/projects/${projectId}/sprints/${sprintId}`,
        body,
      );
      return response.data;
    } catch (error) {
      console.error("Error updating sprint:", error);
      throw new Error(error.message || "Failed to update sprint");
    }
  },

  /**
   * @param {string|number} projectId
   * @param {number} sprintId
   * @param {{ startDate: string; endDate: string } | null} [body] - required when sprint end date is in the past
   */
  start: async (projectId, sprintId, body = null) => {
    try {
      const response = await ApiService.post(
        `/api/projects/${projectId}/sprints/${sprintId}/start`,
        body,
      );
      return response?.data ?? response;
    } catch (error) {
      console.error("Error starting sprint:", error);
      throw new Error(error.message || "Failed to start sprint");
    }
  },

  complete: async (projectId, sprintId) => {
    try {
      const response = await ApiService.post(
        `/api/projects/${projectId}/sprints/${sprintId}/complete`,
        null,
      );
      return response?.data ?? response;
    } catch (error) {
      console.error("Error completing sprint:", error);
      throw new Error(error.message || "Failed to complete sprint");
    }
  },
};
