# Server billing verification rollout (prepared, not deployed)

RevenueCat project f860c3d3, App Store app app25d76d4a53, entitlement rimba_pro. Default offering ofrng77d9984a86 now maps monthly/annual/lifetime packages to the three existing Apple products. The app uses its own paywall; no hosted RevenueCat paywall or web purchase link is required.

## Proposed server deployment

- Migration 20261101102757_trusted_billing_state.sql creates owner-scoped billing cache and webhook receipts. It grants no client writes and no anonymous reads. Sandbox cache never promotes the production user_subscriptions mirror. Existing saves are untouched.
- reconcile-subscription verifies the caller using Supabase Auth and ignores any body user_id/isPro. It fetches current RevenueCat subscriber state using the existing Rimba public SDK API key directly from the server and commits through a per-owner/environment lease.
- revenuecat-webhook requires a dedicated authorization value, exact Rimba app ID and a bounded valid event. It re-fetches current subscriber data rather than granting access from webhook fields; transfers reconcile both affected account IDs. Successful event receipts deduplicate retries. Failed fetches do not replace previous rights and release only their own lease.
- Functions use service-role-only database routines; external API calls occur outside SQL transactions. A lease expires after30seconds; stale workers cannot finalize or release a successor's work.
- Authentication and runtime entitlement checks still require caller identity, environment, expiry and current verification. The client integration/offline provenance gate remains OPEN. This backend alone does not validate purchases on a device or make the app ready.

## Credentials / confirmation

No new privileged RevenueCat API key is needed: the documented GET subscriber endpoint accepts the existing public SDK key and returns the required entitlement/purchase fields. Store that existing key as REVENUECAT_API_KEY on the server; do not create a broad API-v1 secret key. Owner approval is required for the new webhook authorization secret stored in RevenueCat and Supabase, the server-only billing migration, and endpoint deployment. The server service-role credential and webhook secret never enter NEXT_PUBLIC, Git, logs or chat.

reconcile-subscription can keep gateway JWT verification in addition to its Auth check. revenuecat-webhook needs gateway JWT verification off because RevenueCat sends its own dedicated secret, not a Supabase user JWT. The handler then authenticates every request itself; do not deploy that webhook without a strong configured secret. Limit integration to Rimba's App Store app and both store environments, with environment separation in storage.

## Acceptance still required

Test authenticated email account, wrong/missing webhook header, TEST event, duplicate event, expired lease, foreign account read denial, and no grant on API failure. Use disposable sandbox accounts for monthly/annual/lifetime, pending/cancel/restore, renewal/refund/transfer and offline scenarios. Do not use human purchase/account deletion for automated tests. Native TestFlight acceptance remains mandatory.

Official references checked: https://www.revenuecat.com/docs/api-v1/customer-info-model and https://www.revenuecat.com/docs/integrations/webhooks .
