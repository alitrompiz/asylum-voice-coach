import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get admin settings for price
    const { data: settings } = await supabaseService
      .from("admin_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["monthly_price_cents", "stripe_price_id"]);

    const monthlyPriceCents = parseInt(settings?.find(s => s.setting_key === "monthly_price_cents")?.setting_value || "19900");
    const stripePriceId = settings?.find(s => s.setting_key === "stripe_price_id")?.setting_value;

    logStep("Retrieved settings", { monthlyPriceCents, stripePriceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id }
      });
      customerId = newCustomer.id;
      logStep("Created new customer", { customerId });
    }

    // Check if user has an attorney for coupon
    const { data: subscriber } = await supabaseService
      .from("subscribers")
      .select("attorney_id, attorneys(coupon_code)")
      .eq("user_id", user.id)
      .single();

    let discounts = undefined;
    let couponCode = null;

    if (subscriber?.attorney_id && subscriber.attorneys?.coupon_code) {
      couponCode = subscriber.attorneys.coupon_code;
      try {
        // Check if coupon exists in Stripe
        const coupon = await stripe.coupons.retrieve(couponCode);
        discounts = [{ coupon: couponCode }];
        logStep("Applied attorney coupon", { couponCode });
      } catch (error) {
        logStep("Coupon not found in Stripe, proceeding without discount", { couponCode });
      }
    }

    // Create checkout session
    const sessionParams: any = {
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Full Prep - Monthly Subscription",
              description: "Unlimited minutes, all officers, all areas of focus, priority support"
            },
            unit_amount: monthlyPriceCents,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/dashboard?checkout=success`,
      cancel_url: `${req.headers.get("origin")}/dashboard?checkout=canceled`,
      metadata: {
        user_id: user.id,
        attorney_coupon: couponCode || ""
      }
    };

    if (discounts) {
      sessionParams.discounts = discounts;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep("Created checkout session", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ 
      url: session.url,
      attorney_benefit_applied: !!couponCode 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});