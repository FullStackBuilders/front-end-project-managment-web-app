import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, AlertCircle, Mail } from "lucide-react";
import { emailInvitationApi } from "../services/emailInvitationApi";
import ResendConfirmationModal from "./ResendConfirmationModal";
import InviteStatusModal from "./InviteStatusModal";

export default function SendInviteModal({
  showModal,
  setShowModal,
  projectId,
  onInviteSent,
}) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");

  const [showResendModal, setShowResendModal] = useState(false);
  const [resendData, setResendData] = useState(null);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusData, setStatusData] = useState({
    isSuccess: false,
    message: "",
  });

  useEffect(() => {
    if (showModal) {
      setEmail("");
      setError("");
      setEmailError("");
      setIsSubmitting(false);
      setResendData(null);
      setShowResendModal(false);
      setStatusData({ isSuccess: false, message: "" });
      setShowStatusModal(false);
    }
  }, [showModal]);

  const validateEmail = (email) => {
    const emailRegex =
      /^(?:[a-zA-Z0-9_'^&/+-])+(?:\.(?:[a-zA-Z0-9_'^&/+-]+))*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (error) setError("");
    if (emailError) setEmailError("");
    if (value.trim() && !validateEmail(value.trim())) {
      setEmailError("Please enter a valid email");
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }

    if (!validateEmail(email.trim())) {
      setEmailError("Please enter a valid email");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await emailInvitationApi.sendInvitation(
        email.trim(),
        projectId,
        false
      );

      setStatusData({
        isSuccess: true,
        // Use backend message directly, no fallback
        message: response.message
      });

      setShowStatusModal(true);

      if (onInviteSent) onInviteSent(response);
      setShowModal(false);
    } catch (error) {

      if (
        error.isConflict &&
        error.status === 409 &&
        error.data?.details?.canResend
      ) {
        
        setResendData({
          email: error.data.details.email || email.trim(),
          projectId: error.data.details.projectId || projectId,
          message: error.message,
        });

        setShowModal(false); // Close send modal
        setShowResendModal(true); // Open resend modal
      } else {
        setError(error.message || "Failed to send invitation");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirm = async () => {
    if (!resendData) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await emailInvitationApi.sendInvitation(
        resendData.email,
        resendData.projectId,
        true
      );

      setShowResendModal(false);
      setResendData(null);

      setStatusData({
        isSuccess: true,
        // Use backend message directly, no fallback
        message: response.message
      });
      setShowStatusModal(true);

      if (onInviteSent) onInviteSent(response);
    } catch (error) {
      setShowResendModal(false);
      setResendData(null);
      setStatusData({
        isSuccess: false,
        message: error.message || "Failed to resend invitation",
      });
      setShowStatusModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendModalClose = () => {
    setShowResendModal(false);
    setResendData(null);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  const handleStatusModalClose = () => {
    setShowStatusModal(false);
    setStatusData({ isSuccess: false, message: "" });
  };

  return (
    <>
      {/* Send Invitation Modal */}
      {showModal && (
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
            <form onSubmit={handleSubmit} className="p-6" noValidate>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Email Input */}
              <div className="mb-6">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address *
                </label>
                <input
                  type="text"
                  id="email"
                  name="email"
                  value={email}
                  onChange={handleChange}
                  autoComplete="off"
                  noValidate
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                    emailError
                      ? "border-red-400 focus:ring-red-400"
                      : "border-gray-300 focus:ring-primary"
                  } focus:border-transparent`}
                  placeholder="Enter email address"
                />
                {emailError ? (
                  <div className="text-red-600 text-sm mt-1">{emailError}</div>
                ) : (
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
                    "Send Invite"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resend Modal (Always Mounted) */}
      <ResendConfirmationModal
        showModal={showResendModal}
        onClose={handleResendModalClose}
        email={resendData?.email}
        onConfirm={handleResendConfirm}
      />

      {/* Status Modal (Always Mounted) */}
      <InviteStatusModal
        show={showStatusModal}
        isSuccess={statusData.isSuccess}
        message={statusData.message}
        onClose={handleStatusModalClose}
      />
    </>
  );
}