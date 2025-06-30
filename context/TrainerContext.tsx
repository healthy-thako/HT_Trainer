import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase/client';
import { TrainerAPI } from '../lib/supabase/api/trainer';
import type { AuthenticatedTrainer, TrainerDashboardData } from '../types/trainer';
import type { Session, User } from '@supabase/supabase-js';

interface TrainerContextType {
  // Authentication state
  session: Session | null;
  user: User | null;
  trainer: AuthenticatedTrainer | null;
  isLoading: boolean;
  isTrainer: boolean;
  
  // Dashboard data
  dashboardData: TrainerDashboardData | null;
  isDashboardLoading: boolean;
  
  // Actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshTrainerData: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
}

const TrainerContext = createContext<TrainerContextType | undefined>(undefined);

interface TrainerProviderProps {
  children: ReactNode;
}

export function TrainerProvider({ children }: TrainerProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [trainer, setTrainer] = useState<AuthenticatedTrainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<TrainerDashboardData | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);

  const isTrainer = trainer !== null;

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadTrainerData(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadTrainerData(session.user.id);
      } else {
        setTrainer(null);
        setDashboardData(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load trainer data
  const loadTrainerData = async (userId: string) => {
    try {
      setIsLoading(true);
      
      // Validate if user is a trainer
      const isValidTrainer = await TrainerAPI.validateTrainerAuth(userId);
      
      if (!isValidTrainer) {
        console.log('User is not a trainer:', userId);
        setTrainer(null);
        setIsLoading(false);
        return;
      }

      // Get complete trainer data
      const trainerData = await TrainerAPI.getAuthenticatedTrainer(userId);
      
      if (trainerData) {
        setTrainer(trainerData);
        console.log('Trainer data loaded:', trainerData.trainer.name);
        
        // Load dashboard data
        await loadDashboardData(trainerData.trainer.id);
      } else {
        console.error('Failed to load trainer data for user:', userId);
        setTrainer(null);
      }
    } catch (error) {
      console.error('Error loading trainer data:', error);
      setTrainer(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Load dashboard data
  const loadDashboardData = async (trainerId: string) => {
    try {
      setIsDashboardLoading(true);
      const dashboard = await TrainerAPI.getTrainerDashboard(trainerId);
      setDashboardData(dashboard);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsDashboardLoading(false);
    }
  };

  // Sign in function
  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Validate trainer status
        const isValidTrainer = await TrainerAPI.validateTrainerAuth(data.user.id);
        
        if (!isValidTrainer) {
          // Sign out if not a trainer
          await supabase.auth.signOut();
          return { 
            success: false, 
            error: 'This account is not registered as a trainer. Please contact support.' 
          };
        }

        return { success: true };
      }

      return { success: false, error: 'Authentication failed' };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setTrainer(null);
      setDashboardData(null);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh trainer data
  const refreshTrainerData = async () => {
    if (user) {
      await loadTrainerData(user.id);
    }
  };

  // Refresh dashboard data
  const refreshDashboard = async () => {
    if (trainer) {
      await loadDashboardData(trainer.trainer.id);
    }
  };

  const value: TrainerContextType = {
    session,
    user,
    trainer,
    isLoading,
    isTrainer,
    dashboardData,
    isDashboardLoading,
    signIn,
    signOut,
    refreshTrainerData,
    refreshDashboard,
  };

  return (
    <TrainerContext.Provider value={value}>
      {children}
    </TrainerContext.Provider>
  );
}

// Custom hook to use trainer context
export function useTrainer() {
  const context = useContext(TrainerContext);
  if (context === undefined) {
    throw new Error('useTrainer must be used within a TrainerProvider');
  }
  return context;
}

// Hook for authenticated trainer data (throws if not authenticated)
export function useAuthenticatedTrainer() {
  const context = useTrainer();
  
  if (!context.isTrainer || !context.trainer) {
    throw new Error('useAuthenticatedTrainer can only be used when trainer is authenticated');
  }
  
  return {
    ...context,
    trainer: context.trainer, // TypeScript now knows this is not null
  };
} 