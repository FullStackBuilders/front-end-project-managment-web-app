// services/invitationApi.js
import ApiService from './ApiService';

//const API_BASE_URL = 'http://localhost:8080';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

class InvitationApiService {
  // Send invitation (authenticated)
  async sendInvitation(invitationData) {
    return await ApiService.post('/api/invitations/send', invitationData);
  }

  // Get invitation details
  async getInvitationDetails(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invitations/details/${token}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to get invitation details');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting invitation details:', error);
      throw error;
    }
  }

  // Accept invitation
  async acceptInvitation(token, userEmail) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/invitations/accept/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to accept invitation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  // Process pending invitations after login/registration (authenticated)
  async processPendingInvitations() {
    return await ApiService.post('/api/invitations/process-pending');
  }
}

export default new InvitationApiService();