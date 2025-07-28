import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Project Management
            </h1>
            <p className="text-muted-foreground">
              Welcome to your dashboard - Start managing your projects efficiently with our powerful tools.
            </p>
          </div>
          <div className="flex items-center gap-3">
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