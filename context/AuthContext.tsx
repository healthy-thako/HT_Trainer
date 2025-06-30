import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { authApi, trainerApi } from '../lib/supabase/api';
import { User, Trainer, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleUserSession(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await handleUserSession(session.user);
        } else {
          setUser(null);
          setTrainer(null);
          setLoading(false);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const handleUserSession = async (authUser: any) => {
    try {
      // Get user profile
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userError) {
        console.error('Error fetching user profile:', userError);
        setLoading(false);
        return;
      }

      setUser(userProfile);

      // Get trainer profile
      const trainerProfile = await trainerApi.getTrainerProfile(authUser.id);
      setTrainer(trainerProfile);
      
      setLoading(false);
    } catch (error) {
      console.error('Error in handleUserSession:', error);
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      await authApi.signIn(email, password);
      // Session handling will be done by the auth state change listener
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, trainerData: any) => {
    try {
      setLoading(true);
      await authApi.signUp(email, password, trainerData);
      // Session handling will be done by the auth state change listener
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await authApi.signOut();
      setUser(null);
      setTrainer(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateTrainerProfile = async (updates: Partial<Trainer>) => {
    if (!trainer) return;
    
    try {
      const updatedTrainer = await trainerApi.updateTrainerProfile(trainer.id, updates);
      setTrainer(updatedTrainer);
    } catch (error) {
      console.error('Error updating trainer profile:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    trainer,
    loading,
    signIn,
    signUp,
    signOut,
    updateTrainerProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 