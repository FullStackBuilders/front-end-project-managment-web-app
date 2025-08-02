import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isLoading: false,
  error: null,
  invitationResponse: null,
  showResendModal: false,
  pendingInvitation: null, // Store invitation details for resend
};

const invitationSlice = createSlice({
  name: 'invitation',
  initialState,
  reducers: {
    // Send invitation actions
    sendInvitationStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    sendInvitationSuccess: (state, action) => {
      state.isLoading = false;
      state.invitationResponse = action.payload;
      state.error = null;
    },
    sendInvitationFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
      state.invitationResponse = null;
    },
    
    // Conflict handling (invitation already sent)
    invitationConflict: (state, action) => {
      state.isLoading = false;
      state.showResendModal = true;
      state.pendingInvitation = action.payload; // {email, projectId, message}
      state.error = null;
    },
    
    // Resend modal actions
    showResendModal: (state, action) => {
      state.showResendModal = true;
      state.pendingInvitation = action.payload; // {email, projectId, message}
    },
    hideResendModal: (state) => {
      state.showResendModal = false;
      state.pendingInvitation = null;
    },
    
    // Reset state
    resetInvitationState: (state) => {
      state.error = null;
      state.invitationResponse = null;
      state.showResendModal = false;
      state.pendingInvitation = null;
      state.isLoading = false;
    },
  },
});

export const {
  sendInvitationStart,
  sendInvitationSuccess,
  sendInvitationFailure,
  invitationConflict,
  showResendModal,
  hideResendModal,
  resetInvitationState,
} = invitationSlice.actions;

export default invitationSlice.reducer;