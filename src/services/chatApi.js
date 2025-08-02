import ApiService from './ApiService';


export const chatApi = {
  // Get all messages for a project
  getChatMessages: async (projectId) => {
    try {
      const response = await ApiService.authenticatedRequest(`/api/chats/project/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      throw new Error('Failed to fetch chat messages');
    }
  },

  // Send message to project chat
  sendMessage: async (projectId, content) => {
    try {
      const response = await ApiService.authenticatedRequest(`/api/chats/project/${projectId}/send`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }
};