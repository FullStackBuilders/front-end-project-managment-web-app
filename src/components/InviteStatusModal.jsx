import { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

export default function InviteStatusModal({ show, isSuccess, message, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      // Auto close after 3 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => onClose(), 300); // Wait for animation to complete
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div 
        className={`bg-white rounded-lg shadow-xl p-8 mx-4 max-w-sm w-full text-center transform transition-all duration-300 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Animated Icon */}
        <div className="mb-4 flex justify-center">
          {isSuccess ? (
            <div className="relative">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500 animate-bounce" />
              </div>
              {/* Success ring animation */}
              <div className="absolute inset-0 w-16 h-16 bg-green-500 rounded-full opacity-20 animate-ping"></div>
            </div>
          ) : (
            <div className="relative">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500 animate-pulse" />
              </div>
              {/* Error ring animation */}
              <div className="absolute inset-0 w-16 h-16 bg-red-500 rounded-full opacity-20 animate-ping"></div>
            </div>
          )}
        </div>

        {/* Message */}
        <h3 className={`text-lg font-semibold mb-2 ${isSuccess ? 'text-green-700' : 'text-red-700'}`}>
          {isSuccess ? 'Success!' : 'Error!'}
        </h3>
        <p className="text-gray-600 text-sm">
          {message}
        </p>

        {/* Progress bar */}
        <div className="mt-4 w-full bg-gray-200 rounded-full h-1">
          <div 
            className={`h-1 rounded-full ${isSuccess ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}
            style={{
              width: '100%',
              animation: 'progress 3s linear forwards'
            }}
          ></div>
        </div>

        <style jsx>{`
          @keyframes progress {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      </div>
    </div>
  );
}