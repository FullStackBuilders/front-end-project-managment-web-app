import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import invitationApi from '../services/invitationApi'; // Add this import

export default function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.invitationEmail) {
      setFormData(prev => ({ ...prev, email: location.state.invitationEmail }));
    }
  }, [location.state]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError('');
  };

  const emailRegex = /^(?:[a-zA-Z0-9_'^&/+-])+(?:\.(?:[a-zA-Z0-9_'^&/+-]+))*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const validateForm = () => {
    // Validate first name
    if (!formData.firstName.trim()) {
      setError('Please enter your first name');
      return false;
    }

    // Validate last name
    if (!formData.lastName.trim()) {
      setError('Please enter your last name');
      return false;
    }

    // Validate email
    if (!emailRegex.test(formData.email)) {
      setError('Please enter valid email');
      return false;
    }

    // Validate password
    if (!strongPasswordRegex.test(formData.password)) {
      setError(
        'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character'
      );
      return false;
    }

    // Validate confirm password
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  // New function to handle invitation acceptance after registration
  const handleInvitationAfterRegistration = async (userEmail) => {
    const invitationToken = sessionStorage.getItem('invitationToken');
    
    if (invitationToken) {
      try {
        console.log('Accepting invitation with token:', invitationToken, 'for email:', userEmail);
        const response = await invitationApi.acceptInvitation(invitationToken, userEmail);
        console.log('Invitation acceptance response:', response);
        
        const acceptanceData = response.data;

        // Store project information for success modal
        sessionStorage.setItem('invitationAccepted', 'true');
        sessionStorage.setItem('projectJoined', acceptanceData.projectName);

        // Clear invitation token since it's been used
        sessionStorage.removeItem('invitationToken');
        sessionStorage.removeItem('pendingInvitation');
        sessionStorage.removeItem('invitationProjectName');
        
        console.log('Successfully stored invitation acceptance data');
        return true;
      } catch (err) {
        console.error('Failed to accept invitation after registration:', err);
        // Don't throw here - let the user proceed to dashboard
        return false;
      }
    } else {
      console.log('No invitation token found in sessionStorage');
    }
    return false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      const { confirmPassword, ...registrationData } = formData;
      console.log('Starting registration process...');
      
      const { response, userInfo } = await register(registrationData);
      console.log('Registration successful, userInfo:', userInfo);
      
      // Check if there's a pending invitation to handle
      const pendingInvitation = sessionStorage.getItem('pendingInvitation');
      console.log('Pending invitation status:', pendingInvitation);
      
      if (pendingInvitation === 'true' && userInfo?.email) {
        console.log('Processing pending invitation for:', userInfo.email);
        // Try to accept the invitation with the newly registered user's email
        const invitationResult = await handleInvitationAfterRegistration(userInfo.email);
        console.log('Invitation processing result:', invitationResult);
      }
      
      // Always navigate to dashboard
      console.log('Navigating to dashboard...');
      navigate('/dashboard');
      
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-6">
      {/* Header */}
      <div className="absolute top-6 left-6">
        <h1 className="text-xl font-bold text-gray-800">TeamBoard</h1>
        <p className="text-sm text-gray-500">Manage your projects efficiently with our powerful tools</p>
      </div>

      {/* Show invitation banner if coming from invitation */}
      {location.state?.showInvitationBanner && (
        <div className="w-full max-w-md mb-4 mt-16">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm text-center">
              <strong>You're joining:</strong> {location.state.projectName}
            </p>
          </div>
        </div>
      )}

      <Card className="w-full max-w-md mt-4">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Create an account
          </CardTitle>
          <CardDescription className="text-center">
            {location.state?.showInvitationBanner 
              ? "Create your account to join the project"
              : "Join us to manage your projects efficiently"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="text"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading || location.state?.invitationEmail} // Disable if pre-filled from invitation
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  autoComplete="off"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                  autoComplete="off"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 
               location.state?.showInvitationBanner ? 'Create Account & Join Project' : 'Create Account'}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}