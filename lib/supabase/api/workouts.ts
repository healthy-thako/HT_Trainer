import { supabase } from '../client';

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  muscle_groups: string[];
  equipment_needed?: string[];
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
  video_url?: string;
  image_url?: string;
  category: 'strength' | 'cardio' | 'flexibility' | 'balance' | 'sports';
  created_at: string;
}

export interface WorkoutPlan {
  id: string;
  trainer_id: string;
  client_user_id?: string;
  name: string;
  description?: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  duration_weeks: number;
  days_per_week: number;
  is_template: boolean;
  is_active: boolean;
  completion_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkoutDay {
  id: string;
  plan_id: string;
  day_of_week: number; // 1-7 (Monday-Sunday)
  name: string;
  description?: string;
  estimated_duration_minutes: number;
  focus_areas: string[];
  created_at: string;
}

export interface WorkoutExercise {
  id: string;
  day_id: string;
  exercise_id: string;
  order_index: number;
  sets: number;
  reps?: number;
  duration_seconds?: number;
  weight_kg?: number;
  rest_seconds: number;
  notes?: string;
  is_superset?: boolean;
  superset_group?: number;
  created_at: string;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  workout_plan_id?: string;
  workout_day_id?: string;
  session_date: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  total_calories_burned?: number;
  notes?: string;
  rating?: number;
  completed: boolean;
  created_at: string;
}

export interface ExerciseLog {
  id: string;
  workout_session_id: string;
  exercise_id: string;
  exercise_name: string;
  sets_completed: number;
  sets_planned: number;
  reps_completed: number[];
  reps_planned?: number;
  weight_used: number[];
  rest_time_seconds: number[];
  difficulty_rating?: number;
  notes?: string;
  completed: boolean;
  created_at: string;
}

export class WorkoutsAPI {
  /**
   * Get exercise library
   */
  static async getExerciseLibrary(filters?: {
    category?: string;
    muscle_groups?: string[];
    difficulty_level?: string;
    equipment_needed?: string[];
    search?: string;
  }): Promise<Exercise[]> {
    try {
      let query = supabase
        .from('exercise_library')
        .select('*');

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.difficulty_level) {
        query = query.eq('difficulty_level', filters.difficulty_level);
      }

      if (filters?.muscle_groups && filters.muscle_groups.length > 0) {
        query = query.overlaps('muscle_groups', filters.muscle_groups);
      }

      if (filters?.equipment_needed && filters.equipment_needed.length > 0) {
        query = query.overlaps('equipment_needed', filters.equipment_needed);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching exercise library:', error);
      throw error;
    }
  }

  /**
   * Create custom exercise
   */
  static async createCustomExercise(
    trainerId: string,
    exerciseData: Omit<Exercise, 'id' | 'created_at'>
  ): Promise<Exercise> {
    try {
      const { data, error } = await supabase
        .from('exercise_library')
        .insert({
          ...exerciseData,
          created_by: trainerId,
          is_custom: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating custom exercise:', error);
      throw error;
    }
  }

  /**
   * Get trainer's workout plans
   */
  static async getTrainerWorkoutPlans(
    trainerId: string,
    includeTemplates: boolean = true
  ): Promise<WorkoutPlan[]> {
    try {
      let query = supabase
        .from('trainer_workout_plans')
        .select('*')
        .eq('trainer_id', trainerId);

      if (!includeTemplates) {
        query = query.eq('is_template', false);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trainer workout plans:', error);
      throw error;
    }
  }

  /**
   * Create workout plan
   */
  static async createWorkoutPlan(
    planData: Omit<WorkoutPlan, 'id' | 'created_at' | 'updated_at'>
  ): Promise<WorkoutPlan> {
    try {
      const { data, error } = await supabase
        .from('trainer_workout_plans')
        .insert(planData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating workout plan:', error);
      throw error;
    }
  }

  /**
   * Get workout plan with days and exercises
   */
  static async getWorkoutPlanDetails(planId: string): Promise<{
    plan: WorkoutPlan;
    days: (WorkoutDay & { exercises: (WorkoutExercise & { exercise: Exercise })[] })[];
  } | null> {
    try {
      // Get plan
      const { data: plan, error: planError } = await supabase
        .from('trainer_workout_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      // Get days with exercises
      const { data: days, error: daysError } = await supabase
        .from('workout_days')
        .select(`
          *,
          workout_exercises (
            *,
            exercise_library (*)
          )
        `)
        .eq('plan_id', planId)
        .order('day_of_week');

      if (daysError) throw daysError;

      // Format the data
      const formattedDays = days?.map(day => ({
        ...day,
        exercises: day.workout_exercises?.map((we: any) => ({
          ...we,
          exercise: we.exercise_library,
        })) || [],
      })) || [];

      return {
        plan,
        days: formattedDays,
      };
    } catch (error) {
      console.error('Error fetching workout plan details:', error);
      return null;
    }
  }

  /**
   * Add workout day to plan
   */
  static async addWorkoutDay(
    dayData: Omit<WorkoutDay, 'id' | 'created_at'>
  ): Promise<WorkoutDay> {
    try {
      const { data, error } = await supabase
        .from('workout_days')
        .insert(dayData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding workout day:', error);
      throw error;
    }
  }

  /**
   * Add exercise to workout day
   */
  static async addExerciseToDay(
    exerciseData: Omit<WorkoutExercise, 'id' | 'created_at'>
  ): Promise<WorkoutExercise> {
    try {
      const { data, error } = await supabase
        .from('workout_exercises')
        .insert(exerciseData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding exercise to day:', error);
      throw error;
    }
  }

  /**
   * Create workout session
   */
  static async createWorkoutSession(
    sessionData: Omit<WorkoutSession, 'id' | 'created_at'>
  ): Promise<WorkoutSession> {
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating workout session:', error);
      throw error;
    }
  }

  /**
   * Log exercise performance
   */
  static async logExercisePerformance(
    logData: Omit<ExerciseLog, 'id' | 'created_at'>
  ): Promise<ExerciseLog> {
    try {
      const { data, error } = await supabase
        .from('exercise_logs')
        .insert(logData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging exercise performance:', error);
      throw error;
    }
  }

  /**
   * Get client's workout sessions
   */
  static async getClientWorkoutSessions(
    clientUserId: string,
    limit?: number
  ): Promise<WorkoutSession[]> {
    try {
      let query = supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', clientUserId)
        .order('session_date', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching client workout sessions:', error);
      throw error;
    }
  }

  /**
   * Get workout session with exercise logs
   */
  static async getWorkoutSessionDetails(sessionId: string): Promise<{
    session: WorkoutSession;
    exercises: (ExerciseLog & { exercise: Exercise })[];
  } | null> {
    try {
      // Get session
      const { data: session, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Get exercise logs
      const { data: exercises, error: exercisesError } = await supabase
        .from('exercise_logs')
        .select(`
          *,
          exercise_library (*)
        `)
        .eq('workout_session_id', sessionId)
        .order('created_at');

      if (exercisesError) throw exercisesError;

      const formattedExercises = exercises?.map(log => ({
        ...log,
        exercise: log.exercise_library,
      })) || [];

      return {
        session,
        exercises: formattedExercises,
      };
    } catch (error) {
      console.error('Error fetching workout session details:', error);
      return null;
    }
  }

  /**
   * Get exercise performance analytics
   */
  static async getExercisePerformanceAnalytics(
    userId: string,
    exerciseName: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('exercise_performance_analytics')
        .select('*')
        .eq('user_id', userId)
        .eq('exercise_name', exerciseName);

      if (dateFrom) {
        query = query.gte('date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('date', dateTo);
      }

      const { data, error } = await query.order('date');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching exercise performance analytics:', error);
      throw error;
    }
  }

  /**
   * Clone workout plan as template
   */
  static async cloneWorkoutPlanAsTemplate(
    planId: string,
    trainerId: string,
    templateName: string
  ): Promise<WorkoutPlan> {
    try {
      // Get original plan details
      const planDetails = await this.getWorkoutPlanDetails(planId);
      if (!planDetails) throw new Error('Plan not found');

      // Create new plan as template
      const { data: newPlan, error: planError } = await supabase
        .from('trainer_workout_plans')
        .insert({
          trainer_id: trainerId,
          name: templateName,
          description: planDetails.plan.description,
          difficulty_level: planDetails.plan.difficulty_level,
          duration_weeks: planDetails.plan.duration_weeks,
          days_per_week: planDetails.plan.days_per_week,
          is_template: true,
          is_active: true,
        })
        .select()
        .single();

      if (planError) throw planError;

      // Clone days and exercises
      for (const day of planDetails.days) {
        const { data: newDay } = await supabase
          .from('workout_days')
          .insert({
            plan_id: newPlan.id,
            day_of_week: day.day_of_week,
            name: day.name,
            description: day.description,
            estimated_duration_minutes: day.estimated_duration_minutes,
            focus_areas: day.focus_areas,
          })
          .select()
          .single();

        if (newDay) {
          for (const exercise of day.exercises) {
            await supabase
              .from('workout_exercises')
              .insert({
                day_id: newDay.id,
                exercise_id: exercise.exercise_id,
                order_index: exercise.order_index,
                sets: exercise.sets,
                reps: exercise.reps,
                duration_seconds: exercise.duration_seconds,
                weight_kg: exercise.weight_kg,
                rest_seconds: exercise.rest_seconds,
                notes: exercise.notes,
                is_superset: exercise.is_superset,
                superset_group: exercise.superset_group,
              });
          }
        }
      }

      return newPlan;
    } catch (error) {
      console.error('Error cloning workout plan as template:', error);
      throw error;
    }
  }
} 