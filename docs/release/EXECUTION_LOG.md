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
