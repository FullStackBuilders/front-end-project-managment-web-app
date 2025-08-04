import { createContext, useContext, useState, useEffect } from 'react';
import AuthService from '../services/AuthService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = AuthService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        const userInfo = AuthService.getCurrentUser();
        setUser(userInfo);
        
        // if (process.env.NODE_ENV === 'development') {
        //   AuthService.debugTokenInfo();
        // }
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      setIsLoading(true);
      const response = await AuthService.login(credentials);
      
      AuthService.setToken(response.accessToken);
      const userInfo = AuthService.getCurrentUser();
      
      setUser(userInfo);
      setIsAuthenticated(true);
      
      return { response, userInfo };
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      const response = await AuthService.register(userData);
      
      AuthService.setToken(response.accessToken);
      const userInfo = AuthService.getCurrentUser();
      
      setUser(userInfo);
      setIsAuthenticated(true);
      
      return { response, userInfo };
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    AuthService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  const isCreator = (createdById) => {
    return AuthService.isCurrentUserCreator(createdById);
  };

  const refreshUser = () => {
    if (AuthService.isAuthenticated()) {
      const userInfo = AuthService.getCurrentUser();
      setUser(userInfo);
    }
  };

  const value = {
    isAuthenticated,
    isLoading,
    user,
    login,
    register,
    logout,
    isCreator,
    refreshUser,
    getCurrentUserId: () => AuthService.getCurrentUserId(),
    getCurrentUsername: () => AuthService.getCurrentUsername(),
    getTokenExpirationTime: () => AuthService.getTokenExpirationTime(),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};