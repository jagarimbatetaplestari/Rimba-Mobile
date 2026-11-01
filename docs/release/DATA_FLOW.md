# Rimba data flow checkpoint

This is an implementation inventory, not a published App Privacy declaration. Final labels must reflect the final binary and SDK behavior.

| Flow | Data | Destination / visibility | Evidence and remaining gate |
| --- | --- | --- | --- |
| Guest sanctuary | Focus sessions, task notes/tags, to-dos, objects, ledger, local profile, settings | Local device storage; explicit backup/export may leave the device through the user's share destination | storage.ts, backupManager.ts. Owner isolation and corruption recovery remain separate gates. |
| Email/Apple/Google sign-in | Provider identity, user ID, email (including Apple relay email), name/profile metadata and session tokens | Supabase Auth; Apple/Google perform their native provider authentication | useAuthStore.ts. Actual first/repeat/Hide My Email/cancellation/recovery acceptance pending. |
| Account profile | Display name, bio, avatar URL, XP/level | Supabase profiles. Safe public columns are readable; email column is server-only after deployed migration | Do not claim public profiles/avatars are private or end-to-end encrypted. |
| Avatar selection | User-chosen photo, compressed image or local data URL fallback | Supabase avatars bucket when uploaded; public URL can be shared/read. Upload owner path, JPEG/PNG/WebP and5MiB limits enforced | uploadAvatarFile and AvatarPickerModal. Verify replacement/legacy cleanup on a disposable account. |
| Cloud save | Full sanctuary JSON including session history, task notes/tags, to-dos, islands and ledger | Supabase game_saves with owner RLS | cloudSync.ts. Client payload is not evidence of a purchase. Conflict/tombstone/owner migration unresolved. |
| Purchase/restore | Stable Supabase user ID, store transaction and entitlement information | Apple StoreKit and RevenueCat; server subscription storage reserved for verified backend writes | revenueCatService.ts. Trusted lifecycle integration and final SDK data-disclosure audit pending. Never send private Apple keys to the client. |
| Account deletion | Verified user session and fresh Apple authorization code for linked accounts | Supabase delete-account Edge Function; Apple token exchange/revocation; Storage API physical removal; Auth Admin deletion with FK cascades | Keys are encrypted Edge secrets. No deletion of real users was performed for tests. Device revocation acceptance pending. |
| Campfire/social | Room/participant state and any shared profile/session data | Supabase Realtime and public profiles according to current code | campfireStore.ts; detailed authorization, persistence and moderation audit still required before final disclosure. |
| Export/share | Explicit sanctuary backup, analytics or image card | Device filesystem/share sheet/gallery/user-selected destination | Filesystem/Share/native bridge; tests must distinguish cancelled or failed export from success. |

Camera/photo purpose strings and audio background mode are present in Info.plist. Purpose strings alone do not prove permission usage, consent timing or App Privacy correctness. No verified microphone/location data collection claim is made by this inventory.

Retention/deletion guarantees must match the deployed provider configuration and actual cleanup; no invented fixed SLA. Account deletion does not cancel an Apple subscription. Website privacy is published at https://rimba-website.jagarimba-tetaplestari.workers.dev/privacy and was checked before linking the store listing.
