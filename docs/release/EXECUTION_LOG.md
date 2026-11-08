# Release readiness execution log

## Post-Launch Quality & Production Polish — 8 November 2026, 13:00 WIB

Rimba telah resmi disetujui oleh Apple dan terdistribusi di App Store (Build 1.0 (15)). Sesi ini mengeksekusi 6 perbaikan menyeluruh terhadap masukan pengguna nyata di produksi sesuai rencana `implementation_plan.md`:

1. **Email OTP 6-Digit & Scanner Auto-Confirm Recovery (Masalah 1)**:
   - Dihilangkan `{{ .ConfirmationURL }}` dan link button dari template email Supabase (`confirmation.html`, `magic_link.html`, `recovery.html`) untuk mencegah Apple Mail Privacy Protection dan scanner email menginvalidasi OTP sebelum pengguna memasukkannya.
   - Ditambahkan automatic fallback login recovery via `signInWithPassword` saat OTP gagal diverifikasi karena sudah dikonfirmasi scanner.
   - Standardisasi OTP ke 6 digit (`EMAIL_OTP_STANDARD_LENGTH = 6`, `EMAIL_OTP_MIN_LENGTH = 6`, `EMAIL_OTP_MAX_LENGTH = 8`), placeholder `"123456"`, dan pembaruan salinan i18n EN/ID.
2. **iOS Widgets Polish & Action Bridge (Masalah 2)**:
   - Diperbarui SwiftUI `RimbaWidgetsBundle.swift` dengan desain Liquid Glass adaptif yang mendukung Dark Mode dan Light Mode melalui `@Environment(\.colorScheme)`.
   - Emoji native `🔥` digantikan dengan SF Symbol `Image(systemName: "flame.fill")`.
   - Ditambahkan penanganan sesi jeda (`pausedRemainingSeconds`) sehingga widget menampilkan teks sisa waktu statis saat dijeda dan tidak terus menghitung mundur di background.
   - Diperluas `consumeAction` dan `widgetActions.ts` untuk mendukung rute `rimba://open`.
3. **Pembersihan Emoji Bawaan & Mojibake (Masalah 3)**:
   - Menghapus emoji native dari seluruh toast, HUD, status fauna, dan modal (~40 pemanggilan `notify(...)`).
   - Replaced mojibake avatar fallback `'ðŸ¦Œ'` dengan `\u{1F98C}` di `useAuthStore.ts`.
   - Ditambahkan regex sanitizer di `NotificationToast.tsx` untuk menyaring emoji yang tersisa.
4. **Invarian Waktu Pause / Resume Fokus (Masalah 4)**:
   - Menambahkan `paused_remaining_ms` di `FocusSession` sebagai snapshot sisa waktu saat jeda manual.
   - `resumeFocus` memulihkan sisa waktu dari snapshot, menjamin sisa waktu identik sebelum jeda dan setelah lanjut (selisih 0 detik).
   - Penyeragaman pembulatan waktu display ke `Math.ceil` di seluruh komponen (`MobileFocusCard`, `ZenFocusOverlay`, `FocusSapling`).
5. **Panduan / Tur Interaktif Pasca-Onboarding (Masalah 5)**:
   - Dibuat `useTourStore.ts` dengan penyimpanan per-owner di localStorage (`rimba_tour_v1_<owner>`).
   - Dibuat `GuidedTour.tsx` dengan SVG spotlight cutout mask, kartu Liquid Glass, 9 langkah interaktif menyorot elemen HUD nyata (`sanctuary-island`, `cockpit-category`, `cockpit-timer`, `cockpit-start`, `hud-header`, `hud-workshop`, `hud-journal`, `hud-audio`).
   - Ditambahkan tombol "Panduan Interaktif" di `MobileSettingsSheet.tsx` untuk memulai ulang tur kapan saja.
6. **Pulau Penuh & Panduan Perluasan Lahan (Masalah 6)**:
   - Ditambahkan choke-point di `startFocus`: jika `getLandFullState().isFull` dan bukan mode tanpa-pohon, sesi dicegah dan event `rimba:land_full` dipancarkan.
   - Dibuat `LandFullModal.tsx` yang menawarkan opsi Perluas Lahan, Fokus Tanpa Pohon (`no_tree: true`), atau Pindah Pulau.
   - Dihilangkan fallback koordinat `[0, 0.05, 0]` di `FocusSapling.tsx`.
   - Ditambahkan proteksi reservasi petak target pada `confirmRelocation` dan `placeCatalogItem`.

**Verifikasi & Gerbang Rilis**:
- `npm test`: 48 test files passed (414 tests passed, 0 failed).
- `npm run typecheck`: 0 errors (`tsc --noEmit` bersih).
- `npm run test:prelaunch`: 155/155 assertions passed.
- `npm run build`: 12/12 static pages exported successfully.
- `git diff --check`: 0 whitespace/conflict warnings.

## Resubmission — 3 November 2026, 11:32 WIB

- Apple requested Guideline2.1 Information Needed: physical-device video and six review-information categories; no specific crash/bug identified. Owner supplied two recordings, authorized editing and then explicitly instructed submit, reporting iPhone13/iOS27.0.1.
- Saved3910-character English Notes and uploaded edited179.033s MP4. Notes retain honest omissions (full registration, Campfire report/block, actual two-sound mixer use), explain services/regions/purpose/access/content rights using prior owner asset confirmation. Existing demo credentials preserved and actual login verified without admin access.
- Apple attachment925232b8-3bd3-4cfe-ae0f-5c5d202b3099 processing delayed review update; initial resolve409/UI attachment-upload-in-progress. Waited until COMPLETE/no errors, resolved the app item, and submitted same five-item submission41619189-27ab-4c80-83e3-2e07ef3e3bba at2026-11-03T04:32:46.692Z. API app/submission WAITING_FOR_REVIEW; UI all five Waiting for Review. Build1.0(15) unchanged, no runtime/new tests/build. No separate App Review reply sent. Proof and final Notes in APPLE_REVIEW_20261103.md / Deliverables.

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

## Deployed database hardening and first native CI failure

- User explicitly approved both production hardening migrations. Applied via Supabase migration tool, then checked live grants/policies and advisors. Recorded cloud versions: 20261101034135_restrict_client_privileges and 20261101034202_restrict_avatar_uploads_and_list_media. Local files renamed to match these exact server versions; tests updated accordingly.
- Live permission checks: anon/authenticated email SELECT false; public display read true; client subscription INSERT/UPDATE false; client game-save TRUNCATE false; legitimate save UPDATE and service-role subscription INSERT true. Anonymous REST probes use limit=0: email401, display200, without fetching user rows.
- Avatar write policy now authenticated+owner path for INSERT/UPDATE, with both USING and WITH CHECK. Future file uploads limited to JPEG/PNG/WebP and 5MiB. Added read-only SECURITY INVOKER list_account_media(), executable only by authenticated users, for caller prefix/legacy owner metadata. No user files/rows deleted during deployment/tests.
- Eighteen isolated PostgreSQL tests pass (10 privileges + 8 avatar/media tests). Live schema verified matching applied policy definitions, bucket limits and RPC grants. Legacy SECURITY DEFINER/search_path advisor findings remain for the deletion/trigger follow-up; do not claim backend audit finished.
- Ruling: archive the old incomplete complete-schema script under supabase/baselines rather than inventing a migration-history record that it ran unchanged — actual live schema has additional columns/policies and replay reopens insecure grants — cost: a fresh project needs a separately audited schema export/bootstrap. Active migrations now align with cloud history and cannot replay that old script accidentally.
- User approved and branch 551593a was pushed; CI run 41269868233 passed tests, export, Pods and toolchain, then failed native compile. Root cause: PurchasesHybridCommon 11.1.1 ambiguous SubscriptionPeriod (StoreKit vs RevenueCat) on Xcode26.6. Upgraded @revenuecat/purchases-capacitor to 9.2.2 (still peer Capacitor6), native PurchasesHybridCommon13.26.0. Official tagged source qualifies RevenueCat.SubscriptionPeriod in both failing signatures. No manual Pods patch and no Capacitor major upgrade.
- Current local verification after upgrade: 60/60 Vitest, typecheck and npm run build passed. CI rerun is needed to establish native compilation. Overall release still pending Apple provider/revocation, server deletion, save ownership/recovery, verified backend entitlement lifecycle, IAP metadata, social moderation, native device acceptance and final store preparation.

## Apple deletion implementation checkpoint

- Created dedicated Sign in with Apple key R9B28XR2MR for com.syntheticae.rimba after explicit user authorization; downloaded once and verified private backup at Apple Dev. No private key in source, logs or chat.
- Added server deletion handler: verified caller, strict expected-account match, fresh Apple code exchange, RSA signature/subject/audience/issuer/expiry checks, revoke before physical avatar cleanup, then server Auth Admin DELETE. Inventory rejects other owners and non-progressing cleanup. Server failures retain local account/progress.
- Client now verifies Auth identity and requires native Apple authorization for linked accounts, then explicit server deletion/revocation confirmation. Cancellation, account switches and late responses cannot wipe the current account. Legacy RPC no longer called by candidate, but remains live for older builds until replacement rollout.
- 23 endpoint tests and 12 client tests pass, including actual generated RSA/ECDSA keys. Production Apple/token/Storage/deletion acceptance NOT yet performed.
- First deploy was not executed: automatic approval review hit usage limit (not a risk rejection). After resume, browser reports local use disabled; connector exposes only TTS, Noticed and Accrual. Secret installation, provider activation and deployment remain pending. User has already authorized all three; do not request that permission again.
- Native CI 41270632038 at 1a6321d succeeded after the RevenueCat compatibility upgrade, including iPhone+iPad families and simulator compilation. This is unsigned CI, not TestFlight/device acceptance.

## Backup trust and local recovery checkpoint

- Reproduced 9 failing backup/import tests, then closed identity/Pro injection, forged cached balances, duplicate ledger IDs, unsupported versions and imports during active focus. Added preservation test for world/progression fields. Import always keeps the current local profile identity and current purchase entitlement; backup subscription is discarded. Restore UI stays open on rejected import.
- Reproduced cloud payload granting lifetime Pro. Cloud game-save merge no longer elevates entitlement from cloud payload. Local entitlement provenance/offline trust and verified backend refund/renewal lifecycle are still unresolved; this change alone is not complete billing security.
- Reproduced 5 storage failures: invalid JSON, future schema, unreadable storage, malformed core collections and quota failure. Loader now retains original data and stops initialization instead of creating/replacing with an empty sanctuary. Storage write failures propagate and never prune focus history. Game persistence displays an error before throwing, without scheduling cloud sync for the failed write.
- Added ID/EN recovery screen with original-data export, retry and support email. Visual/device QA is pending because local browser control is disabled. No production saves were read, modified or deleted for these tests.
- Updated two obsolete source-smoke assertions that explicitly required untrusted backup/cloud subscription restoration; behavioral regressions now prove the correct trust boundary instead. Did not remove the failing test coverage.
- Fresh verification: 107/107 Vitest, typecheck, 157/157 prelaunch smoke/mock assertions, npm run build and git diff --check passed. These do not establish Apple/Google device acceptance or full App Store readiness.
- Still required: owner-scoped saves/guest migration and conflict handling; complete backup schema/size bounds and durable snapshot failure reporting; server entitlement lifecycle; timer/economy and social moderation; native UX/iPad/performance; IAP/store/privacy/screenshots; final device acceptance. Overall Rimba is NOT ready to submit.

## Endpoint production deployment (2026-11-01)

- Supabase Rimba connection restored as link_6ae6bb3505d88191bd8e904e107643bb; project confirmed rkljugrrscmqopeuwtpd / JagaRimba-project.
- Deployed delete-account version1 through the connector, status ACTIVE, function66fcb7af-a33d-4c56-9bba-7d365555b42c, verify_jwt=true. Source SHA256 d20f7ad3b9d7f4e746230e2f239aa3b42635033d2073b84dc26c67003d5f6bf9. List-functions verified matching deployment.
- Live non-destructive probes: missing-session POST401; anon API key used as Bearer also401. No real user token, account mutation or user-data read involved.
- Public Auth settings: Google enabled, Apple disabled, email enabled, confirmation ON. Apple secrets still NOT installed. No complete Apple deletion/device-acceptance claim.
- Browser remains blocked with "Local browser use is disabled in Work settings" even after user enabled settings and one clean tool-session reload. Do not bypass the disabled browser with another automation route. Connector has no secret/auth-configuration operation; local known CLI credential files are absent. User needs browser access restored for the already-authorized secret installation/provider configuration.
- Legacy deletion RPC remains callable until the new replacement and a tested candidate are ready; do not revoke old client access prematurely.

## Apple setup and focus integrity checkpoint

- Browser access restored after the user's settings screenshot. Installed APPLE_TEAM_ID, APPLE_KEY_ID and APPLE_PRIVATE_KEY in Supabase Rimba; SHA256 digest shown by the dashboard matches the private local .p8. No secret printed or committed.
- Enabled Apple provider with native audience com.syntheticae.rimba; allow-missing-email remains OFF and email confirmation remains ON. Public Auth settings verified Apple=true, Google=true, email=true. Native-only flow uses no OAuth Services ID/client secret; backend deletion signs short-lived client secrets on demand. Web/Android Apple OAuth is not configured by this step.
- Native CI 41272402617 for0977b38 passed, including unsigned iPhone+iPad simulator compile. Device acceptance of actual Apple/Google login and revocation remains pending.
- Local recovery UI verified on an isolated localhost origin with a synthetic damaged save and guest profile. Exported file exactly equals original damaged bytes. Screenshot visually inspected; no real account or production save involved. QA server stopped afterward.
- Reproduced 10 failing session-integrity tests plus two failing display tests. Engine now rejects paused/unverifiable timing, subtracts completed pauses, uses stable per-session reward/tree IDs for new completion replay, validates tree targets and avoids a nonzero Campfire bonus when base rewards are zero. Normal and Zen timer displays share the actual-focus-time helper. Canonical 25min25Gold/100XP and60min65Gold/250XP unchanged.
- Ruling: stable completion IDs apply to new candidate completions — required by the spec's reward-once invariant — cost: historical rewards with old random IDs and general cross-device conflicts still need Task5 reconciliation; this is not full sync correctness or server anti-cheat.
- Fresh verification:121/121 Vitest, typecheck,157/157 prelaunch smoke/mock assertions and npm run build passed. Paused/background/native device behavior still needs acceptance on the release candidate.
- App Store Connect session restored by user. Group22533477 Rimba Pro now has en-US and id display names. Monthly6829362346 price schedule created from IDR29000 with Apple conversions; en-US/id display names/descriptions saved; availability148/175 excludes all27EU countries and automatic future territories remains OFF. Annual/lifetime draft prices, metadata and availability still pending; exact IDR179000/349000 points confirmed via paginated API reads. No review submitted.

## Store catalog pricing and localization verification

- Group22533477 has en-US/id Rimba Pro localizations, confirmed by API.
- Monthly6829362346 saved IDR29000, annual6829362411 IDR179000, lifetime6829362449 IDR349000; exact price points verified from current schedules. Lifetime base territory IDN; Apple conversion schedules created for other storefronts.
- All three products have en-US and id display names/descriptions,148 current territories,0 of27EU territories, and availableInNewTerritories=false, verified from API territory lists. Annual has only UPFRONT payment plan; monthly-with12-month-commitment remains unconfigured.
- Correction to earlier checkpoint: initial subscription setup UI displayed future-territory checkbox OFF but Apple persisted true. Reopened each subscription's availability editor, explicitly turned it off and verified false using subscriptionPlanAvailabilities. Do not infer persisted state from the initial form alone.
- App-level distribution is still being checked separately; product-level exclusions alone do not restrict app downloads. Review screenshots and purchase/restore device acceptance are not complete, and no item was added/submitted for review.

## App listing and snapshot durability checkpoint

- Resumed after limit; browser again reports disabled. Continued independent Apple API and local-code work without circumventing browser permissions.
- App-level API confirms availableInNewTerritories=false and exactly148/175 territories available, excluding exactly27EU members. This setting persisted despite the interrupted UI session; no duplicate update was needed.
- Draft app version1.0 now has en-US/id descriptions, keywords and promotional text. Both app-info locales now have subtitles and the verified public privacy URL. All writes verified with API read-back; pre-change metadata backed up privately under Temp. STORE_LISTING.json is the reviewable public copy. No real-tree claims, no review submission.
- Catalog still MISSING_METADATA for all three products: review screenshots/native acceptance and other final review requirements remain pending. No newer App Store binary than original build3; unsigned simulator CI is not a TestFlight delivery.
- Latest prior CI41274041763 for a23af77 passed, including iPhone+iPad compile after focus fixes.
- Snapshot durability:5 failures reproduced before changes;6 tests now pass. Invalid/unreadable history is retained rather than treated as empty. Snapshot creation/deletion reports write failure and never evicts additional old snapshots just to hide quota errors. The existing normal8-snapshot retention policy is unchanged.
- All snapshot callers now handle errors; restore/reset aborts before replacing current progress if the requested backup is not durable. User sees ID/EN errors; successful restore feedback happens only after successful import. History remains in local storage if unreadable. Complete owner isolation and export/recovery for malformed snapshot history are still Task5 follow-up.
- Fresh verification before final formatting:127/127 Vitest, typecheck,157/157 prelaunch checks and npm run build passed. Rerun focused checks after final feedback/formatting edits. No real account or production data was modified for these tests.
- Final feedback/formatting follow-up verified: typecheck and16 focused backup/snapshot tests passed; final npm run build exited0. Diff whitespace check clean. Snapshot UI visual QA is still pending browser access restoration.

## Shared authenticated profile commit guard

- Three additional email-login failures reproduced: a late profile could reauthenticate a logged-out UI, overwrite the now-current account B, or claim success when the session lookup fails. Added the check in shared buildAuthUserFromSupabase rather than only patching email/Google callers.
- Profile commit requires current Supabase session user ID and unchanged auth revision after profile hydration. Auth callbacks still defer queries outside the callback lock. Updated lifecycle fixture to model current Auth session accurately; preserved existing sign-out/account-switch regressions.
- Fresh verification:131/131 Vitest,14focused auth tests, typecheck,157/157prelaunch assertions, npm run build and diff check passed. Auth profile guards do NOT close storage owner-isolation or guest-migration gate.
- Added BUG_BACKLOG.md and DATA_FLOW.md as reviewable gates/inventory. They explicitly keep ownership/conflicts, trusted billing lifecycle, moderation, privacy/native UX and device/store acceptance OPEN.

## App Store classification, privacy and release configuration checkpoint

- Browser control restored after desktop restart; user restored Apple session. Existing app availability shows148 territories, and draft version1.0 still attaches original build3. No candidate TestFlight delivery or review submission was performed.
- Primary category Productivity saved. Content Rights saved as third-party content with necessary rights, matching the user's explicit confirmation that all bundled assets/materials are owned or licensed.
- Age questionnaire saved: UGC present (shared profile content), no unrestricted browsing/feed/chat/ads/parental controls/age assurance; mindfulness/lifestyle content present, no medical treatment information; no built-in mature/sexual/violent/gambling/contests/paid loot-box content. Apple calculated9+ in172territories, Vietnam12+, Brazil10+, KoreaALL; earlier OS global4+ exceptions. Final social/moderation changes require rating review again.
- App Privacy8types configured: name, email, photos/avatar, gameplay content, other user content, user ID, purchases, product interaction. All linked to identity and used for App Functionality. User ID and purchases also Analytics for RevenueCat's dashboard. No advertising tracking declared. Cloud sanctuary/session/task content is included, not claimed device-only.
- RevenueCat official App Privacy guide checked for purchase/identifier analytics disclosures. Source scan found no configured advertising attribution collection or third-party analytics SDK; final native/SDK audit and device acceptance remain gates. Privacy policy URL remains the verified published worker URL.
- User explicitly approved App Privacy Publish; final Apple confirmation accepted and dialog closed with product-page label retained and Publish action no longer present. Screenshots saved outside the repo. Publishing this label does not submit the app for review.
- Release configuration: removed literal certificate-password fallback and embedded Supabase fallback values from deployment workflow. Added required iOS RevenueCat public key build binding and preflight checking required configuration names, correct Supabase project and Apple SDK key prefix. Missing settings stop before dependency install/signing. No private values logged or committed; GitHub secret provisioning still must be verified before release.
- Five release-config regressions failed before changes, then passed. Fresh verification136/136Vitest, TypeScript,157/157prelaunch checks, npm run build and git diff --check passed. Existing candidate native CI41290263080 forf158277 passed; new workflow edits not yet exercised by signed release.
- OPEN: owner-scoped local saves/guest migration/conflicts, server entitlement lifecycle, full social authorization/moderation, native iPad/UX/performance audit, screenshots and product review metadata, new signed TestFlight candidate and final device acceptance. Overall NOT ready to submit.

## Backup structure and CI client configuration checkpoint

- User explicitly approved installing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and NEXT_PUBLIC_REVENUECAT_IOS_KEY from Rimba's ignored.env.local into GitHub repository secrets. All3were added through the authenticated repository UI and verified by name plus success notification. No values printed/committed. Existing signing secret names were inspected only; their private values remain unreadable. This does not validate certificate contents or authorize a TestFlight upload.
- App Privacy publish independently confirmed after reload: Apple displays Published a few seconds ago by Aji Aditya.8types remain as recorded in APP_PRIVACY.md.
- Native CI41291624899 for684b254 passed. No signed release workflow was dispatched.
- Task5 foundation:7nested backup regression failures reproduced. Validator now checks bounded JSON depth/node count/20MiB size, valid world/coordinates/objects/sessions/ledger/islands/todos/tags/reclamation and collection containers, unique IDs and active-island references before normalization. Imported identity and subscription remain excluded. Oversized files are rejected before FileReader. Circular/deep object input fails without crashing.
- Additional compatibility regression caught my initial use of occurred_at instead of the existing triggered_at reclamation field; corrected it and proved populated version1 history, focus totals and island objects are retained.9new tests pass.
- Fresh verification145/145Vitest, typecheck,157/157prelaunch checks, npm run build and git diff --check passed. This is input validation, not server anti-cheat, ownership isolation, or full sync correctness.
- Ownership audit confirms the current storage key remains shared, logout purges unsynced local progress, and login still unions guest/account collections. Do not mark Task5 complete. Required implementation must preserve an identifiable legacy recovery copy, isolate saves/snapshots/queued writes by verified owner and offer explicit guest/import/cloud/cancel choices; a profile hydration race guard does not solve these data-flow defects.

## Owner-scoped progress and explicit migration checkpoint

- Four storage regressions reproduced A/B overwrite, guest/account mixing, a late foreign-owner write and automatic adoption of ambiguous legacy bytes. Scoped save keys and local storage_owner provenance now isolate these writes; unscoped legacy bytes are retained unchanged.
- Auth commits activate the matching owner and load that owner's in-memory game state before exposing the new identity. Guest storage uses its own namespace. Logout no longer purges unsynced progress. Snapshot history is scoped by owner and refuses late snapshots from another account. Account deletion removes its own scoped save/history only after server confirmation; unrelated scoped accounts remain intact.
- Imports retain destination ownership while validation drops source ownership and purchase rights. Initial/reset saves inherit the active owner. Cloud uploads now reject unowned/foreign-owner payloads before issuing a request; existing auth/account revision guards remain in force.
- Added explicit migration dialog for legacy and meaningful guest progress: affirm ownership and restore, keep current account progress, or cancel to sign-in. A durable snapshot is required before replacement. Original source bytes remain. Choices are recorded per destination owner plus SHA256 source fingerprint, so modified source data requires a new choice. Invalid legacy bytes can be exported for recovery.
- UI QA found a real INITIAL_SESSION-null startup race that skipped guest-owner activation and made the migration button inert. Reproduced with queued Auth event, fixed callback handling, and re-ran lifecycle/integration tests. Recovery pages now remain visible if an owner cannot be loaded rather than redirecting away from the original-data export.
- Browser QA on isolated127.0.0.1:41974 with synthetic guest/legacy data and connect-src restricted to this origin: explicit restore succeeded; owned guest save contains the synthetic sanctuary/task; pre-restore snapshotCount1; originalRetained=true; choiceRecorded=true; reload did not repeat the same prompt. Screenshot inspected via browser. No production account/save was accessed or changed. QA server stopped and tab closed.
- Fresh verification159/159Vitest across22files, TypeScript and final npm run build passed.157/157prelaunch checks passed before the final startup/redirect refinements; rerun at the next broader gate. Integration fixtures now initialize browser storage before Zustand; Google/deletion fixture contracts updated without weakening their behavioral assertions. Existing unrelated test-only stderr for unavailable persist storage/intentional errors remains.
- OPEN: old snapshot history remains retained in its original unscoped key and is not automatically attributed; further recovery/export UX still required. Same-owner cloud union/conflicts and cloud-save validation remain unresolved. These changes alone do NOT close Task5, billing, social, native-device, or store-release gates.
- Ruling: ambiguous legacy progress is never assigned automatically to a verified account — an explicit owner assertion and restore are safer than inferring provenance from stale auth cache — cost: users must choose a source before recovering pre-namespace progress; original bytes remain available.

## Revision-aware cloud sync candidate checkpoint

- Added a per-owner durable outbox and SHA256 baseline with expected-owner/revision RPC commits. Requests are persisted before transmission; uncertain responses retry the same mutation. Malformed cloud saves and journal/storage failures preserve original local bytes and block unsafe replacement.
- Replaced union/max merging with explicit whole-copy conflict selection. Both available copies are snapshotted before replacement; missing or newer remote copies require a fresh decision. Active focus prevents loading a different cloud copy. Account deletion removes only its own scoped outbox after server confirmation.
- Regression evidence: 12 isolated PostgreSQL protocol tests, 8 journal tests, 15 cloud V2 behavior tests, plus preserved late-account/session tests. New concurrent upload/login regression failed with two simultaneous RPCs, then passed after serializing login, uploads and conflict resolution through the same per-owner queue.
- Browser QA on isolated localhost with synthetic data selected the cloud copy: localWorld=Synthetic cloud copy, revision=2, blocked=false, pending=false; both Synthetic cloud copy and Synthetic device copy remained in snapshots; serverCommits=0. This QA used the pre-queue-refinement bundle; the refinement is covered by the failing-then-passing regression. No production account/save was changed. Local QA server stopped. Production build replaces the synthetic output before native packaging.
- Fresh full suite 195/195 across25files and TypeScript passed.157/157 prelaunch checks passed before the queue refinement; final build and prelaunch follow-up recorded below when complete.
- Ruling: use whole-copy choice with durable snapshots instead of speculative field-level tombstones/CRDT merging — the previous union resurrected removals and could duplicate history — cost: divergent device edits require a user choice; there is no automatic combination of both copies.
- Migration approval is recorded from the owner, conditional on compatible client verification. Migration is NOT applied yet. Supabase connector list_migrations currently reports Unknown tool; browser fallback may be necessary. Existing CI for3b0eac0 passed (run41294185138). No main/tag/TestFlight upload or Apple review submission was performed.
- Final queue-refinement gate: npm test195/195, npm run typecheck, npm run test:prelaunch157/157 and normal npm run build all exited0. The synthetic QA configuration was process-only; the final output was rebuilt from ignored.env.local. Whitespace diff check passed.
- Production deployment: dashboard SQL fallback applied the exact migration and schema_migrations history in one transaction after candidate62ccfc5 passed verification. Read-only catalog check returned authenticated SELECT=true, direct INSERT/UPDATE/DELETE=false, RPC execute=true and anonymous RPC=false. Existing owner SELECT policies still constrain auth.uid()=user_id. No existing save payload was updated or deleted by the migration. Proof screenshot stored outside Git. Device acceptance remains pending.

## RevenueCat offering and prepared server billing checkpoint

- Created default offering ofrng77d9984a86 (Rimba Pro) with $rc_monthly/rimba_pro_monthly, $rc_annual/rimba_pro_annual, $rc_lifetime/rimba_pioneer_lifetime. Dashboard confirms it is default. Existing entitlement/product mapping retained; no new price, charge or hosted web checkout. Proof screenshot saved outside Git.
- Prepared local server entitlement mapper with allowed products/stores, expiration/grace, cancellation, refund, lifetime purchase matching and sandbox provenance. Missing/malformed upstream responses fail without silently downgrading a paying account.
- Prepared authenticated reconcile and dedicated-secret webhook handlers, current-subscriber API reads, owner/environment lease routines, processed event receipts, expiry checks and production-only legacy subscription mirror. Nothing from this billing migration is deployed yet and no new server key was created.
-37focused billing tests pass (12mapping,10endpoint,15PostgreSQL). Added SQL paid-state completeness regression failed then passed; per-owner lease tests cover stale finalize/cancel, same-event replay, sandbox isolation and deleted-account cascade. TypeScript passes with allowImportingTsExtensions, required for Deno imports with noEmit; no type/build validation disabled. Full suite/build verification in progress.
- OPEN: backend deployment approval/credentials, client integration and offline provenance, native StoreKit purchases/restore/refund acceptance. Do not mark Task7 complete.
- Fresh complete gate:232/232Vitest across28files, TypeScript and normal npm run build passed. Source prelaunch157/157 passed at the sync checkpoint; run again before candidate commit. Native CI41297115803 for b55b2cb passed. Backend billing remains prepared only.
- Ruling: use Rimba's existing public RevenueCat SDK key for the documented GET subscriber endpoint rather than creating a privileged API-v1 secret — no subscriber deletion or entitlement-grant API is needed — cost: subscriber attributes restricted to secret keys are unavailable, and are deliberately not consumed. Dedicated webhook authorization still requires explicit approval before provisioning.

## Billing backend deployment and client verification integration

- Owner approved deployment of prepared backend d043190, billing migration, and a dedicated authorization secret in Supabase/RevenueCat. Applied20261101102757 transactionally with schema_migrations history through dashboard fallback (CLI account returns403; MCP tools report Unknown tool).
- Live permission query returned server RPC=true, authenticated client RPC=false, client billing writes=false and anonymous read=false. Owner-only read RLS and field grants remain. No existing sanctuary save was changed/deleted.
- Installed existing public Rimba SDK key as encrypted REVENUECAT_API_KEY and a new256-bit authorization value as encrypted REVENUECAT_WEBHOOK_AUTHORIZATION in Supabase. Configured RevenueCat integration whintgr3a8fff9c76 for App Store app app25d76d4a53 only, both Production/Sandbox and all event types. No privileged RevenueCat API key created. No secret printed or committed.
- Dashboard deployed reconcile-subscription and revenuecat-webhook from concatenated tested shared/handler/entry sources. Reconcile retains gateway JWT verification plus Auth check; webhook uses its configured dedicated authorization handler with legacy JWT gateway disabled. Anonymous direct webhook invocation returns401 Unauthorized; RevenueCat-generated TEST delivery returns200 received:true. TEST does not grant rights or create billing records. NativeCI41298112181 for d043190 passed.
- Client now requires backend confirmation after both purchase and Restore. Separate Restore regressions caught an uncovered bypass in my first client edit; fixed and verified. Results carry owner/session-revision proof, checked again by paywall before applying. Auth epoch rejects A-to-B-to-A results. Automatic refresh older than a newly completed store operation is discarded.
- Editable save JSON no longer restores subscription rights at load, while the original persisted bytes remain. Native SDK verification INFORMATIONAL is enabled; the client explicitly accepts VERIFIED/VERIFIED_ON_DEVICE only for a recent offline cache. Backend Free immediately revokes runtime Pro. Rights updates do not themselves write/cloud-sync game progress.
- Added native lifecycle refresh on launch/account activation, foreground, connection recovery and every5minutes while visible, with listener cleanup and account checks. It never opens purchase/restore sheets. Actual native billing/lifecycle/restore acceptance remains OPEN.
- Full verification before the last memory-only entitlement/lifecycle cleanup:246/246Vitest, TypeScript and normal npm run build passed. Final follow-up verification is pending below. Do not mark all billing/device/release gates complete.
- Ruling: offline Pro may use only native-verified CustomerInfo no older than24hours and within confirmed entitlement expiry — editable save/cache flags cannot establish access and delayed refund information must be bounded — cost: a paying user offline longer than24hours needs connectivity to re-verify; existing islands/progress are retained, not deleted. This policy still needs native device acceptance.
- Final client gate after Restore/grace and runtime-only entitlement refinements:247/247Vitest across28files, TypeScript,157/157prelaunch checks and npm run build all passed. Restore must carry the same current-owner proof as purchase. Ordinary expired/invalid/unrelated entitlements stay rejected; a past native renewal date is accepted only when the backend confirms a still-valid grace_period. Native lifecycle listener failure is handled and listeners are removed on unmount.

## 2026-11-02 — reported build-4 regressions and Campfire candidate

- User reports are confirmed release blockers, superseding earlier optimistic checkpoints. Reproduced exact Sanctuary Resting Moment screen by tapping Start Focus: NatureWorkshopSheet returned before a useMemo, changing hook count. Moved the return after all hooks. Repeated start/pause/resume/cancel now passes synthetic browser acceptance.
- Reproduced logout blank page with no JS exception: modal close history.back raced auth navigation. Profile/settings deletion and logout now use client routing after completion; auth transition suppresses modal history pops. Returning guest no longer forcibly repeats onboarding. Failed SDK sign-out preserves account state and returns an error. Local sign-out scope used; owner saves retained. Account switch clears visible Campfire state; account deletion clears its UUID pointer.
- Fixed delete confirmation beneath profile and paywall pointer/layer isolation. Paywall activation closes prior profile/settings. Browser tests open/close paywall, open deletion/fill confirmation/cancel (never submit deletion), sign out and re-enter guest. Both EN phone390x844 and ID tablet834x1194 pass with synthetic-only saves and outbound network blocked. Screenshots in ignored build/ui-qa were inspected; this is not native acceptance.
- Production workflow omitted both Google client IDs despite simulator workflow having them. Added production build/preflight environment, required ID validation, RED-to-GREEN regressions. Native Google still requires replacement TestFlight acceptance.
- Localized loading, scene loading, notifications, top menu accessibility, focus titles/controls, Zen tags/species and all18 species descriptions. Updated top flyouts with persistent anchors,44px rows, bounded scrolling and dismissal. Personal notes/custom labels retained.
- Campfire candidate replaces unauthenticated client broadcasts/fabricated joins with authenticated transactional RPCs and canonical polling. Implements report/block, private moderator queue/actions UI, server-side normalized content checks, owner-scoped UUID-only lobby recovery, active/ended lifecycle recovery and runtime verified social-bonus provenance. Base offline focus stays available; imported room strings do not award20% extra. SQL tests cover authorization, anonymous auth accounts, replay/revision, report privacy, blocks, deletion redaction and retention. Independent review found lobby recovery and departed-host report-name deletion leaks; both corrected with regressions.
- Migration20261101201444_campfire_authority_and_moderation.sql remains LOCAL, NOT DEPLOYED. Daily maintenance must be scheduled before policy publication/activation, and verified owner moderator must be assigned privately; no reviewer/admin assumption. Public policy candidate updated but website publication not done.
- Fresh complete Vitest322/322 across33files; typecheck exit0; prelaunch155/155 (obsolete static broadcast/3-digit assertions replaced with actual Campfire behavior suite); production npm run build completed. First sandbox build hit EPERM from elevated QA-generated .next files; same build with consistent access passed, no validation disabled. git diff --check passed.
- Supabase connector again Unknown tool and CLI has no auth. Authenticated dashboard fallback works. Read-only catalog: campfire tables0; auth.users.is_anonymous exists; cron available but not installed; schema_migrations columns verified; existing auth triggers on_auth_user_created/on_auth_user_created_rimba. No production data or schema changed in this checkpoint. GitHub CLI unauthenticated; connector read works. No candidate push/nativeCI/upload/review submission yet.
- OPEN: native iPhone+iPad final-build acceptance, real Google/Apple/account deletion, StoreKit sandbox purchase/restore/refund/renewal, two-device cloud/Campfire and moderator operational testing, policy publish and App Privacy final audit, store screenshots/IAP review metadata. Do not claim ready Submit.

## Production Campfire deployment — 2026-11-02

- Owner explicitly approved migration plus daily permanent retention cleanup at10:17WIB. Dashboard fallback applied reviewed transactional build/campfire-deploy.sql (migration20261101201444, schema_migrations record, pg_cron and03:17UTC daily schedule). No maintenance function invoked immediately and no existing save payload updated/deleted.
- Dashboard initially warned RLS might be absent because migration enables it via dynamic SQL. Auto-review rejected Run without RLS; used safer Run and enable RLS. Execution returned migration_recorded=true,campfire_table_count=8,retention_job_active=true.
- Independent catalog audit: rls_tables8,client_tables_readable0,client_tables_writable0,anon_rpcfalse,member_rpctrue,client_maintenancefalse,service_maintenancetrue,redaction_triggertrue,moderators0; job17 3 * * * active. Verified owner moderator still unassigned; real independent-session/adversarial and two-device tests remain open.
- Candidate commits c5e83b6/cabfdb2 pushed successfully to existing fix/rimba-release-readiness branch. Native CI41372926763 started for cabfdb2. No TestFlight upload or App Review submission yet.
- Transfer server first proposal exposing build directory was auto-review rejected; safer dedicated directory with only SQL approved, then single-route localhost Node server used. Stop transfer server after migration; no credential was included.
- Production rollback-safe synthetic matrix passed: host-only start, outsider read denial, premature completion denial, ordinary-member moderator denial, report queue and authorized dismissal. Transaction explicitly ROLLBACK; final query synthetic_accounts_rolled_back=true. This is real deployed SQL behavior, not separate-device HTTP/native acceptance.
- Owner selected the support email for moderator assignment. Exact case-insensitive auth lookup returned matching_accounts0/verified_accounts0, so no role granted. Owner must sign in/register that address once before trusted assignment.

### 2026-11-02 — Email OTP length mismatch
- User reported email delivers 8 digits while app permits only 6. Confirmed verification fields, paste handler, and password recovery all imposed a six-digit limit.
- Replaced segmented verification with one numeric one-time-code input accepting up to 8 digits; explicit submit accepts complete 6/8-digit codes without premature verification at digit six. Recovery supports eight digits. ID/EN copy updated.
- Candidate must include this fix before final native acceptance; previous uploaded builds do not contain it.
- Verification OTP: 324/324 tests, typecheck and production export passed; native CI 41372926763 passed for preceding cabfdb2 (not OTP).

### 2026-11-02 — OTP release candidate and public disclosures
- f643673 pushed to fix/rimba-release-readiness; local324tests, typecheck,155prelaunch checks, production export passed. Native verify41374567443 passed compilation and is capturing iPhone/iPad screenshots.
- Website4be7359 passed typecheck/build and was fast-forwarded to production main. Public /privacy verified in ID and EN with November2 date, Campfire evidence and90day retention disclosures.
- Apple session renewed by owner. Monthly, annual and lifetime product review instructions saved; review screenshots and native billing acceptance remain open. DEVICE_ACCEPTANCE.md records the exact source and unverified device flows.
- Screenshot runner stalled after its first device with unbounded simctl calls. Added command logging, bounded process timeouts and best-effort simulator cleanup; syntax and fictional-fixture regression passed. App runtime source remains f643673.

### Build5 distribution checkpoint
- Deploy41376358841 SUCCESS for308215b; Apple build06a89475-73bf-4b93-91db-0a958a1f0e7e version5 VALID, Internal group includes5, internal beta state IN_BETA_TESTING. Draft1.0 selected5 via API; no submission.
- Correction: verify41374567443 actually finished SUCCESS with all12screenshots; the browser log was stale. f643673 runtime has native/screenshot evidence. Additional run41375983476 remains under observation.
- All12native screenshots uploaded and placed using official Asset Library schema/reference groups.10active,2pending processing with no error details. Review notes for all3products saved; native paywall review screenshot pending.
- SDK inventory:16privacy manifests in simulator app. GoogleSignIn8 declares potential coarse location/device/other usage beyond current inventory; final configuration-aware reconciliation and signed IPA audit remain OPEN. Facebook is linked by Capgo6.0.1 but Rimba initializes only Google, no Facebook appId; do not equate packaging with collection.
- Requested owner tests on exact build5 and support-account registration. No device/purchase/deletion/moderation acceptance result received yet.

### Pembaruan dokumentasi atas permintaan pemilik
- Memperbarui whitepaper Mobile dan salinan root, whitepaper ekosistem, GEMINI, CLAUDE/CODEX root+Mobile; membuat root rules.md sebagai aturan bersama. Mengoreksi klaim seluruh fitur offline, enkripsi LocalStorage, benchmark tak terbukti, trigger rilis dan sinkronisasi source.
- Status build5 VALID/Internal dan gerbang terbuka dicatat; pemilik menyatakan hasil tes akan disampaikan kemudian, belum ada acceptance baru. Verifikasi dokumen:9file,24tautan acuan baru,paritas isi kedua whitepaper Mobile (selain tautan relatif); tidak menjalankan ulang tes runtime untuk perubahan dokumen saja.

### Review owner changes 7f4730e
- Laporan pemilik dan audit lampiran diverifikasi; lihat OWNER_CHANGES_REVIEW_20261102.md. Build6 tag gagal pada Next build. Fix schema profil, feedback subscription, retry/pending verification, dan tes boundary widget disiapkan;335tests,155prelaunch,typecheck,production build dan core browser EN/ID lulus. Widget extension/AppGroup/registrasi plugin tetap belum terintegrasi; jangan klaim fitur native sudah lengkap. Google Skip Nonce Check pemilik dipertahankan untuk kompatibilitas jalur native yang diperiksa.

- e13b1a2 pushed; native verify41386535235 SUCCESS. Manual deploy41387288040/build7 started for the same SHA after native gate. Apple processing and physical-device purchase acceptance still unverified.

### Activation fix after device clarification
- Device report says Pro features stayed locked. Reproduced verified billing result invalidation on same-owner TOKEN_REFRESHED and duplicate SIGNED_IN. Split owner/session epoch from profile hydration generation, retaining sign-out and A-B-A stale-result guards.
- Two red regressions now green; auth lifecycle9tests include same-owner metadata races and A-B-A. Full339tests passed before final extra A-B-A test;155prelaunch/typecheck passed. Fresh production build pending.
- Upload7/41387288040 canceled at Upload IPA step before a final candidate was confirmed. Do not ask owner to accept build7 as the complete activation fix.
- Fresh production export after the activation epoch fix passed. No app review submission.

- Additional activation race reproduced: a Free refresh started during purchase/Restore could finish after verified Pro and overwrite it. Increment operation generation at completion as well as start; both red regressions now pass. Final full342tests and typecheck pass. No new native source or backend configuration changed.

### Final activation candidate distributed
- a839c4e nativeCI41389307337 SUCCESS; deploy41389860676/build8 SUCCESS. Apple1.0(8)8b34cd2f-6e5b-484b-b9ef-15a74a0c34b7 VALID, Internal group and IN_BETA_TESTING verified. Draft selects8, beta notes en-US/id saved; no App Review submission.
- Final342tests/35files,155prelaunch,typecheck,production export passed. Device Restore/actual Pro activation still awaits owner confirmation. Screenshots predating owner UI changes need refresh before submission. Widget native integration remains open.

### Native widgets candidate
- Source a1ea4f6 preserves owner UI/3D work, embeds WidgetKit extension, registers AppGroup bridge and real Home/Lock/Control surfaces. Review caught/fixed host privacy manifest membership, minutes/seconds mismatch and previous-session telemetry. Regression coverage includes native packaging, one-shot late actions, account clearing and session start/pause/resume/cancel.
- Full365tests/40files,155prelaunch,typecheck,static export pass. NativeCI41402950906 SUCCESS. First41402107252 compiled but failed host manifest packaging assertion; corrected.
- Group associated with host+extension, new App Store profiles ACTIVE, group entitlement decoded/verified; GitHub host/widget profile secrets updated using existing GitHub credentials. Deploy41403770011/build11 dispatched for exact source. Apple status and device acceptance pending; no Submit. See NATIVE_WIDGETS_20261102.md.

### Native widget final distributed
- Source408345b includes stopwatch guard (no false24-hour countdown),365tests/40files and fresh export/typecheck pass;155prelaunch pass. NativeCI41404506471 SUCCESS; signed archive/export/extension entitlements and IPA embedding verified in deploy41404509381 SUCCESS.
- Build11/41403770011 canceled before upload. Apple build63dde60f-edb0-4122-afe4-9828114e69da1.0(12) VALID/IN_BETA_TESTING, Internal membership verified. EN/ID beta notes saved; draft selects12; no Submit. Physical widget and Restore/Pro acceptance still pending.

## App Review submission — 2 November2026,21:10WIB

- Owner UI attempt returned generic unexpected error; read-only API confirmed draft READY_FOR_REVIEW,submittedDate=null,5items. Versioned EN/ID localizations complete; no per-item validation error surfaced. Null draft platform is allowed by current official Apple API; no unsupported platform-cause claim.
- Owner explicitly authorized one same-draft API submission. PATCH /v1/reviewSubmissions/41619189-27ab-4c80-83e3-2e07ef3e3bba with submitted=true succeeded at2026-11-02T14:10:43.66Z (21:10:43WIB). No metadata,products,IDs,assets or appbuild changed.
- Read-back: submission/platformIOS WAITING_FOR_REVIEW,app1.0(15) WAITING_FOR_REVIEW,and annual/monthly/lifetime/group version states WAITING_FOR_REVIEW. Five raw reviewSubmissionItems retain READY_FOR_REVIEW; do not confuse itemstate with submission outcome.
- Evidence: ignored build/submit15-api-result.json,submitted15-verified.json; public status copy in Deliverables/Rimba-Build14-UI. No appcode changed or new tests/build needed. Existing device coverage limits remain. Do not automatically retry/withdraw; next action is await Apple review/feedback.
