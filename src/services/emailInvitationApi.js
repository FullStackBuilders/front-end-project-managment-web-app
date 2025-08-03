import ApiService from './ApiService';

export const emailInvitationApi = {
  // Send email invitation to join project (handles both new and resend)
  sendInvitation: (email, projectId, forceResend = false) => {
    return ApiService.authenticatedRequest('/api/invitations/send', {
      method: 'POST',
      body: JSON.stringify({
        email,
        projectId,
        forceResend
      }),
    });
  }
};
