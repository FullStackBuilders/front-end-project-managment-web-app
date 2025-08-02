import ApiService from './ApiService';

export const emailInvitationApi = {
  // Send email invitation to join project (handles both new and resend)
  sendInvitation: async (email, projectId, forceResend = false) => {
    try {
      const response = await ApiService.authenticatedRequest('/api/invitations/send', {
        method: 'POST',
        body: JSON.stringify({ 
          email, 
          projectId,
          forceResend 
        }),
      });
      return response;
    } catch (error) {

      if (error.status === 409 && error.data?.details?.canResend) {
        error.isConflict = true;
        throw error;
      }

      throw error;
    }
  }
};
