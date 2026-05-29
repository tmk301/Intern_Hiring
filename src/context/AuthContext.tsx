import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { authApi, isApiError, type ApiUser } from '../lib/api';
import { isRestrictedAccount } from '../lib/roles';

type User = ApiUser;

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, authToken: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  restrictedMessage: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [restrictedMessage, setRestrictedMessage] = useState<string | null>(null);

  const clearSession = useCallback(async () => {
    await supabase.auth.signOut();
    setToken(null);
    setUser(null);
  }, []);

  const handleRestrictedSession = useCallback(async () => {
    await clearSession();
    setRestrictedMessage("auth.restrictedMessage");
  }, [clearSession]);

  const fetchUserProfile = useCallback(async (accessToken: string) => {
    try {
      const userData = await authApi.getMe(accessToken);
      if (isRestrictedAccount(userData)) {
        await handleRestrictedSession();
        return;
      }
      setUser(userData);
    } catch (error) {
      if (isApiError(error) && error.status === 403) {
        await handleRestrictedSession();
        return;
      }

      console.error('Error fetching user profile:', error);
      setUser(null);
    }
  }, [handleRestrictedSession]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && mounted) {
        setToken(session.access_token);
        await fetchUserProfile(session.access_token);
      }
      if (mounted) {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setToken(session.access_token);
        await fetchUserProfile(session.access_token);
      } else {
        setToken(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const login = (userData: User, authToken: string) => {
    setRestrictedMessage(null);
    setUser(userData);
    setToken(authToken);
  };

  const logout = async () => {
    await clearSession();
    setRestrictedMessage(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchUserProfile(token);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div></div>;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshUser, isAuthenticated: !!token, isLoading, restrictedMessage }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
