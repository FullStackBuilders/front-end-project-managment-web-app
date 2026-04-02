import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, X } from 'lucide-react';

export default function ProjectJoinFailedModal({
  isOpen,
  onClose,
  projectName,
  action, // 'log in' | 'sign up'
  buttonLabel = 'Close',
}) {
  if (!isOpen) return null;

  const handleClose = () => {
    sessionStorage.removeItem('invitationJoinFailed');
    sessionStorage.removeItem('invitationFailedProjectName');
    sessionStorage.removeItem('invitationFailedAction');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
            <AlertCircle className="h-16 w-16 text-amber-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-amber-600">
            Unable to Join Project
          </CardTitle>
          <CardDescription className="text-lg">
            You could not be added to this project
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pb-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-800 text-sm">
              You could not be added to{' '}
              <span className="font-semibold">"{projectName}"</span>{' '}
              because the email address to which the project invitation was sent does not
              match the email you used to {action}.
            </p>
          </div>
          <Button
            onClick={handleClose}
            className="w-full"
            size="lg"
          >
            {buttonLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
