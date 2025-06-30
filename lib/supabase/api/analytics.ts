import { supabase } from '../client';

export interface TrainerAnalytics {
  trainer_id: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  total_sessions: number;
  total_earnings: number;
  average_rating: number;
  total_clients: number;
  new_clients: number;
  retention_rate: number;
  cancellation_rate: number;
  no_show_rate: number;
  popular_session_types: { type: string; count: number }[];
  peak_hours: { hour: number; sessions: number }[];
  revenue_by_month: { month: string; revenue: number }[];
  client_satisfaction_trend: { date: string; rating: number }[];
}

export interface ClientAnalytics {
  client_user_id: string;
  trainer_id: string;
  total_sessions: number;
  sessions_completed: number;
  sessions_cancelled: number;
  sessions_no_show: number;
  average_session_rating: number;
  total_spent: number;
  join_date: string;
  last_session_date?: string;
  workout_streak: number;
  goals_completed: number;
  goals_active: number;
  progress_entries: number;
  weight_change_kg?: number;
  body_fat_change?: number;
  strength_improvements: { exercise: string; improvement: number }[];
}

export interface BusinessMetrics {
  trainer_id: string;
  period_start: string;
  period_end: string;
  total_revenue: number;
  net_revenue: number;
  platform_fees: number;
  total_sessions: number;
  unique_clients: number;
  new_client_acquisition: number;
  client_retention_rate: number;
  average_session_value: number;
  conversion_rate: number;
  refund_rate: number;
  growth_rate: number;
}

export interface PerformanceMetrics {
  trainer_id: string;
  date: string;
  sessions_conducted: number;
  revenue_generated: number;
  client_satisfaction: number;
  punctuality_score: number;
  response_time_hours: number;
  booking_acceptance_rate: number;
  cancellation_rate: number;
  professional_score: number;
}

export class AnalyticsAPI {
  /**
   * Get comprehensive trainer analytics
   */
  static async getTrainerAnalytics(
    trainerId: string,
    period: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<TrainerAnalytics> {
    try {
      const endDate = new Date();
      const startDate = new Date();

      switch (period) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Get basic session stats
      const { data: sessions } = await supabase
        .from('trainer_bookings')
        .select('*')
        .eq('trainer_id', trainerId)
        .gte('session_date', startDate.toISOString().split('T')[0])
        .lte('session_date', endDate.toISOString().split('T')[0]);

      // Get earnings data
      const { data: earnings } = await supabase
        .from('trainer_earnings')
        .select('net_amount, created_at')
        .eq('trainer_id', trainerId)
        .eq('status', 'paid')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Get ratings
      const { data: reviews } = await supabase
        .from('trainer_reviews')
        .select('rating, created_at')
        .eq('trainer_id', trainerId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Get client stats
      const { data: clientStats } = await supabase
        .from('trainer_clients')
        .select('*')
        .eq('trainer_id', trainerId);

      // Calculate metrics
      const totalSessions = sessions?.length || 0;
      const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;
      const cancelledSessions = sessions?.filter(s => s.status === 'cancelled').length || 0;
      const noShowSessions = sessions?.filter(s => s.no_show === true).length || 0;

      const totalEarnings = earnings?.reduce((sum, e) => sum + (e.net_amount || 0), 0) || 0;
      const averageRating = reviews?.length 
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
        : 0;

      const totalClients = clientStats?.length || 0;
      const newClients = clientStats?.filter(c => 
        new Date(c.first_session_date) >= startDate
      ).length || 0;

      const retentionRate = totalClients > 0 
        ? ((totalClients - newClients) / totalClients) * 100 
        : 0;

      const cancellationRate = totalSessions > 0 
        ? (cancelledSessions / totalSessions) * 100 
        : 0;

      const noShowRate = totalSessions > 0 
        ? (noShowSessions / totalSessions) * 100 
        : 0;

      // Get popular session types
      const sessionTypeCounts = sessions?.reduce((acc, session) => {
        const type = session.session_type || 'Personal Training';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const popularSessionTypes = Object.entries(sessionTypeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      // Get peak hours
      const hourCounts = sessions?.reduce((acc, session) => {
        const hour = new Date(`2000-01-01T${session.session_time}`).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<number, number>) || {};

      const peakHours = Object.entries(hourCounts)
        .map(([hour, sessions]) => ({ hour: parseInt(hour), sessions }))
        .sort((a, b) => b.sessions - a.sessions);

      // Get revenue by month
      const revenueByMonth = earnings?.reduce((acc, earning) => {
        const month = new Date(earning.created_at).toISOString().slice(0, 7);
        acc[month] = (acc[month] || 0) + earning.net_amount;
        return acc;
      }, {} as Record<string, number>) || {};

      const revenueByMonthArray = Object.entries(revenueByMonth)
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // Get satisfaction trend
      const satisfactionTrend = reviews?.map(review => ({
        date: review.created_at.split('T')[0],
        rating: review.rating,
      })) || [];

      return {
        trainer_id: trainerId,
        period,
        total_sessions: totalSessions,
        total_earnings: totalEarnings,
        average_rating: Math.round(averageRating * 10) / 10,
        total_clients: totalClients,
        new_clients: newClients,
        retention_rate: Math.round(retentionRate * 10) / 10,
        cancellation_rate: Math.round(cancellationRate * 10) / 10,
        no_show_rate: Math.round(noShowRate * 10) / 10,
        popular_session_types: popularSessionTypes,
        peak_hours: peakHours,
        revenue_by_month: revenueByMonthArray,
        client_satisfaction_trend: satisfactionTrend,
      };
    } catch (error) {
      console.error('Error fetching trainer analytics:', error);
      throw error;
    }
  }

  /**
   * Get client analytics
   */
  static async getClientAnalytics(
    clientUserId: string,
    trainerId: string
  ): Promise<ClientAnalytics> {
    try {
      // Get session data
      const { data: sessions } = await supabase
        .from('trainer_bookings')
        .select('*')
        .eq('user_id', clientUserId)
        .eq('trainer_id', trainerId);

      // Get goals data
      const { data: goals } = await supabase
        .from('client_goals')
        .select('*')
        .eq('client_user_id', clientUserId)
        .eq('trainer_id', trainerId);

      // Get progress data
      const { data: progress } = await supabase
        .from('client_progress')
        .select('*')
        .eq('client_user_id', clientUserId)
        .eq('trainer_id', trainerId)
        .order('date');

      // Get workout sessions for streak calculation
      const { data: workoutSessions } = await supabase
        .from('workout_sessions')
        .select('session_date, completed')
        .eq('user_id', clientUserId)
        .eq('completed', true)
        .order('session_date', { ascending: false });

      // Calculate metrics
      const totalSessions = sessions?.length || 0;
      const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;
      const cancelledSessions = sessions?.filter(s => s.status === 'cancelled').length || 0;
      const noShowSessions = sessions?.filter(s => s.no_show === true).length || 0;

      const averageRating = sessions?.filter(s => s.rating)
        .reduce((sum, s, _, arr) => sum + s.rating / arr.length, 0) || 0;

      const totalSpent = sessions?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;

      const joinDate = sessions?.length > 0 
        ? sessions.sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())[0].session_date
        : '';

      const lastSessionDate = sessions?.length > 0
        ? sessions.sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())[0].session_date
        : undefined;

      // Calculate workout streak
      let workoutStreak = 0;
      if (workoutSessions && workoutSessions.length > 0) {
        const today = new Date();
        let currentDate = new Date(today);
        
        for (const session of workoutSessions) {
          const sessionDate = new Date(session.session_date);
          const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff <= 1) {
            workoutStreak++;
            currentDate = sessionDate;
          } else {
            break;
          }
        }
      }

      const goalsCompleted = goals?.filter(g => g.status === 'completed').length || 0;
      const goalsActive = goals?.filter(g => g.status === 'active').length || 0;
      const progressEntries = progress?.length || 0;

      // Calculate weight change
      let weightChange: number | undefined;
      if (progress && progress.length >= 2) {
        const firstWeight = progress[0].weight_kg;
        const lastWeight = progress[progress.length - 1].weight_kg;
        if (firstWeight && lastWeight) {
          weightChange = lastWeight - firstWeight;
        }
      }

      // Calculate body fat change
      let bodyFatChange: number | undefined;
      if (progress && progress.length >= 2) {
        const firstBodyFat = progress[0].body_fat_percentage;
        const lastBodyFat = progress[progress.length - 1].body_fat_percentage;
        if (firstBodyFat && lastBodyFat) {
          bodyFatChange = lastBodyFat - firstBodyFat;
        }
      }

      // Get strength improvements (placeholder - would need exercise performance data)
      const strengthImprovements: { exercise: string; improvement: number }[] = [];

      return {
        client_user_id: clientUserId,
        trainer_id: trainerId,
        total_sessions: totalSessions,
        sessions_completed: completedSessions,
        sessions_cancelled: cancelledSessions,
        sessions_no_show: noShowSessions,
        average_session_rating: Math.round(averageRating * 10) / 10,
        total_spent: totalSpent,
        join_date: joinDate,
        last_session_date: lastSessionDate,
        workout_streak: workoutStreak,
        goals_completed: goalsCompleted,
        goals_active: goalsActive,
        progress_entries: progressEntries,
        weight_change_kg: weightChange,
        body_fat_change: bodyFatChange,
        strength_improvements: strengthImprovements,
      };
    } catch (error) {
      console.error('Error fetching client analytics:', error);
      throw error;
    }
  }

  /**
   * Get business metrics
   */
  static async getBusinessMetrics(
    trainerId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<BusinessMetrics> {
    try {
      // Get earnings data
      const { data: earnings } = await supabase
        .from('trainer_earnings')
        .select('*')
        .eq('trainer_id', trainerId)
        .gte('created_at', periodStart)
        .lte('created_at', periodEnd);

      // Get session data
      const { data: sessions } = await supabase
        .from('trainer_bookings')
        .select('*')
        .eq('trainer_id', trainerId)
        .gte('session_date', periodStart.split('T')[0])
        .lte('session_date', periodEnd.split('T')[0]);

      // Get client data
      const { data: clients } = await supabase
        .from('trainer_clients')
        .select('*')
        .eq('trainer_id', trainerId);

      // Calculate metrics
      const totalRevenue = earnings?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const netRevenue = earnings?.reduce((sum, e) => sum + (e.net_amount || 0), 0) || 0;
      const platformFees = totalRevenue - netRevenue;

      const totalSessions = sessions?.length || 0;
      const uniqueClients = new Set(sessions?.map(s => s.user_id)).size;

      const newClients = clients?.filter(c => 
        new Date(c.first_session_date) >= new Date(periodStart) &&
        new Date(c.first_session_date) <= new Date(periodEnd)
      ).length || 0;

      const averageSessionValue = totalSessions > 0 ? totalRevenue / totalSessions : 0;

      // Calculate retention rate (simplified)
      const clientRetentionRate = uniqueClients > 0 
        ? ((uniqueClients - newClients) / uniqueClients) * 100 
        : 0;

      // Get previous period for growth calculation
      const periodLength = new Date(periodEnd).getTime() - new Date(periodStart).getTime();
      const prevPeriodStart = new Date(new Date(periodStart).getTime() - periodLength);
      const prevPeriodEnd = new Date(periodStart);

      const { data: prevEarnings } = await supabase
        .from('trainer_earnings')
        .select('net_amount')
        .eq('trainer_id', trainerId)
        .gte('created_at', prevPeriodStart.toISOString())
        .lte('created_at', prevPeriodEnd.toISOString());

      const prevRevenue = prevEarnings?.reduce((sum, e) => sum + (e.net_amount || 0), 0) || 0;
      const growthRate = prevRevenue > 0 
        ? ((netRevenue - prevRevenue) / prevRevenue) * 100 
        : 0;

      return {
        trainer_id: trainerId,
        period_start: periodStart,
        period_end: periodEnd,
        total_revenue: totalRevenue,
        net_revenue: netRevenue,
        platform_fees: platformFees,
        total_sessions: totalSessions,
        unique_clients: uniqueClients,
        new_client_acquisition: newClients,
        client_retention_rate: Math.round(clientRetentionRate * 10) / 10,
        average_session_value: Math.round(averageSessionValue * 100) / 100,
        conversion_rate: 0, // Would need lead data
        refund_rate: 0, // Would need refund data
        growth_rate: Math.round(growthRate * 10) / 10,
      };
    } catch (error) {
      console.error('Error fetching business metrics:', error);
      throw error;
    }
  }

  /**
   * Generate client progress report
   */
  static async generateClientProgressReport(
    clientUserId: string,
    trainerId: string,
    fromDate: string,
    toDate: string
  ): Promise<{
    client_info: any;
    progress_summary: any;
    goals_progress: any[];
    workout_summary: any;
    nutrition_summary: any;
    measurements: any[];
  }> {
    try {
      // Get client info
      const { data: clientInfo } = await supabase
        .from('users')
        .select(`
          *,
          user_profiles (*)
        `)
        .eq('id', clientUserId)
        .single();

      // Get progress data
      const { data: progressData } = await supabase
        .from('client_progress')
        .select('*')
        .eq('client_user_id', clientUserId)
        .eq('trainer_id', trainerId)
        .gte('date', fromDate)
        .lte('date', toDate)
        .order('date');

      // Get goals progress
      const { data: goalsData } = await supabase
        .from('client_goals')
        .select('*')
        .eq('client_user_id', clientUserId)
        .eq('trainer_id', trainerId);

      // Get workout sessions
      const { data: workoutSessions } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', clientUserId)
        .gte('session_date', fromDate)
        .lte('session_date', toDate);

      // Get nutrition data (if available)
      const { data: nutritionData } = await supabase
        .from('meal_logs')
        .select(`
          *,
          food_database (calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
        `)
        .eq('user_id', clientUserId)
        .gte('logged_date', fromDate)
        .lte('logged_date', toDate);

      // Calculate progress summary
      const progressSummary = {
        total_sessions: workoutSessions?.length || 0,
        completed_sessions: workoutSessions?.filter(s => s.completed).length || 0,
        total_workout_time: workoutSessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0,
        average_session_rating: workoutSessions?.filter(s => s.rating)
          .reduce((sum, s, _, arr) => sum + s.rating / arr.length, 0) || 0,
        goals_completed: goalsData?.filter(g => g.status === 'completed').length || 0,
        goals_in_progress: goalsData?.filter(g => g.status === 'active').length || 0,
      };

      // Calculate nutrition summary
      let nutritionSummary = null;
      if (nutritionData && nutritionData.length > 0) {
        const totalCalories = nutritionData.reduce((sum, log) => {
          const multiplier = log.quantity_grams / 100;
          return sum + (log.food_database.calories_per_100g * multiplier);
        }, 0);

        nutritionSummary = {
          total_meals_logged: nutritionData.length,
          average_daily_calories: Math.round(totalCalories / Math.max(1, 
            Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24))
          )),
        };
      }

      return {
        client_info: clientInfo,
        progress_summary: progressSummary,
        goals_progress: goalsData || [],
        workout_summary: {
          sessions: workoutSessions || [],
          total_sessions: workoutSessions?.length || 0,
          completion_rate: workoutSessions?.length > 0 
            ? (workoutSessions.filter(s => s.completed).length / workoutSessions.length) * 100 
            : 0,
        },
        nutrition_summary: nutritionSummary,
        measurements: progressData || [],
      };
    } catch (error) {
      console.error('Error generating client progress report:', error);
      throw error;
    }
  }

  /**
   * Get trainer performance score
   */
  static async getTrainerPerformanceScore(trainerId: string): Promise<{
    overall_score: number;
    punctuality_score: number;
    client_satisfaction_score: number;
    response_time_score: number;
    professionalism_score: number;
    growth_score: number;
  }> {
    try {
      // Get recent data for scoring
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get reviews for satisfaction score
      const { data: reviews } = await supabase
        .from('trainer_reviews')
        .select('rating')
        .eq('trainer_id', trainerId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Get bookings for punctuality and response metrics
      const { data: bookings } = await supabase
        .from('trainer_bookings')
        .select('*')
        .eq('trainer_id', trainerId)
        .gte('session_date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Calculate scores (simplified scoring system)
      const clientSatisfactionScore = reviews?.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 20 // Convert 5-star to 100-point scale
        : 0;

      const punctualityScore = 85; // Would need actual punctuality data
      const responseTimeScore = 80; // Would need response time data
      const professionalismScore = 90; // Would need professionalism metrics
      const growthScore = 75; // Would need growth metrics

      const overallScore = Math.round(
        (clientSatisfactionScore + punctualityScore + responseTimeScore + professionalismScore + growthScore) / 5
      );

      return {
        overall_score: overallScore,
        punctuality_score: punctualityScore,
        client_satisfaction_score: Math.round(clientSatisfactionScore),
        response_time_score: responseTimeScore,
        professionalism_score: professionalismScore,
        growth_score: growthScore,
      };
    } catch (error) {
      console.error('Error calculating trainer performance score:', error);
      throw error;
    }
  }
} 