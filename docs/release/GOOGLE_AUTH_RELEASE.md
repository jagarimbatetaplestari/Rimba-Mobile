# Google native sign-in release gate

Updated 1 November 2026.

## Build 4 investigation

The TestFlight deployment workflow omitted `NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID` and
`NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` from the static export build. The native login
requires both before invoking the SDK. Next.js embeds these public values during
the build, so changing runtime configuration cannot repair an already uploaded IPA.
The simulator verification workflow supplied the IDs, allowing verification and
release builds to differ. This is a confirmed release configuration defect; the
reported device failure still needs acceptance on the replacement candidate.

The deployment job now supplies both values to preflight and build using the same
repository-variable bindings and public fallbacks as simulator verification.
`check-release-env.mjs` rejects missing or malformed Google client IDs before build
or signing. Client IDs are public identifiers; OAuth client secrets remain outside
the repository.

## SDK behavior checked locally

Installed `@capgo/capacitor-social-login` 6.0.1 implements online Google logout by
calling `GIDSignIn.sharedInstance.signOut()` and resolving, including when there is
no current user. Its offline mode rejects logout. The app initializes online mode.
The SDK source does not support treating an absent Google session as a reason to
ignore arbitrary logout errors.

## Remaining native acceptance

- Verify macOS compilation and the registered reversed iOS client URL scheme.
- Upload a candidate rebuilt with both public IDs after native CI passes.
- Test first login, cancellation, retry, logout/relogin and account switching on
  the replacement build on iPhone and iPad. Confirm Supabase receives a valid ID
  token and the UI shows the matching verified session.
- Verify current Google consent audience/publishing configuration for external
  release and the accepted web/iOS audiences in Supabase.

Unit tests and configuration preflight do not establish device sign-in success.
