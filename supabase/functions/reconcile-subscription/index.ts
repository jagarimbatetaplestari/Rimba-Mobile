import { createBillingHandler } from './handler.ts';
Deno.serve(createBillingHandler({
 supabaseUrl:Deno.env.get('SUPABASE_URL')??'',
 anonKey:Deno.env.get('SUPABASE_ANON_KEY')??'',
 serviceRoleKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'',
 revenueCatKey:Deno.env.get('REVENUECAT_API_KEY')??'',
 webhookAuthorization:Deno.env.get('REVENUECAT_WEBHOOK_AUTHORIZATION')??'',
 appId:'app25d76d4a53',
}));
