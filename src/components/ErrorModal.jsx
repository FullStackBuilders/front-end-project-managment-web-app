import { X, AlertTriangle, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PERMISSION_KEYWORDS = [
  'not authorized',
  'unauthorized',
  'permission',
  'only the creator',
  'only the assignee',
  'forbidden',
];

function isRecoverableError(message) {
  if (!message) return true;
  const lower = message.toLowerCase();
  return !PERMISSION_KEYWORDS.some((kw) => lower.includes(kw));
}

export default function ErrorModal({ open, onClose, title = 'Something went wrong', message, onRetry }) {
  if (!open) return null;

  const recoverable = isRecoverableError(message) && !!onRetry;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              {recoverable ? (
                <WifiOff className="w-4 h-4 text-red-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
            </div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-sm text-gray-700 leading-relaxed">
            {message || 'An unexpected error occurred. Please try again.'}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 pb-5">
          {recoverable ? (
            <>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button size="sm" onClick={onRetry}>
                Try Again
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
