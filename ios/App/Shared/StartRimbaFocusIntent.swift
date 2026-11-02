import AppIntents
import Foundation

struct LaunchRimbaFocusIntent: AppIntent {
    static var title: LocalizedStringResource = "Start Focus in Rimba"
    static var openAppWhenRun: Bool = true

    @MainActor
    func perform() async throws -> some IntentResult {
        guard let defaults = RimbaWidgetStore.defaults else { throw WidgetActionError.sharedStorageUnavailable }
        try RimbaWidgetStore.queueFocus(in: defaults, minutes: RimbaWidgetTelemetry.loadFromSharedStorage().quickPresetMinutes)
        NotificationCenter.default.post(name: Notification.Name("rimbaWidgetActionQueued"), object: nil)
        return .result()
    }
}

private enum WidgetActionError: Error { case sharedStorageUnavailable }
