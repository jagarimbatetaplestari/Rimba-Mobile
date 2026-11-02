# Native widget candidate — 2 November 2026

Source: `408345b55654609bdf3b94526eff5728502cba10`, branch `fix/rimba-release-readiness`. Preserves owner changes through `b09e007`; no Website/Desktop source copy.

## Implemented

- Real embedded `com.syntheticae.rimba.widgets` target: Home Screen small/medium and Lock Screen accessories on iOS16+, Control Center focus control on iOS18+. Shared focus AppIntent compiled into both host and extension.
- Shared container `group.com.syntheticae.rimba`; registered Capacitor bridge through `RimbaBridgeViewController`. Sync checks native acknowledgement, retries failures, serializes writes/clears, and clears stats and pending actions on account boundaries. Shared JSON excludes ranger name and private focus tag.
- Real aggregates, empty zero-history state, live countdown, pause state, deadline expiry. Session mutations publish the new saved session. Quick focus converts minutes to seconds correctly.
- Timestamped control action consumed once within five minutes after auth/save readiness; cold links, foreground events and late intents handled. Routes/durations validated; existing sessions are not duplicated.
- In-app simulation replaced with installation instructions, duration preference, installed Home/Lock widget count when available and honest refresh status. iOS controls refresh timing and widget installation.
- Shared-container privacy manifest packaged in both bundles; embedding/resources have regression tests.
- Overwritten Pro auth/billing race guards and purchase/restore/error/pending feedback restored while preserving owner's bento design. Migration retains original bytes, suppresses only untouched starter saves, and rechecks changed/damaged sources.

## Evidence

- Full **365 tests / 40 files**, typecheck, **155 prelaunch assertions**, production static export passed.
- Native CI `41402950906` **SUCCESS**: Swift data tests, iPhone/iPad compilation, embedded `.appex`, both privacy manifests and extension bundle ID verified.
- First run `41402107252` compiled successfully but failed the host-manifest assertion. Fixed and regression tested; that first run was not fully successful.
- Apple resources: host `QJ4H63XFUD`, extension `WM5T3JK5Y9`; group `A5AQFD68D9` associated with both Rimba targets. Replacement App Store profiles ACTIVE and decoded locally to verify group entitlements; existing distribution certificate retained.
- GitHub host profile updated and widget profile secret added. Profile/key contents are not in Git or documents.
- Build11/run41403770011 canceled before upload to include the stopwatch safety-deadline guard. Final source408345b has365passing tests and a fresh production export; nativeCI41404506471 and deploy41404509381/build12 are SUCCESS. Stopwatch shows session status, not a false24-hour countdown. Apple build63dde60f-edb0-4122-afe4-9828114e69da is1.0(12) VALID, IN_BETA_TESTING and included in Internal. Draft selects12; EN/ID beta notes saved. No App Review submission.

## Acceptance still required

Install final TestFlight build on a physical device. Add Home/Lock widgets and iOS18 Control Center control through system editors. Check cold/warm 25-minute focus (not seconds), pause/resume/cancel, no duplicate sessions, counters, language and logout→guest isolation. Refresh follows iOS scheduling.

Restore the existing purchase using the original Apple account; verify actual Pro access and feedback. No purchase, manual Pro grant or App Review submission performed. Device acceptance and release gates in `DEVICE_ACCEPTANCE.md` remain open.
