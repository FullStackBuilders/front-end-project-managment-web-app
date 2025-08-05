import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../services/userApi';

export default function Header() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const profile = await userApi.getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // Don't show error to user, just continue without profile
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDisplayName = () => {
    if (!userProfile) return '';
    
    if (userProfile.firstName && userProfile.lastName) {
      return `${userProfile.firstName} ${userProfile.lastName}`;
    }
    
    if (userProfile.firstName) {
      return userProfile.firstName;
    }
    
    if (userProfile.lastName) {
      return userProfile.lastName;
    }
    
    return 'User';
  };

  return (
    <header className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              TeamBoard
            </h1>
            <p className="text-muted-foreground">
              Welcome to your dashboard - Start managing your projects efficiently with our powerful tools.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {userProfile && (
              <span className="text-sm text-muted-foreground">
                Hello, {getDisplayName()}!
              </span>
            )}
            <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
              <LogOut size={16} />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}