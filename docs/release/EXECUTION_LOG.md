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

## Google native configuration checkpoint (2026-11-01)

- User switched Google Cloud to jagarimba.tetaplestari@gmail.com and explicitly authorized creating the Rimba project. Created rimba-focus-garden (project number 475693230434), no paid service/billing enrollment.
- User reviewed and authorized Google API Services User Data Policy at the confirmation step; consent identity Rimba: Focus & Digital Forest, external audience, support/developer contact confirmed.
- User explicitly authorized creating web+iOS OAuth clients, private backup and Supabase secret configuration. Web client name Rimba Supabase Web, ID 475693230434-du494aucdevbi7d8gn4v71tse9clhh86.apps.googleusercontent.com. Callback only https://rkljugrrscmqopeuwtpd.supabase.co/auth/v1/callback. iOS client ID 475693230434-pd36p3isodu8jo7tem4tgjja8rm5u61b.apps.googleusercontent.com, bundle com.syntheticae.rimba, Apple Team VU4PP3SY5B, App Store ID 6825621183.
- Web secret and client metadata backed up only at D:/Project/Apple Dev/Rimba_Google_OAuth.json. No secret values in repo/chat/logs. Public client IDs and RevenueCat key in ignored .env.local; CI config still needed.
- Supabase Google provider enabled with web client ID first plus iOS audience and web secret. Skip nonce checks and allow-missing-email remain OFF; email confirmation stays ON. Public /auth/v1/settings verified google=true, apple=false, email=true, mailer_autoconfirm=false.
- Replaced optional unbundled Google imports/browser-origin native fallback with literal @capgo/capacitor-social-login 6.0.1 import. Native flow requires ID token and matching Supabase user+session; checks the current session again after profile hydration. Six production-store regressions RED->GREEN cover SDK exchange, cancellation, missing token/session, stale account and missing config. No native/device success claim yet.
- Ruling: use Capgo 6.0.1 instead of the old Codetrix RC plugin — Codetrix pins GoogleSignIn 6.2.4; Capgo supports Capacitor >=6 and GoogleSignIn 8.0 — cost: extra linked Facebook/Alamofire dependencies and native privacy/compile checks remain required. Only Google is initialized; Facebook is not configured.
- iOS reversed-client URL scheme registered; deployment target/Podfile aligned to documented iOS16+; Google URL handling added to AppDelegate while preserving other Capacitor URLs (Google official sign-in integration docs). Capacitor sync finds Google and RevenueCat plugins. Pods/Xcode deliberately unverified on Windows; CI macOS must compile and inspect privacy manifests.
- Restore button now actually requests the store even if cached Pro is active.
- RevenueCat entitlement rimba_pro created (entlaf63df5d1e) and all three App Store products associated: monthly prodbf5e7ccae5, annual prod8f8e433f07, lifetime prod87e1842347. Lifetime configured non-consumable. Offering/default packages still pending.
- User approved Website branch and main publication. Pushed fix/rimba-store-legal and fast-forwarded remote main to 6c68865. Public domain still serves old/fallback content after push; do NOT claim legal deployment complete. Cloudflare worker name rimba-website, account e068179e7b16f10a271b58d01c89d68d; user logged in. Investigating build f45a4ec8-881a-4e6d-87fa-f7d322603f4b in dashboard. No arbitrary worker/config changes yet.

Current verification: 52/52 Vitest, mobile typecheck and npm run build passed after Google integration. Subsequent AppDelegate-only change requires macOS compile; rerun build before final checkpoint as required. Google consent audience is still Testing and branding URLs not filled; these remain release blockers. Account-owner save isolation/migration and server deletion are not solved by callback race guards alone. No Rimba mobile branch push, TestFlight build, database migration or review submission yet.

## Published legal and native CI checkpoint

- Website main 6c68865 is deployed by Cloudflare build 93fcae38-1a71-4952-a4fc-99a25d484ba2, active Worker version 2043c3de at 100% traffic. Earlier stale responses were cache propagation, not a failed new build. Verified canonical /privacy, /terms, /delete-account, /privacy.html: HTTP200 and new support email; privacy routes include RevenueCat, deletion route no simulated success. Public ID/EN pages inspected in the browser and screenshot reviewed. No Cloudflare settings changed.
- Google branding saved with homepage/privacy/terms URLs and authorized domain jagarimba-tetaplestari.workers.dev. Audience changed from Testing to In production for the intended public basic email/profile sign-in (no logo, sensitive or restricted scopes added). UI confirmed In production. Real-device SDK authorization/token/nonce acceptance remains untested; leave nonce checks ON.
- Added verify-ios.yml: branch push triggers tests/static export and unsigned simulator compilation on macOS with SDK>=26. No signing secrets or App Store upload. Google client IDs are public configuration; RevenueCat runtime key for release CI still pending. Candidate is not a TestFlight release.
- Next patch aligned to 14.2.35 without React/Capacitor major upgrade. npm audit still reports unresolved dependencies; do not claim all vulnerabilities resolved. Static-export exposure and remaining advisories require final review.
- Latest: 52/52 Vitest, 157/157 prelaunch smoke/mock assertions, typecheck and npm run build passed. Native CocoaPods/Xcode checks remain for CI; local cap sync completed with expected Windows skip of Pods/Xcode.
- Final review remains pending for the overall release branch; these are implementation checkpoints, not completed App Store readiness.
