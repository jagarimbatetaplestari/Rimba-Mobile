# Rimba account deletion deployment checkpoint

Endpoint: `supabase/functions/delete-account/index.ts`.

- Verified caller session via Supabase Auth; request `expectedUserId` must match.
- Apple-linked accounts require fresh native authorization. Server validates Apple signature, issuer, audience, linked subject and expiry before revoking the refresh token.
- Inventory comes from caller-scoped `list_account_media()`. Service-role Storage API removes only verified owner/prefix avatar paths, including legacy owned paths. Auth Admin DELETE runs only after empty inventory; FK cascades remove profile/save/subscription.
- Gateway JWT verification must remain enabled. No service key or Apple private key may enter client environment or Git.

Required Edge secrets: `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`; Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Client ID is fixed to `com.syntheticae.rimba`.

The user authorized creation/configuration/deployment. Apple key R9B28XR2MR was created for the Rimba primary App ID and backed up privately under Apple Dev. **Secret installation, Apple provider activation and endpoint deployment have NOT completed.** The first deploy was not executed because automatic approval review hit a usage limit. On resume, the connector exposes only other projects and local browser control is disabled; restore these accesses before deploying.

Before rollout: verify live function/config without exposing secrets; test only an explicitly disposable reviewer/test account. Check cancel sheet leaves account intact, successful deletion removes physical media/Auth rows and Apple authorization, and a new login requests authorization. Retire client EXECUTE on legacy `delete_user_account()` only after the replacement endpoint is live and the candidate is available; old versions otherwise lose their deletion path.

Local regression evidence: 23 endpoint tests (including real RSA/ECDSA crypto), 12 client-flow tests. Native device acceptance is still pending. Local progress must be cleared only after `{ deleted: true }`, and Apple-linked users also require `appleRevoked: true`.
