# Rimba release bug ledger

Scope: iPhone+iPad, global excluding27EU territories, Free/Pro, virtual trees only. Status below distinguishes local tests, deployed configuration, unsigned CI and actual device acceptance.

| ID | Priority | Finding / gate | Current evidence / status |
| --- | --- | --- | --- |
| AUTH-01 | P1 | Provider configuration absent | Apple/Google enabled in Supabase, native audiences and nonce rules configured. Device acceptance pending. |
| AUTH-02 | P1 | Deferred auth callback can hydrate old identity | Callback revision tests pass. Shared profile commit session/revision guard added;131tests, typecheck and final build passed. |
| DATA-01 | P0 | Client can read private profile email or self-grant Pro | Two deployed migrations checked via production grants and18isolated PostgreSQL tests; server-only subscription writes. |
| DATA-02 | P0 | Local save/queue not fully scoped by account | OPEN. Revision guards do not establish storage ownership. Need owner-bound files, guest choice and safe legacy recovery. |
| DATA-03 | P1 | Corrupt save replaced with new game / quota silently prunes history | Fixed loader/writer behavior; original bytes retained and export recovery tested on isolated localhost. Device QA pending. |
| DATA-04 | P1 | Snapshot creation/deletion claims success after failed write | Six regressions pass. Restore/reset stop after backup failure. UI visual QA pending browser restoration. |
| DATA-05 | P1 | Backup grants Pro or replaces identity | Import preserves current profile/entitlement; rejects duplicate ledger and invalid version. Full schema/size bounds still OPEN. |
| SYNC-01 | P0 | Union merge can resurrect deleted objects and duplicate historical rewards | OPEN. New focus completions have stable IDs, but legacy data, revisions and tombstones are unresolved. |
| DELETE-01 | P1 | Apple revocation and physical media cleanup absent | Endpoint ACTIVE and Apple secrets installed;35endpoint/client regression tests. Disposable email/Apple device acceptance pending. Legacy RPC retirement deferred until replacement rollout. |
| BILL-01 | P0 | Trusted server entitlement lifecycle absent | OPEN. Candidate blocks arbitrary products and cloud entitlement promotion; webhook/reconcile/refund/renewal and offline provenance remain required. |
| BILL-02 | P1 | Store products lack metadata and prices | Three price schedules, two locales and148non-EU territories verified via Apple API. Review screenshots and native sandbox/restore pending; products still MISSING_METADATA. |
| FOCUS-01 | P1 | Paused time counted as focus; completion replay mints different IDs | Fourteen production-rule regressions pass; normal/Zen display aligned. Native clock/background/force-close matrix pending. |
| SOCIAL-01 | P1 | Campfire/leaderboard authorization and moderation not proven | OPEN. Audit and production behavior tests required; do not claim moderation complete. |
| NATIVE-01 | P1 | Native dependency compilation failed | RevenueCat9.2.2 resolves ambiguity; a23af77 unsigned iPhone+iPad CI passed. Newer commits must pass again. |
| NATIVE-02 | P1 | Release binary and device matrix missing | OPEN. Latest ASC binary remains old1.0(3); candidate is not TestFlight-ready yet. |
| STORE-01 | P1 | Listing/territory/privacy incomplete | en-US/id version listing+subtitle+public privacy URL saved. App and product territory exclusion verified. Age rating, Privacy Nutrition Label, screenshots, reviewer access and final draft validation OPEN. |
| RELEASE-01 | P1 | Publish before all gates pass | OPEN. No review submission authorized or performed for Rimba. No100%readiness claim. |

For chronology and test logs see EXECUTION_LOG.md. Do not close device/production gates solely because unit tests or unsigned simulator compilation passed.
