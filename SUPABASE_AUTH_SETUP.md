# Rimba authentication setup (release candidate)

Project: rkljugrrscmqopeuwtpd. Bundle: com.syntheticae.rimba. Minimum iOS: 16; iPhone and iPad.

## Google

Google Cloud project rimba-focus-garden belongs to the Rimba account. Web callback is https://rkljugrrscmqopeuwtpd.supabase.co/auth/v1/callback. Native iOS uses its distinct OAuth client and reversed URL scheme in Info.plist. Public client IDs are injected using NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID and NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID; these are not client secrets. Never put the web client secret in NEXT_PUBLIC_ variables.

Private OAuth backup: D:/Project/Apple Dev/Rimba_Google_OAuth.json. The web secret is configured in Supabase Auth. Google provider is enabled; nonce checking remains enabled and email remains required.

SDK: @capgo/capacitor-social-login 6.0.1, compatible with Capacitor 6; linked GoogleSignIn 8.0. Native login exchanges the SDK ID token through Supabase signInWithIdToken and requires a valid matching session. Cancellation or missing tokens must not fall back to WKWebView OAuth or report success.

Still required: Google production audience/branding, CI public environment variables, macOS Pods/archive, iPhone+iPad authorization/cancellation/account switching and token nonce behavior on real devices. Do not disable nonce validation to hide a failing test.

## Apple

Native capability exists on the Rimba target. Audience is com.syntheticae.rimba. Nonces require WebCrypto random bytes and SHA-256. Full-name cache is owner keyed.

Apple provider is NOT enabled yet. Backend Apple key, reauthorization/code exchange/revocation and Storage API account cleanup remain pending. The legacy SQL deletion RPC is not a final Apple-compliant implementation.

## Email

Email provider and signup are enabled, confirmation is ON. Signup does not imply a session before verification. SMTP delivery, OTP expiry/resend/rate limits and password recovery still need end-to-end verification. Do not disable confirmation to make signup appear to work.

## Data and testing

Do not use real important accounts for deletion tests. Source/mock checks and TypeScript tests are separate from native acceptance. Current callback guards discard stale sessions but owner-scoped storage/guest migration must be completed before release. Never run the former broad Website-to-Mobile code sync; the root wrapper now previews an approved asset allowlist only.
