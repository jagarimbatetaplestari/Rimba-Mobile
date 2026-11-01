# Revision-aware cloud sync rollout

Candidate: fix/rimba-release-readiness. Migration: 20261101094129_guard_game_save_revisions.sql.

## Contract

The account owns a separate local save, snapshot history and durable sync journal. Writes use commit_game_save_v2 with expected authenticated owner, expected revision and a persisted UUID/payload. An uncertain network response retries that same mutation. A changed remote revision blocks overwriting until the user chooses a whole copy; both available copies must first be stored as snapshots. Purchases and imported identity never come from the game-save payload. Login reconciliation, uploads and conflict choices share a per-owner queue.

This is explicit whole-copy conflict resolution, not automatic field merging. Deletions are retained in the chosen copy rather than revived by set-union. The user may inspect/recover the other snapshot. Pending outbox bytes are retained on storage errors. Old unscoped snapshot recovery remains a separate open gate.

## Rollout gate

- Run Vitest, typecheck, prelaunch checks and production build.
- Check synthetic conflict UI and retained snapshots. This does not replace device or two-real-device acceptance.
- Record candidate commit before applying the approved migration.
- Applying the migration preserves existing rows, adds revision 0 and last_mutation_id, and removes authenticated direct INSERT/UPDATE/DELETE. Existing owner SELECT policies remain.
- Old builds that use direct table upsert cannot sync after deployment; offline data remains. The owner explicitly approved this compatibility cost. Ship a compatible candidate before public release.
- Verify catalog columns, authenticated SELECT/execute, anonymous denial and direct-write denial after deployment. Do not use human save data for destructive tests.

## Recovery

Prefer fixing forward while preserving the revision protocol. Do not delete game_saves or sync journals, reset revisions, or silently replay an unreviewed local copy. A failed request can already have committed; retry its persisted mutation before reconciling.

If deployment must be paused, stop candidate rollout and retain both local and cloud data. Restoring legacy table write grants would reintroduce blind overwrite and requires a separate explicit decision; it is not an automatic rollback. Keep the added revision columns and RPC so accepted mutations stay identifiable. Do not run DROP or destructive rollback scripts.

A user-facing journal recovery/export flow, native offline/account-switch/device-conflict acceptance, and trusted entitlement reconciliation remain release gates. No readiness claim follows solely from local tests.
