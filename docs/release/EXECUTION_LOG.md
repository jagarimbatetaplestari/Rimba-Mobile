# Release readiness execution log

Branch: fix/rimba-release-readiness. Scope: freemium without real-tree claims, global outside EU, iPhone+iPad.

## Foundation checkpoint

- Subscription status/store contracts compile; soundscape now receives its nested entitlement object.
- Canceled auto-renewal retains an otherwise valid paid entitlement until expiry.
- Account deletion propagates server/network errors before local teardown; missing identity is rejected and a changed account is not wiped by a late response.
- Added Vitest tests against production auth store and entitlement hook: 9/9 passed. Three deletion failures and one canceled-access failure were reproduced before fixes.
- npm run typecheck and npm run build passed.

Not complete: prelaunch's old OAuth assertion remains unresolved; tests are not proof of native login/purchases. Apple revocation and server-only deletion remain to be implemented. No production settings changed. Do not deploy the current deletion RPC as a final Apple-compliant solution.

Next: complete regression coverage and sync protection, inventory cloud policies, then implement provider/session isolation and server deletion. Follow D:/Project/Rimba/docs/superpowers/plans/2026-11-01-rimba-app-store-readiness.md. Never run root sync blindly: it overwrites Mobile auth/game/UI from Website.

## Auth, sync, billing and legal checkpoint (2026-11-01)

- Reproduced six sync races/failure cases, then fixed account-bound upload payloads, delayed responses, A->B->A invalidation, timers, and false-success after cloud read/upload errors. Account invalidation also fires when Supabase identity changes, before profile hydration finishes. Watcher initialization is lazy to avoid the existing circular module graph; a real graph import regression test covers this.
- Reproduced four auth lifecycle bugs. Supabase callbacks now return synchronously, defer queries until outside the callback and discard stale profile hydration after logout/account changes. Persisted profile without a session is cleared. Explicit provider/email action race handling and owner-scoped local saves still require work.
- Apple nonce now requires WebCrypto random bytes and SHA-256; no weak fallback. Apple name cache is keyed by user ID; legacy shared name cache is ignored.
- Both deletion confirmation UIs now retain the dialog and show an error after failure, with pending controls. The legacy deletion RPC remains in use; Apple reauthorization/revocation and Storage API deletion are NOT done.
- Live catalog audit: profiles includes email with public SELECT policies; clients have TRUNCATE grants; subscription INSERT/UPDATE is client-writable. Prepared migration 20261101023438_restrict_client_privileges.sql, NOT APPLIED. It limits profile column reads, removes client TRUNCATE/etc, and reserves subscription writes for the server. Ten PGlite tests reproduce live grant/policy behavior with fictional rows; six failures were reproduced before the migration. This is isolated PostgreSQL coverage, not proof of deployed policies.
- Literal-import RevenueCat Capacitor 8.0.0 (peer Capacitor 6) is installed. Eleven IAP failures reproduced then corrected; twelve IAP tests pass. Purchases require authenticated stable user ID; exact rimba_pro entitlement/product and genuine non-expired store expiry. No arbitrary entitlement, fabricated expiry, client cloud entitlement upsert, or unrelated restore fallback. Late results cannot activate another account. Production debug Pro grant removed; no fake tree/certificate payload. Paywall loads storefront prices and disables unavailable purchases.
- Existing prelaunch OAuth source assertion was obsolete. Replaced with clearly labeled entry-point smoke checks; these do NOT establish native provider readiness.
- Safe shared-asset preview script is versioned under Mobile/scripts/sync-shared-assets.mjs. Root scripts/sync-platforms.mjs now delegates to it. Default is read-only; only --apply-assets copies an explicit public-asset allowlist. Auth, game, UI, types and native bridges are never copied from older Website. Preview found 9 asset differences; no assets copied.
- User authorized Rimba-Website changes. Branch fix/rimba-store-legal; legal ID/EN and public privacy.html are aligned with Mobile. Replaced simulated deletion success with real support-email link and clear in-app deletion instructions. No website deployment/push yet.
- Confirmed by user: all Rimba asset rights/licenses; base prices IDR 29,000 monthly / 179,000 annual / 349,000 lifetime; support email jagarimba.tetaplestari@gmail.com. Release still global non-EU and iPhone+iPad, no real-tree benefits.
- User confirmed RevenueCat email and authorized sending existing IAP key VV2BGUYC5N to RevenueCat Rimba. App config created in project f860c3d3: app25d76d4a53, bundle com.syntheticae.rimba; UI shows Valid credentials. No App Store Connect API key uploaded to RevenueCat. Public iOS SDK key is saved only in ignored .env.local; CI key pending. Evidence: local visualizations/rimba-revenuecat-credentials.png. No key contents logged.
- Apple draft product group 22533477 created; monthly 6829362346, annual 6829362411, lifetime 6829362449. Product IDs exactly match code; lifetime NON_CONSUMABLE. All MISSING_METADATA; prices, localizations, availability, screenshots and RevenueCat entitlement/offering mapping remain unfinished. See STORE_PRODUCTS.json.
- Google Cloud browser logged in as thesyntheticae@gmail.com, current unrelated project Trouvaille; no Rimba project found. Asked which owner/project to use. Do not edit Trouvaille.

Verification so far: 46/46 Vitest, 157/157 prelaunch source/mock assertions, Mobile and Website typecheck/build passed. Re-run build after subsequent edits. No native device claims; no production database changes; no review submission.

Remaining release blockers: native Apple/Google provider configuration and sessions, safe server deletion/revocation, owner-scoped save recovery and guest migration, verified server entitlement integration/renewal/refund, full IAP catalog/availability, social membership/moderation, native UX/performance/iPad, CI/binary/privacy manifest/screenshots, final store metadata/privacy/reviewer/acceptance. Rimba is NOT ready to submit yet.
