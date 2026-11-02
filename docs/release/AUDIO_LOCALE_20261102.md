# Audio, island language and modal icons — 2 November2026

Owner reported mute/volume ineffective, island names not following language, colored modal emoji and no report queue in Campfire on the prior build.

- Music used only HTMLAudioElement.volume, ineffective on iOS. It now uses one reused MediaElementSource→Gain path plus hard mute. Master/ambient preferences update active playback; zero volume survives settings toggles. Nature and SFX master gains honor mute/disabled state, including pre-initialization and already ringing effects. Active-channel mute state stays synchronized between capsule and modal.
- Generated island names localize at display time. Explicit custom names are preserved using optional custom/generated provenance; original saves are not rewritten just for switching language. Biome labels also follow EN/ID. Legacy exact auto-name formats lack historical provenance; recognition is deliberately narrow.
- Default popup icons and preset avatar presentation use monochrome Lucide outlines. Original preset identifiers, uploads/custom avatar content, story art and outbound share text remain intact. Settings and mixer decorative emoji were removed too.
- Moderator access previously lived only in Profile. Campfire now offers a direct entry when its server RPC confirms moderator rights, rejects stale results on account changes and refreshes when reopened. Empty queues display an explicit no-pending-reports message; no fake reports were created.

Evidence:401tests/45files, typecheck,155prelaunch assertions and final production export passed. New audio tests include iOS-style ignored element.volume, real gain/mute behavior and unavailable-WebAudio fallback. Island tests cover custom names, generated names and EN/ID switching. Campfire entry regressions were observed failing before the fix and now pass. Independent review found no actionable implementation issue.

Actual Chromium UI playback tested in EN/ID: slider0→element muted/gain0; slider0.2→gain≈0.2; mute→gain0; unmute restores0.2. Evidence is ignored `build/build14-ui/results.json` and PNGs. This is not physical iPhone audio evidence. Final native candidate and device acceptance remain distinct; see handoff.

Source `9b6548d`. NativeCI41445401653 queued waiting for a macOS runner at last check; there is no TestFlight14 upload yet. Build13VALID/Internal contains only earlier paywall/flyout fixes. Continue from this run before deploying the next candidate. No App Review submission.
