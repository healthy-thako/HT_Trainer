import { supabase } from '../client';

export interface ClientProfile {
  id: string;
  trainer_id: string;
  name: string;
  email: string;
  phone_number?: string;
  avatar_url?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  height_cm?: number;
  weight_kg?: number;
  fitness_level?: 'beginner' | 'intermediate' | 'advanced';
  fitness_goals?: string[];
  medical_conditions?: string[];
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientProgress {
  id: string;
  client_id: string;
  trainer_id: string;
  date: string;
  weight_kg?: number;
  body_fat_percentage?: number;
  muscle_mass_kg?: number;
  measurements?: {
    chest?: number;
    waist?: number;
    hips?: number;
    arms?: number;
    thighs?: number;
  };
  photos?: string[];
  notes?: string;
  session_count?: number;
  created_at: string;
}

export interface ClientGoal {
  id: string;
  client_id: string;
  trainer_id: string;
  goal_type: 'weight_loss' | 'muscle_gain' | 'strength' | 'endurance' | 'flexibility' | 'other';
  title: string;
  description?: string;
  target_value?: number;
  current_value?: number;
  target_unit?: string;
  target_date?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress_percentage: number;
  milestones?: {
    date: string;
    value: number;
    notes?: string;
  }[];
  created_at: string;
  updated_at: string;
}

export interface ClientOnboardingData {
  personal_info: {
    name: string;
    email: string;
    phone_number?: string;
    age?: number;
    gender?: string;
    height_cm?: number;
    weight_kg?: number;
  };
  fitness_info: {
    fitness_level: string;
    fitness_goals: string[];
    workout_experience?: string;
    preferred_workout_days?: number;
    preferred_workout_time?: string;
    available_equipment?: string[];
  };
  health_info: {
    medical_conditions?: string[];
    injuries?: string[];
    medications?: string[];
    dietary_restrictions?: string[];
    allergies?: string[];
  };
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export class ClientsAPI {
  /**
   * Get all clients for a trainer
   */
  static async getTrainerClients(trainerId: string): Promise<ClientProfile[]> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trainer clients:', error);
      throw error;
    }
  }

  /**
   * Get client by ID
   */
  static async getClientById(clientId: string): Promise<ClientProfile | null> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching client:', error);
      throw error;
    }
  }

  /**
   * Create new client from onboarding data
   */
  static async createClientFromOnboarding(
    trainerId: string,
    onboardingData: ClientOnboardingData
  ): Promise<ClientProfile> {
    try {
      const clientData = {
        trainer_id: trainerId,
        name: onboardingData.personal_info.name,
        email: onboardingData.personal_info.email,
        phone_number: onboardingData.personal_info.phone_number,
        age: onboardingData.personal_info.age,
        gender: onboardingData.personal_info.gender,
        height_cm: onboardingData.personal_info.height_cm,
        weight_kg: onboardingData.personal_info.weight_kg,
        fitness_level: onboardingData.fitness_info.fitness_level,
        fitness_goals: onboardingData.fitness_info.fitness_goals,
        medical_conditions: onboardingData.health_info.medical_conditions,
        emergency_contact: onboardingData.emergency_contact,
        onboarding_completed: true,
      };

      const { data, error } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (error) throw error;

      // Create initial progress entry if weight is provided
      if (onboardingData.personal_info.weight_kg) {
        await this.addClientProgress(data.id, trainerId, {
          weight_kg: onboardingData.personal_info.weight_kg,
          notes: 'Initial measurement from onboarding',
        });
      }

      return data;
    } catch (error) {
      console.error('Error creating client from onboarding:', error);
      throw error;
    }
  }

  /**
   * Update client profile
   */
  static async updateClientProfile(
    clientId: string,
    updates: Partial<ClientProfile>
  ): Promise<ClientProfile | null> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', clientId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating client profile:', error);
      throw error;
    }
  }

  /**
   * Get client progress history
   */
  static async getClientProgress(clientId: string, limit?: number): Promise<ClientProgress[]> {
    try {
      let query = supabase
        .from('client_progress')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching client progress:', error);
      throw error;
    }
  }

  /**
   * Add client progress entry
   */
  static async addClientProgress(
    clientId: string,
    trainerId: string,
    progressData: Omit<ClientProgress, 'id' | 'client_id' | 'trainer_id' | 'created_at'>
  ): Promise<ClientProgress> {
    try {
      const { data, error } = await supabase
        .from('client_progress')
        .insert({
          client_id: clientId,
          trainer_id: trainerId,
          date: progressData.date || new Date().toISOString().split('T')[0],
          ...progressData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding client progress:', error);
      throw error;
    }
  }

  /**
   * Get client goals
   */
  static async getClientGoals(clientId: string): Promise<ClientGoal[]> {
    try {
      const { data, error } = await supabase
        .from('client_goals')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching client goals:', error);
      throw error;
    }
  }

  /**
   * Create client goal
   */
  static async createClientGoal(
    clientId: string,
    trainerId: string,
    goalData: Omit<ClientGoal, 'id' | 'client_id' | 'trainer_id' | 'created_at' | 'updated_at'>
  ): Promise<ClientGoal> {
    try {
      const { data, error } = await supabase
        .from('client_goals')
        .insert({
          client_id: clientId,
          trainer_id: trainerId,
          ...goalData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating client goal:', error);
      throw error;
    }
  }

  /**
   * Update client goal progress
   */
  static async updateClientGoalProgress(
    goalId: string,
    currentValue: number,
    notes?: string
  ): Promise<ClientGoal | null> {
    try {
      // First get the goal to calculate progress percentage
      const { data: goal } = await supabase
        .from('client_goals')
        .select('*')
        .eq('id', goalId)
        .single();

      if (!goal) throw new Error('Goal not found');

      const progressPercentage = goal.target_value 
        ? Math.min(100, (currentValue / goal.target_value) * 100)
        : 0;

      const status = progressPercentage >= 100 ? 'completed' : 'active';

      // Add milestone if provided
      const milestones = goal.milestones || [];
      if (notes) {
        milestones.push({
          date: new Date().toISOString(),
          value: currentValue,
          notes,
        });
      }

      const { data, error } = await supabase
        .from('client_goals')
        .update({
          current_value: currentValue,
          progress_percentage: progressPercentage,
          status,
          milestones,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating client goal progress:', error);
      throw error;
    }
  }

  /**
   * Get client statistics
   */
  static async getClientStats(clientId: string): Promise<{
    totalSessions: number;
    completedGoals: number;
    activeGoals: number;
    progressEntries: number;
    latestWeight?: number;
    weightChange?: number;
    joinDate: string;
  }> {
    try {
      // Get session count
      const { count: totalSessions } = await supabase
        .from('trainer_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', clientId)
        .eq('status', 'completed');

      // Get goals stats
      const { data: goals } = await supabase
        .from('client_goals')
        .select('status')
        .eq('client_id', clientId);

      const completedGoals = goals?.filter(g => g.status === 'completed').length || 0;
      const activeGoals = goals?.filter(g => g.status === 'active').length || 0;

      // Get progress entries count
      const { count: progressEntries } = await supabase
        .from('client_progress')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);

      // Get weight progress
      const { data: weightProgress } = await supabase
        .from('client_progress')
        .select('weight_kg, date')
        .eq('client_id', clientId)
        .not('weight_kg', 'is', null)
        .order('date', { ascending: false })
        .limit(2);

      let latestWeight: number | undefined;
      let weightChange: number | undefined;

      if (weightProgress && weightProgress.length > 0) {
        latestWeight = weightProgress[0].weight_kg;
        if (weightProgress.length > 1) {
          weightChange = latestWeight - weightProgress[1].weight_kg;
        }
      }

      // Get client join date
      const { data: client } = await supabase
        .from('clients')
        .select('created_at')
        .eq('id', clientId)
        .single();

      return {
        totalSessions: totalSessions || 0,
        completedGoals,
        activeGoals,
        progressEntries: progressEntries || 0,
        latestWeight,
        weightChange,
        joinDate: client?.created_at || '',
      };
    } catch (error) {
      console.error('Error fetching client stats:', error);
      throw error;
    }
  }

  /**
   * Search clients by name or email
   */
  static async searchClients(trainerId: string, query: string): Promise<ClientProfile[]> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('trainer_id', trainerId)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching clients:', error);
      throw error;
    }
  }
} 