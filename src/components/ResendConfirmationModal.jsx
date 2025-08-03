import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Mail } from 'lucide-react';

export default function ResendConfirmationModal({ 
  showModal, 
  onClose, 
  email, 
  onConfirm 
}) {
  const [isResending, setIsResending] = useState(false);

  const handleConfirm = async () => {
    setIsResending(true);
    try {
      await onConfirm();
    } finally {
      setIsResending(false);
    }
  };

  if (!showModal) {
    return null;
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Invitation Already Sent
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isResending}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-blue-500" />
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Project invitation email to <span className="font-medium text-gray-900">{email}</span> is already sent.
            </p>
            
            <p className="text-sm text-gray-600">
              Do you want to resend?
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isResending}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              className="flex-1"
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Resending...
                </>
              ) : (
                'Resend'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}