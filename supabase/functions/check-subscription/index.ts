import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      await supabaseClient.from("subscribers").upsert({
        email: user.email,
        user_id: user.id,
        stripe_customer_id: null,
        subscribed: false,
        subscription_tier: 'free',
        subscription_end: null,
        grace_period_end: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });
      return new Response(JSON.stringify({ 
        subscribed: false, 
        subscription_tier: 'free',
        subscription_end: null,
        grace_period_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    // Check for active or past_due subscriptions
    const activeSubscription = subscriptions.data.find(sub => 
      sub.status === 'active' || sub.status === 'past_due' || sub.status === 'unpaid'
    );

    let subscribed = false;
    let subscriptionTier = 'free';
    let subscriptionEnd = null;
    let gracePeriodEnd = null;

    if (activeSubscription) {
      subscriptionEnd = new Date(activeSubscription.current_period_end * 1000).toISOString();
      
      // Handle grace period for past_due/unpaid subscriptions
      if (activeSubscription.status === 'past_due' || activeSubscription.status === 'unpaid') {
        const gracePeriodDays = 2;
        gracePeriodEnd = new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000).toISOString();
        subscribed = new Date() <= new Date(gracePeriodEnd);
      } else {
        subscribed = true;
      }

      if (subscribed) {
        subscriptionTier = 'full';
      }

      logStep("Subscription found", { 
        subscriptionId: activeSubscription.id, 
        status: activeSubscription.status,
        endDate: subscriptionEnd,
        gracePeriodEnd,
        subscribed
      });
    } else {
      logStep("No active subscription found");
    }

    // Update subscriber record
    await supabaseClient.from("subscribers").upsert({
      email: user.email,
      user_id: user.id,
      stripe_customer_id: customerId,
      subscribed,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      grace_period_end: gracePeriodEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    logStep("Updated database with subscription info", { subscribed, subscriptionTier });
    return new Response(JSON.stringify({
      subscribed,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      grace_period_end: gracePeriodEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});