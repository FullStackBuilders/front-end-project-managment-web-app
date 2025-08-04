import ApiService from './ApiService';

export const commentApi = {
  // Get all comments for an issue
  getCommentsByIssue: async (issueId) => {
    try {
      const response = await ApiService.authenticatedRequest(`/api/comments/issue/${issueId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw new Error('Failed to fetch comments');
    }
  },

  // Add comment to issue
  addComment: async (issueId, content) => {
    try {
      const response = await ApiService.authenticatedRequest(`/api/comments/issue/${issueId}`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      return response.data;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw new Error('Failed to add comment');
    }
  }
};