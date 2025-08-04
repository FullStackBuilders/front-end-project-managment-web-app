// components/ProjectJoinSuccessModal.jsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, X } from 'lucide-react';

export default function ProjectJoinSuccessModal({ 
  isOpen, 
  onClose, 
  projectName 
}) {
  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    // Clear any invitation-related data from sessionStorage
    sessionStorage.removeItem('invitationAccepted');
    sessionStorage.removeItem('projectJoined');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-end">
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            Congratulations!
          </CardTitle>
          <CardDescription className="text-lg">
            You have successfully joined the project
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pb-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Project Name:</p>
            <p className="font-semibold text-gray-900">{projectName}</p>
          </div>
          <p className="text-gray-600 mb-6">
            You can now access this project from your dashboard and start collaborating with your team.
          </p>
          <Button 
            onClick={handleClose} 
            className="w-full"
            size="lg"
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}