import { supabase } from '../client';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  max_clients: number;
  max_bookings_per_month: number;
  analytics_access: boolean;
  priority_support: boolean;
  custom_branding: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainerSubscription {
  id: string;
  trainer_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'incomplete';
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  trial_end?: string;
  cancel_at_period_end: boolean;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

export interface SubscriptionUsage {
  trainer_id: string;
  period_start: string;
  period_end: string;
  clients_count: number;
  bookings_count: number;
  storage_used_mb: number;
  api_calls_count: number;
  features_used: string[];
}

export interface BillingHistory {
  id: string;
  trainer_id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  billing_reason: 'subscription_cycle' | 'subscription_create' | 'subscription_update' | 'invoice_payment_failed';
  invoice_url?: string;
  stripe_invoice_id?: string;
  created_at: string;
  updated_at: string;
}

export const SubscriptionsAPI = {
  // Subscription Plans
  getAvailablePlans: async (): Promise<SubscriptionPlan[]> => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      throw error;
    }
  },

  getPlanById: async (planId: string): Promise<SubscriptionPlan | null> => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching subscription plan:', error);
      throw error;
    }
  },

  // Trainer Subscriptions
  getTrainerSubscription: async (trainerId: string): Promise<TrainerSubscription | null> => {
    try {
      const { data, error } = await supabase
        .from('trainer_subscriptions')
        .select(`
          *,
          plan:plan_id (*)
        `)
        .eq('trainer_id', trainerId)
        .eq('status', 'active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data as TrainerSubscription;
    } catch (error) {
      console.error('Error fetching trainer subscription:', error);
      throw error;
    }
  },

  createSubscription: async (trainerId: string, subscriptionData: {
    plan_id: string;
    billing_cycle: 'monthly' | 'yearly';
    trial_days?: number;
    stripe_subscription_id?: string;
    stripe_customer_id?: string;
  }): Promise<TrainerSubscription> => {
    try {
      const plan = await SubscriptionsAPI.getPlanById(subscriptionData.plan_id);
      if (!plan) throw new Error('Subscription plan not found');

      const now = new Date();
      const trialEnd = subscriptionData.trial_days 
        ? new Date(now.getTime() + subscriptionData.trial_days * 24 * 60 * 60 * 1000)
        : null;

      const periodEnd = new Date(now);
      if (subscriptionData.billing_cycle === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      const { data, error } = await supabase
        .from('trainer_subscriptions')
        .insert({
          trainer_id: trainerId,
          plan_id: subscriptionData.plan_id,
          status: trialEnd ? 'trialing' : 'active',
          billing_cycle: subscriptionData.billing_cycle,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          trial_end: trialEnd?.toISOString(),
          cancel_at_period_end: false,
          stripe_subscription_id: subscriptionData.stripe_subscription_id,
          stripe_customer_id: subscriptionData.stripe_customer_id,
        })
        .select(`
          *,
          plan:plan_id (*)
        `)
        .single();

      if (error) throw error;
      return data as TrainerSubscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  },

  updateSubscription: async (subscriptionId: string, updates: {
    plan_id?: string;
    billing_cycle?: 'monthly' | 'yearly';
    status?: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'incomplete';
    cancel_at_period_end?: boolean;
  }): Promise<TrainerSubscription> => {
    try {
      const { data, error } = await supabase
        .from('trainer_subscriptions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId)
        .select(`
          *,
          plan:plan_id (*)
        `)
        .single();

      if (error) throw error;
      return data as TrainerSubscription;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  },

  cancelSubscription: async (subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<TrainerSubscription> => {
    try {
      const updates: any = {
        cancel_at_period_end: cancelAtPeriodEnd,
        updated_at: new Date().toISOString(),
      };

      if (!cancelAtPeriodEnd) {
        updates.status = 'cancelled';
      }

      const { data, error } = await supabase
        .from('trainer_subscriptions')
        .update(updates)
        .eq('id', subscriptionId)
        .select(`
          *,
          plan:plan_id (*)
        `)
        .single();

      if (error) throw error;
      return data as TrainerSubscription;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  },

  reactivateSubscription: async (subscriptionId: string): Promise<TrainerSubscription> => {
    try {
      const { data, error } = await supabase
        .from('trainer_subscriptions')
        .update({
          status: 'active',
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId)
        .select(`
          *,
          plan:plan_id (*)
        `)
        .single();

      if (error) throw error;
      return data as TrainerSubscription;
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw error;
    }
  },

  // Usage Tracking
  getSubscriptionUsage: async (trainerId: string, periodStart?: string, periodEnd?: string): Promise<SubscriptionUsage | null> => {
    try {
      const subscription = await SubscriptionsAPI.getTrainerSubscription(trainerId);
      if (!subscription) return null;

      const start = periodStart || subscription.current_period_start;
      const end = periodEnd || subscription.current_period_end;

      // Get clients count
      const { count: clientsCount } = await supabase
        .from('trainer_client_relationships')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', trainerId)
        .eq('status', 'active');

      // Get bookings count for the period
      const { count: bookingsCount } = await supabase
        .from('trainer_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', trainerId)
        .gte('created_at', start)
        .lte('created_at', end);

      // Get storage usage (placeholder - would need actual file storage tracking)
      const storageUsedMb = 0; // TODO: Implement actual storage tracking

      // Get API calls count (placeholder - would need actual API tracking)
      const apiCallsCount = 0; // TODO: Implement actual API call tracking

      // Get features used (based on actual usage)
      const featuresUsed: string[] = [];
      
      // Check if analytics is being used
      const { count: analyticsUsage } = await supabase
        .from('trainer_analytics_views')
        .select('*', { count: 'exact', head: true })
        .eq('trainer_id', trainerId)
        .gte('viewed_at', start)
        .lte('viewed_at', end);

      if (analyticsUsage && analyticsUsage > 0) {
        featuresUsed.push('analytics');
      }

      return {
        trainer_id: trainerId,
        period_start: start,
        period_end: end,
        clients_count: clientsCount || 0,
        bookings_count: bookingsCount || 0,
        storage_used_mb: storageUsedMb,
        api_calls_count: apiCallsCount,
        features_used: featuresUsed,
      };
    } catch (error) {
      console.error('Error fetching subscription usage:', error);
      throw error;
    }
  },

  checkUsageLimits: async (trainerId: string): Promise<{
    clients: { current: number; limit: number; exceeded: boolean };
    bookings: { current: number; limit: number; exceeded: boolean };
    features: { available: string[]; restricted: string[] };
  }> => {
    try {
      const subscription = await SubscriptionsAPI.getTrainerSubscription(trainerId);
      if (!subscription || !subscription.plan) {
        throw new Error('No active subscription found');
      }

      const usage = await SubscriptionsAPI.getSubscriptionUsage(trainerId);
      if (!usage) throw new Error('Unable to fetch usage data');

      const plan = subscription.plan;

      return {
        clients: {
          current: usage.clients_count,
          limit: plan.max_clients,
          exceeded: usage.clients_count > plan.max_clients,
        },
        bookings: {
          current: usage.bookings_count,
          limit: plan.max_bookings_per_month,
          exceeded: usage.bookings_count > plan.max_bookings_per_month,
        },
        features: {
          available: plan.features,
          restricted: [], // Features not available in current plan
        },
      };
    } catch (error) {
      console.error('Error checking usage limits:', error);
      throw error;
    }
  },

  // Billing History
  getBillingHistory: async (trainerId: string, filters: {
    status?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<BillingHistory[]> => {
    try {
      let query = supabase
        .from('subscription_billing_history')
        .select('*')
        .eq('trainer_id', trainerId);

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.from_date) {
        query = query.gte('created_at', filters.from_date);
      }
      if (filters.to_date) {
        query = query.lte('created_at', filters.to_date);
      }

      query = query
        .order('created_at', { ascending: false })
        .limit(filters.limit || 50);

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching billing history:', error);
      throw error;
    }
  },

  createBillingRecord: async (billingData: {
    trainer_id: string;
    subscription_id: string;
    amount: number;
    currency: string;
    status: 'paid' | 'pending' | 'failed' | 'refunded';
    billing_reason: 'subscription_cycle' | 'subscription_create' | 'subscription_update' | 'invoice_payment_failed';
    invoice_url?: string;
    stripe_invoice_id?: string;
  }): Promise<BillingHistory> => {
    try {
      const { data, error } = await supabase
        .from('subscription_billing_history')
        .insert(billingData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating billing record:', error);
      throw error;
    }
  },

  // Subscription Analytics
  getSubscriptionAnalytics: async (trainerId: string) => {
    try {
      const subscription = await SubscriptionsAPI.getTrainerSubscription(trainerId);
      if (!subscription) return null;

      const usage = await SubscriptionsAPI.getSubscriptionUsage(trainerId);
      const billingHistory = await SubscriptionsAPI.getBillingHistory(trainerId, { limit: 12 });

      // Calculate subscription metrics
      const totalSpent = billingHistory
        .filter(bill => bill.status === 'paid')
        .reduce((sum, bill) => sum + bill.amount, 0);

      const averageMonthlySpend = billingHistory.length > 0 
        ? totalSpent / Math.min(billingHistory.length, 12)
        : 0;

      // Calculate days until renewal
      const daysUntilRenewal = Math.ceil(
        (new Date(subscription.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate usage percentages
      const clientsUsagePercent = subscription.plan 
        ? Math.round((usage?.clients_count || 0) / subscription.plan.max_clients * 100)
        : 0;

      const bookingsUsagePercent = subscription.plan
        ? Math.round((usage?.bookings_count || 0) / subscription.plan.max_bookings_per_month * 100)
        : 0;

      return {
        subscription,
        usage,
        billing: {
          total_spent: totalSpent,
          average_monthly_spend: averageMonthlySpend,
          days_until_renewal: daysUntilRenewal,
          next_billing_date: subscription.current_period_end,
        },
        usage_percentages: {
          clients: clientsUsagePercent,
          bookings: bookingsUsagePercent,
        },
        recommendations: SubscriptionsAPI.getUpgradeRecommendations(subscription, usage),
      };
    } catch (error) {
      console.error('Error fetching subscription analytics:', error);
      throw error;
    }
  },

  getUpgradeRecommendations: (subscription: TrainerSubscription, usage: SubscriptionUsage | null) => {
    const recommendations: string[] = [];

    if (!subscription.plan || !usage) return recommendations;

    // Check if approaching limits
    if (usage.clients_count > subscription.plan.max_clients * 0.8) {
      recommendations.push('Consider upgrading your plan - you\'re using 80% of your client limit');
    }

    if (usage.bookings_count > subscription.plan.max_bookings_per_month * 0.8) {
      recommendations.push('Consider upgrading your plan - you\'re using 80% of your monthly booking limit');
    }

    // Check feature usage
    if (usage.features_used.includes('analytics') && !subscription.plan.analytics_access) {
      recommendations.push('Upgrade to access advanced analytics features');
    }

    return recommendations;
  },

  // Subscription Webhooks (for Stripe integration)
  handleSubscriptionWebhook: async (webhookData: {
    type: string;
    subscription_id: string;
    customer_id: string;
    status?: string;
    current_period_start?: number;
    current_period_end?: number;
    trial_end?: number;
    cancel_at_period_end?: boolean;
  }) => {
    try {
      const { data: subscription, error } = await supabase
        .from('trainer_subscriptions')
        .select('*')
        .eq('stripe_subscription_id', webhookData.subscription_id)
        .single();

      if (error) throw error;

      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      switch (webhookData.type) {
        case 'customer.subscription.updated':
          if (webhookData.status) updates.status = webhookData.status;
          if (webhookData.current_period_start) {
            updates.current_period_start = new Date(webhookData.current_period_start * 1000).toISOString();
          }
          if (webhookData.current_period_end) {
            updates.current_period_end = new Date(webhookData.current_period_end * 1000).toISOString();
          }
          if (webhookData.trial_end) {
            updates.trial_end = new Date(webhookData.trial_end * 1000).toISOString();
          }
          if (webhookData.cancel_at_period_end !== undefined) {
            updates.cancel_at_period_end = webhookData.cancel_at_period_end;
          }
          break;

        case 'customer.subscription.deleted':
          updates.status = 'cancelled';
          break;

        case 'invoice.payment_succeeded':
          // Create billing record
          await SubscriptionsAPI.createBillingRecord({
            trainer_id: subscription.trainer_id,
            subscription_id: subscription.id,
            amount: 0, // Would get from webhook data
            currency: 'USD',
            status: 'paid',
            billing_reason: 'subscription_cycle',
            stripe_invoice_id: webhookData.subscription_id, // Would be invoice ID
          });
          break;

        case 'invoice.payment_failed':
          updates.status = 'past_due';
          await SubscriptionsAPI.createBillingRecord({
            trainer_id: subscription.trainer_id,
            subscription_id: subscription.id,
            amount: 0, // Would get from webhook data
            currency: 'USD',
            status: 'failed',
            billing_reason: 'invoice_payment_failed',
            stripe_invoice_id: webhookData.subscription_id, // Would be invoice ID
          });
          break;
      }

      if (Object.keys(updates).length > 1) { // More than just updated_at
        await supabase
          .from('trainer_subscriptions')
          .update(updates)
          .eq('id', subscription.id);
      }

      return { success: true };
    } catch (error) {
      console.error('Error handling subscription webhook:', error);
      throw error;
    }
  },
}; 