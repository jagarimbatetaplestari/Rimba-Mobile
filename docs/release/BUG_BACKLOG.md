# Rimba release bug ledger

Scope: iPhone+iPad, global excluding27EU territories, Free/Pro, virtual trees only. Status below distinguishes local tests, deployed configuration, unsigned CI and actual device acceptance.

| ID | Priority | Finding / gate | Current evidence / status |
| --- | --- | --- | --- |
| AUTH-01 | P1 | Provider configuration absent | Apple/Google enabled in Supabase, native audiences and nonce rules configured. Device acceptance pending. |
| AUTH-02 | P1 | Deferred auth callback can hydrate old identity | Callback revision tests pass. Shared profile commit session/revision guard added;131tests, typecheck and final build passed. |
| DATA-01 | P0 | Client can read private profile email or self-grant Pro | Two deployed migrations checked via production grants and18isolated PostgreSQL tests; server-only subscription writes. |
| DATA-02 | P0 | Local save/queue not fully scoped by account | Scoped local saves/snapshots and explicit fingerprinted guest/legacy choice implemented;159tests plus isolated browser migration QA passed. Device acceptance, legacy snapshot export and cloud conflict gates remain OPEN. |
| DATA-03 | P1 | Corrupt save replaced with new game / quota silently prunes history | Fixed loader/writer behavior; original bytes retained and export recovery tested on isolated localhost. Device QA pending. |
| DATA-04 | P1 | Snapshot creation/deletion claims success after failed write | Six regressions pass. Restore/reset stop after backup failure. UI visual QA pending browser restoration. |
| DATA-05 | P1 | Backup grants Pro or replaces identity | Import preserves current profile/entitlement; rejects duplicate ledger and invalid version. Nested structure/version/ID/20MiB bounds added;145test checkpoint passed. Final device restore matrix remains OPEN. |
| SYNC-01 | P0 | Union merge can resurrect deleted objects and duplicate historical rewards | Candidate62ccfc5 replaces union with revision CAS, durable idempotent outbox and explicit whole-copy conflicts with two snapshots.195tests/build passed; synthetic cloud-choice UI passed; migration deployed and grants checked. Two-device, offline and native acceptance remain OPEN. |
| DELETE-01 | P1 | Apple revocation and physical media cleanup absent | Endpoint ACTIVE and Apple secrets installed;35endpoint/client regression tests. Disposable email/Apple device acceptance pending. Legacy RPC retirement deferred until replacement rollout. |
| BILL-01 | P0 | Trusted server entitlement lifecycle absent | Server reconcile/webhook and lease/dedup migration deployed; RevenueCat TEST200 and missing-secret401 verified. Client backend purchase/Restore checks, runtime refresh and native-verified24h offline policy implemented. Native purchase/refund/renewal/transfer/offline acceptance remains OPEN. |
| BILL-02 | P1 | Store products lack metadata and prices | Three price schedules, two locales and148non-EU territories verified via Apple API. Review screenshots and native sandbox/restore pending; products still MISSING_METADATA. |
| FOCUS-01 | P1 | Paused time counted as focus; completion replay mints different IDs | Fourteen production-rule regressions pass; normal/Zen display aligned. Native clock/background/force-close matrix pending. |
| SOCIAL-01 | P1 | Campfire/leaderboard authorization and moderation not proven | OPEN. Audit and production behavior tests required; do not claim moderation complete. |
| NATIVE-01 | P1 | Native dependency compilation failed | RevenueCat9.2.2 resolves ambiguity; a23af77 unsigned iPhone+iPad CI passed. Newer commits must pass again. |
| NATIVE-02 | P1 | Release binary and device matrix missing | OPEN. ASC1.0(5) VALID and Internal testing; physical-device acceptance pending. |
| STORE-01 | P1 | Listing/territory/privacy incomplete | en-US/id version listing+subtitle+public privacy URL saved. App and product territory exclusion verified. Productivity category, content rights, regional age ratings and8-type App Privacy published with owner approval. Screenshots, reviewer access and final draft validation OPEN. |
| RELEASE-01 | P1 | Publish before all gates pass | OPEN. No review submission authorized or performed for Rimba. No100%readiness claim. |

## Build4 owner feedback — 2 November candidate

| ID | Severity | Evidence and current status |
| --- | --- | --- |
| UI-FOCUS-02 | P1 | Exact recovery screen reproduced: NatureWorkshopSheet skipped useMemo during active focus. Hook order fixed; repeat focus/pause/resume/cancel synthetic UI passes. Native candidate pending. |
| UI-ACCOUNT-02 | P1 | Delete confirmation below profile and paywall pointer/layer fixed; EN/ID browser pass. Actual deletion/StoreKit acceptance pending. |
| AUTH-LOGOUT-02 | P1 | Blank page reproduced from history.back/auth navigation race. Awaited local sign-out/client routing/history guard fixed; logout+guest browser pass. Apple native/A-B device matrix pending. |
| AUTH-GOOGLE-02 | P1 | Release build omitted both public Google IDs. Workflow/preflight fixed with regressions; replacement native login pending. |
| UI-LANG-02 | P2 | Loading/focus/Zen/species/menu localized; flyouts revised. Tests and EN/ID core browser pass; native visual audit pending. |
| SOCIAL-02 | P1 | RPC/moderation/recovery migration and approved daily retention deployed; production privilege/rollback authorization checks passed. Public privacy published. Moderator registration/assignment and native acceptance remain open. |

For chronology and test logs see EXECUTION_LOG.md. Do not close device/production gates solely because unit tests or unsigned simulator compilation passed.
