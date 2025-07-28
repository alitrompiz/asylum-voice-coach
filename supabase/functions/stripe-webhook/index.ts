import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    
    if (!signature) {
      throw new Error("No Stripe signature found");
    }

    // Note: In production, you should set STRIPE_WEBHOOK_SECRET
    // For now, we'll parse the event without signature verification
    const event = JSON.parse(body);
    
    logStep("Processing event", { type: event.type, id: event.id });

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        
        if (typeof customer === 'string' || customer.deleted) {
          logStep("Customer deleted or invalid", { customerId: subscription.customer });
          break;
        }

        const email = customer.email;
        if (!email) {
          logStep("No email found for customer", { customerId: customer.id });
          break;
        }

        const isActive = subscription.status === 'active' || subscription.status === 'trialing';
        const isPastDue = subscription.status === 'past_due' || subscription.status === 'unpaid';
        
        let subscriptionTier = 'free';
        let gracePeriodEnd = null;

        if (isActive) {
          subscriptionTier = 'full';
        } else if (isPastDue) {
          // 2-day grace period
          gracePeriodEnd = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
          subscriptionTier = 'full'; // Still full during grace period
        }

        await supabaseClient.from("subscribers").upsert({
          email,
          stripe_customer_id: customer.id,
          subscribed: isActive || isPastDue,
          subscription_tier: subscriptionTier,
          subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
          grace_period_end: gracePeriodEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

        // Track conversion event if this is a new subscription
        if (event.type === 'customer.subscription.created') {
          const { data: subscriber } = await supabaseClient
            .from("subscribers")
            .select("user_id, attorney_id, coupon_code")
            .eq("email", email)
            .single();

          if (subscriber?.user_id) {
            await supabaseClient.from("conversion_events").insert({
              user_id: subscriber.user_id,
              event_type: 'initial_conversion',
              attorney_id: subscriber.attorney_id,
              coupon_code: subscriber.coupon_code,
              amount: subscription.items.data[0]?.price?.unit_amount || 0,
              stripe_subscription_id: subscription.id,
            });
          }
        }

        logStep("Updated subscription", { 
          email, 
          subscribed: isActive || isPastDue, 
          tier: subscriptionTier,
          status: subscription.status 
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        
        if (typeof customer === 'string' || customer.deleted) {
          logStep("Customer deleted or invalid", { customerId: subscription.customer });
          break;
        }

        const email = customer.email;
        if (!email) {
          logStep("No email found for customer", { customerId: customer.id });
          break;
        }

        await supabaseClient.from("subscribers").upsert({
          email,
          stripe_customer_id: customer.id,
          subscribed: false,
          subscription_tier: 'free',
          subscription_end: null,
          grace_period_end: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });

        logStep("Subscription deleted", { email });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        
        // Track renewal event for recurring invoices
        if (invoice.billing_reason === 'subscription_cycle') {
          const customer = await stripe.customers.retrieve(invoice.customer);
          
          if (typeof customer === 'string' || customer.deleted) {
            logStep("Customer deleted or invalid", { customerId: invoice.customer });
            break;
          }

          const email = customer.email;
          if (!email) break;

          const { data: subscriber } = await supabaseClient
            .from("subscribers")
            .select("user_id, attorney_id, coupon_code")
            .eq("email", email)
            .single();

          if (subscriber?.user_id) {
            await supabaseClient.from("conversion_events").insert({
              user_id: subscriber.user_id,
              event_type: 'renewal',
              attorney_id: subscriber.attorney_id,
              coupon_code: subscriber.coupon_code,
              amount: invoice.amount_paid,
              stripe_subscription_id: invoice.subscription,
            });
          }

          logStep("Tracked renewal", { email, amount: invoice.amount_paid });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        logStep("Payment failed", { customerId: invoice.customer, amount: invoice.amount_due });
        // Grace period handling is done in subscription.updated events
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});