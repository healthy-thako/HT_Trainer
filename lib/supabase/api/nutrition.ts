import { supabase } from '../client';

export interface NutritionGoal {
  id: string;
  user_id: string;
  trainer_id?: string;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  target_fiber?: number;
  target_water_ml?: number;
  active_from: string;
  created_at: string;
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  calories_per_100g: number;
  protein_per_100g?: number;
  carbs_per_100g?: number;
  fat_per_100g?: number;
  fiber_per_100g?: number;
  sugar_per_100g?: number;
  sodium_per_100g?: number;
  category?: string;
  verified: boolean;
  created_at: string;
}

export interface MealLog {
  id: string;
  user_id: string;
  food_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  quantity_grams: number;
  logged_date: string;
  logged_at: string;
  notes?: string;
  created_at: string;
}

export interface WaterIntakeLog {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_date: string;
  logged_at: string;
  created_at: string;
}

export interface MealPlan {
  id: string;
  trainer_id: string;
  client_user_id?: string;
  name: string;
  description?: string;
  duration_days: number;
  target_calories_per_day: number;
  target_protein_per_day: number;
  target_carbs_per_day: number;
  target_fat_per_day: number;
  is_template: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MealPlanDay {
  id: string;
  meal_plan_id: string;
  day_number: number;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  created_at: string;
}

export interface MealPlanMeal {
  id: string;
  meal_plan_day_id: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  description?: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  created_at: string;
}

export interface MealPlanFood {
  id: string;
  meal_plan_meal_id: string;
  food_id: string;
  quantity_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  created_at: string;
}

export interface NutritionSummary {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  total_water_ml: number;
  meals_logged: number;
  goal_calories: number;
  goal_protein: number;
  goal_carbs: number;
  goal_fat: number;
  goal_water_ml: number;
}

export class NutritionAPI {
  /**
   * Get user's current nutrition goals
   */
  static async getUserNutritionGoals(userId: string): Promise<NutritionGoal | null> {
    try {
      const { data, error } = await supabase
        .from('daily_nutrition_goals')
        .select('*')
        .eq('user_id', userId)
        .order('active_from', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching nutrition goals:', error);
      throw error;
    }
  }

  /**
   * Set nutrition goals for user
   */
  static async setNutritionGoals(
    userId: string,
    trainerId: string | undefined,
    goals: Omit<NutritionGoal, 'id' | 'user_id' | 'trainer_id' | 'created_at'>
  ): Promise<NutritionGoal> {
    try {
      const { data, error } = await supabase
        .from('daily_nutrition_goals')
        .insert({
          user_id: userId,
          trainer_id: trainerId,
          ...goals,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error setting nutrition goals:', error);
      throw error;
    }
  }

  /**
   * Search food database
   */
  static async searchFoods(query: string, limit: number = 20): Promise<FoodItem[]> {
    try {
      const { data, error } = await supabase
        .from('food_database')
        .select('*')
        .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
        .order('verified', { ascending: false })
        .order('name')
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching foods:', error);
      throw error;
    }
  }

  /**
   * Get food by barcode
   */
  static async getFoodByBarcode(barcode: string): Promise<FoodItem | null> {
    try {
      const { data, error } = await supabase
        .from('food_database')
        .select('*')
        .eq('barcode', barcode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching food by barcode:', error);
      throw error;
    }
  }

  /**
   * Add custom food item
   */
  static async addCustomFood(
    foodData: Omit<FoodItem, 'id' | 'verified' | 'created_at'>
  ): Promise<FoodItem> {
    try {
      const { data, error } = await supabase
        .from('food_database')
        .insert({
          ...foodData,
          verified: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding custom food:', error);
      throw error;
    }
  }

  /**
   * Log meal
   */
  static async logMeal(
    mealData: Omit<MealLog, 'id' | 'created_at'>
  ): Promise<MealLog> {
    try {
      const { data, error } = await supabase
        .from('meal_logs')
        .insert(mealData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging meal:', error);
      throw error;
    }
  }

  /**
   * Log water intake
   */
  static async logWaterIntake(
    waterData: Omit<WaterIntakeLog, 'id' | 'created_at'>
  ): Promise<WaterIntakeLog> {
    try {
      const { data, error } = await supabase
        .from('water_intake_logs')
        .insert(waterData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging water intake:', error);
      throw error;
    }
  }

  /**
   * Get daily nutrition summary
   */
  static async getDailyNutritionSummary(
    userId: string,
    date: string
  ): Promise<NutritionSummary> {
    try {
      // Get meal logs for the date
      const { data: mealLogs, error: mealsError } = await supabase
        .from('meal_logs')
        .select(`
          *,
          food_database (
            calories_per_100g,
            protein_per_100g,
            carbs_per_100g,
            fat_per_100g,
            fiber_per_100g
          )
        `)
        .eq('user_id', userId)
        .eq('logged_date', date);

      if (mealsError) throw mealsError;

      // Get water intake for the date
      const { data: waterLogs, error: waterError } = await supabase
        .from('water_intake_logs')
        .select('amount_ml')
        .eq('user_id', userId)
        .eq('logged_date', date);

      if (waterError) throw waterError;

      // Get nutrition goals
      const goals = await this.getUserNutritionGoals(userId);

      // Calculate totals
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      let totalFiber = 0;

      mealLogs?.forEach(log => {
        const food = log.food_database;
        const multiplier = log.quantity_grams / 100;

        totalCalories += (food.calories_per_100g || 0) * multiplier;
        totalProtein += (food.protein_per_100g || 0) * multiplier;
        totalCarbs += (food.carbs_per_100g || 0) * multiplier;
        totalFat += (food.fat_per_100g || 0) * multiplier;
        totalFiber += (food.fiber_per_100g || 0) * multiplier;
      });

      const totalWater = waterLogs?.reduce((sum, log) => sum + log.amount_ml, 0) || 0;

      return {
        date,
        total_calories: Math.round(totalCalories),
        total_protein: Math.round(totalProtein * 10) / 10,
        total_carbs: Math.round(totalCarbs * 10) / 10,
        total_fat: Math.round(totalFat * 10) / 10,
        total_fiber: Math.round(totalFiber * 10) / 10,
        total_water_ml: totalWater,
        meals_logged: mealLogs?.length || 0,
        goal_calories: goals?.target_calories || 0,
        goal_protein: goals?.target_protein || 0,
        goal_carbs: goals?.target_carbs || 0,
        goal_fat: goals?.target_fat || 0,
        goal_water_ml: goals?.target_water_ml || 0,
      };
    } catch (error) {
      console.error('Error getting daily nutrition summary:', error);
      throw error;
    }
  }

  /**
   * Get nutrition history
   */
  static async getNutritionHistory(
    userId: string,
    fromDate: string,
    toDate: string
  ): Promise<NutritionSummary[]> {
    try {
      const summaries: NutritionSummary[] = [];
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);

      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateString = date.toISOString().split('T')[0];
        const summary = await this.getDailyNutritionSummary(userId, dateString);
        summaries.push(summary);
      }

      return summaries;
    } catch (error) {
      console.error('Error getting nutrition history:', error);
      throw error;
    }
  }

  /**
   * Create meal plan
   */
  static async createMealPlan(
    planData: Omit<MealPlan, 'id' | 'created_at' | 'updated_at'>
  ): Promise<MealPlan> {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .insert(planData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating meal plan:', error);
      throw error;
    }
  }

  /**
   * Get trainer's meal plans
   */
  static async getTrainerMealPlans(trainerId: string): Promise<MealPlan[]> {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trainer meal plans:', error);
      throw error;
    }
  }

  /**
   * Get meal plan details
   */
  static async getMealPlanDetails(planId: string): Promise<{
    plan: MealPlan;
    days: (MealPlanDay & {
      meals: (MealPlanMeal & {
        foods: (MealPlanFood & { food: FoodItem })[];
      })[];
    })[];
  } | null> {
    try {
      // Get plan
      const { data: plan, error: planError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      // Get days with meals and foods
      const { data: days, error: daysError } = await supabase
        .from('meal_plan_days')
        .select(`
          *,
          meal_plan_meals (
            *,
            meal_plan_foods (
              *,
              food_database (*)
            )
          )
        `)
        .eq('meal_plan_id', planId)
        .order('day_number');

      if (daysError) throw daysError;

      // Format the data
      const formattedDays = days?.map(day => ({
        ...day,
        meals: day.meal_plan_meals?.map((meal: any) => ({
          ...meal,
          foods: meal.meal_plan_foods?.map((food: any) => ({
            ...food,
            food: food.food_database,
          })) || [],
        })) || [],
      })) || [];

      return {
        plan,
        days: formattedDays,
      };
    } catch (error) {
      console.error('Error fetching meal plan details:', error);
      return null;
    }
  }

  /**
   * Assign meal plan to client
   */
  static async assignMealPlanToClient(
    planId: string,
    clientUserId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('meal_plans')
        .update({
          client_user_id: clientUserId,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', planId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error assigning meal plan to client:', error);
      return false;
    }
  }

  /**
   * Get client's active meal plan
   */
  static async getClientActiveMealPlan(clientUserId: string): Promise<MealPlan | null> {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('client_user_id', clientUserId)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching client active meal plan:', error);
      throw error;
    }
  }
} 