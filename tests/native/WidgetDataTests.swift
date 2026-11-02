import Foundation

@main
enum WidgetDataTests {
    static func main() throws {
        let suite = "rimba-widget-tests-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        assert(RimbaWidgetTelemetry.empty.totalTrees == 0)
        assert(RimbaWidgetTelemetry.empty.streakDays == 0)
        assert(RimbaWidgetTelemetry.empty.focusEnd(now: now) == nil)
        var state = RimbaWidgetTelemetry.empty
        state.isFocusActive = true
        state.activeSessionEndsAt = ISO8601DateFormatter().string(from: now.addingTimeInterval(60))
        assert(state.focusEnd(now: now) == now.addingTimeInterval(60))
        state.isFocusPaused = true
        assert(state.focusEnd(now: now) == nil)
        state.isFocusPaused = false
        assert(state.focusEnd(now: now.addingTimeInterval(61)) == nil)
        let decoded = try JSONDecoder().decode(RimbaWidgetTelemetry.self, from: JSONEncoder().encode(state))
        assert(decoded.isFocusActive)
        try RimbaWidgetStore.queueFocus(in: defaults, minutes: 45, now: now)
        assert(RimbaWidgetStore.consumeAction(in: defaults, now: now) == "rimba://focus?minutes=45")
        assert(RimbaWidgetStore.consumeAction(in: defaults, now: now) == nil)
        try RimbaWidgetStore.queueFocus(in: defaults, minutes: 45, now: now)
        assert(RimbaWidgetStore.consumeAction(in: defaults, now: now.addingTimeInterval(301)) == nil)
        try RimbaWidgetStore.queueFocus(in: defaults, minutes: 999, now: now)
        assert(RimbaWidgetStore.consumeAction(in: defaults, now: now) == "rimba://focus?minutes=25")
        defaults.set("old owner", forKey: RimbaWidgetStore.telemetryKey)
        try RimbaWidgetStore.queueFocus(in: defaults, minutes: 25, now: now)
        RimbaWidgetStore.clear(in: defaults)
        assert(defaults.object(forKey: RimbaWidgetStore.telemetryKey) == nil)
        assert(RimbaWidgetStore.consumeAction(in: defaults, now: now) == nil)
        print("Native widget data tests passed: empty state, timer, pause, one-shot actions, expiry, sign-out")
    }
}
