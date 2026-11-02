# Native widgets implementation

Use the existing SwiftUI visual direction; preserve owner changes at b09e007. Deliver actual WidgetKit surfaces on iPhone/iPad, not an in-app simulation.

1. Add and embed `com.syntheticae.rimba.widgets` in the App Xcode target, with iOS16 Home/Lock Screen support and iOS18 Control Center availability. Validate parsed Xcode target membership, dependencies, resources and entitlements, then compile both device families in macOS CI.
2. Share aggregate telemetry through `group.com.syntheticae.rimba`. Register the local Capacitor bridge through a custom bridge controller. Report unavailable/failed native sync honestly; clear telemetry and queued commands on logout. Empty state must contain no invented focus history.
3. Compile the quick-focus AppIntent in both targets. Queue one timestamped command and atomically consume it once after app/auth/game readiness, including cold launches. Keep the existing focus action and active-session guard. Validate duration/protocol and reject expired/duplicate commands.
4. Replace the in-app widget simulation with installation instructions and duration preferences; native surfaces display real statistics and a live focus timer. Add privacy manifests for accessed UserDefaults APIs, including the shared container reason.
5. Register/associate the App Group and extension identifier in Apple Developer, generate matching App Store profiles for both targets, and extend release signing/export/versioning to include the extension. Verify actual archive/IPA contains a signed embedded extension with matching versions and group entitlement.
6. Run focused regressions, full tests, typecheck, prelaunch and export. Push a native candidate; fix compiler failures using the logs. Upload TestFlight after native checks, never Submit App Review. Report installation and physical-device acceptance separately from CI success.

Shared data is limited to widget telemetry; no auth tokens, email, receipt or cloud credentials. System refresh budgets apply; timeline refresh is not a promise of polling every fifteen minutes.
