// pages/AcceptInvitation.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Tag, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import invitationApi from '../services/invitationApi';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const [invitationData, setInvitationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  const token = searchParams.get('token');

  // Get invitation details on component mount
  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link - no token provided');
      setLoading(false);
      return;
    }

    fetchInvitationDetails();
  }, [token]);

  const fetchInvitationDetails = async () => {
    try {
      setLoading(true);
      const response = await invitationApi.getInvitationDetails(token);
      setInvitationData(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load invitation details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async (userEmail) => {
    try {
      setAccepting(true);
      setError('');

      const response = await invitationApi.acceptInvitation(token, userEmail);
      const acceptanceData = response.data;

      // Store project information for success modal
      sessionStorage.setItem('invitationAccepted', 'true');
      sessionStorage.setItem('projectJoined', acceptanceData.projectName);

      if (acceptanceData.userExists) {
        // User exists and was added to project - redirect to dashboard
        navigate('/dashboard');
      } else {
        // User doesn't exist - show registration banner
        navigate('/register', { 
          state: { 
            invitationEmail: userEmail,
            projectName: acceptanceData.projectName,
            showInvitationBanner: true 
          } 
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const handleLoginRedirect = () => {
    // Store invitation context for after login
    sessionStorage.setItem('pendingInvitation', 'true');
    sessionStorage.setItem('invitationToken', token);
    sessionStorage.setItem('invitationProjectName', invitationData.projectName);
    
    navigate('/login', { 
      state: { 
        showInvitationBanner: true,
        projectName: invitationData.projectName,
        email: invitationData.email
      } 
    });
  };

  const handleRegisterRedirect = () => {
    navigate('/register', { 
      state: { 
        invitationEmail: invitationData?.email || '',
        projectName: invitationData.projectName,
        showInvitationBanner: true 
      } 
    });
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Loading invitation details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <CardTitle className="text-red-600">Invitation Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-6">{error}</p>
            <Button asChild>
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Project Management Application</h1>
        <p className="text-gray-600">Project Team Invitation</p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Project Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-blue-600">
              You're Invited to Join a Project! 🎉
            </CardTitle>
            <CardDescription className="text-center text-lg">
              {invitationData.ownerName} has invited you to collaborate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Project Info */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="font-bold text-xl text-gray-900 mb-4">
                  {invitationData.projectName}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Category:</span>
                    <span className="font-medium">{invitationData.projectCategory}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Team Size:</span>
                    <span className="font-medium">{invitationData.teamSize} members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Project Owner:</span>
                    <span className="font-medium">{invitationData.ownerName}</span>
                  </div>
                </div>

                {invitationData.projectDescription && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Description:</p>
                    <p className="text-gray-800">{invitationData.projectDescription}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons based on authentication status */}
              <div className="space-y-4">
                {isAuthenticated ? (
                  // User is logged in - direct accept
                  <div className="text-center">
                    <p className="text-gray-600 mb-4">
                      Logged in as: <span className="font-medium">{user.email}</span>
                    </p>
                    <Button
                      onClick={() => handleAcceptInvitation(user.email)}
                      disabled={accepting || !user?.email}
                      size="lg"
                      className="w-full md:w-auto px-8"
                    >
                      {accepting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Joining Project...
                        </>
                      ) : (
                        'Accept Invitation & Join Project'
                      )}
                    </Button>
                  </div>
                ) : (
                  // User not logged in - show login/register options
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h4 className="font-semibold text-yellow-800 mb-2">
                      Please log in or create an account to join this project
                    </h4>
                    <p className="text-yellow-700 mb-4 text-sm">
                      You need to be logged in to accept project invitations and collaborate with your team.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        onClick={handleLoginRedirect}
                        variant="default"
                        className="flex-1"
                      >
                        Login to Accept
                      </Button>
                      <Button 
                        onClick={handleRegisterRedirect}
                        variant="outline"
                        className="flex-1"
                      >
                        Create Account
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm">
          <p>This invitation was sent from our Project Management System.</p>
          <p>If you didn't expect this invitation, you can safely ignore it.</p>
        </div>
      </div>
    </div>
  );
}