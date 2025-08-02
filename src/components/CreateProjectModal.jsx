import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, AlertCircle, Mail } from 'lucide-react';
import { emailInvitationApi } from '../services/emailInvitationApi';

export default function SendInviteModal({ showModal, setShowModal, projectId, onInviteSent }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email) => {
    // Industry standard email validation regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(email)) {
      return false;
    }
    
    // Additional checks for real-world validation
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    
    const [localPart, domain] = parts;
    
    // Local part validations
    if (localPart.length === 0 || localPart.length > 64) return false;
    if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
    if (localPart.includes('..')) return false;
    
    // Domain validations
    if (domain.length === 0 || domain.length > 253) return false;
    if (domain.startsWith('.') || domain.endsWith('.')) return false;
    if (domain.includes('..')) return false;
    
    // Domain must have at least one dot and proper TLD
    const domainParts = domain.split('.');
    if (domainParts.length < 2) return false;
    
    // TLD should be at least 2 characters
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2) return false;
    
    return true;
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear errors when user starts typing
    if (error) setError('');
    if (emailError) setEmailError('');
    
    // Real-time email validation
    if (value.trim() && !validateEmail(value.trim())) {
      setEmailError('Invalid email address');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email.trim())) {
      setEmailError('Invalid email address');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await emailInvitationApi.sendInvitation(email.trim(), projectId);
      
      // Call success callback
      if (onInviteSent) {
        onInviteSent();
      }
      
      // Close modal and reset form
      setShowModal(false);
      setEmail('');
      setEmailError('');
    } catch (error) {
      // Extract error message from backend response
      const errorMessage = error.message || 'Failed to send invitation';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setEmail('');
    setError('');
    setEmailError('');
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Send Invitation
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Email Input */}
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="text"
              id="email"
              name="email"
              value={email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                emailError ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-primary'
              } focus:border-transparent`}
              placeholder="Enter email address"
            />
            {emailError && (
              <div className="text-red-600 text-sm mt-1">{emailError}</div>
            )}
            {!emailError && (
              <p className="text-xs text-gray-500 mt-1">
                An invitation link will be sent to this email address
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || !email.trim() || emailError}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                'Send Invite'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}