import Foundation

// Only aggregate sanctuary state crosses the App Group boundary. No credentials or account IDs.
struct RimbaWidgetTelemetry: Codable {
    var updatedAt: String
    var language: String
    var level: Int
    var levelBadge: String
    var streakDays: Int
    var todayMinutes: Int
    var dailyGoalMinutes: Int
    var totalTrees: Int
    var unlockedTiles: Int
    var quickPresetMinutes: Int
    var isFocusActive: Bool
    var isFocusPaused: Bool
    var activeSessionEndsAt: String?

    static let empty = RimbaWidgetTelemetry(updatedAt: "", language: "id", level: 1,
        levelBadge: "🌱", streakDays: 0, todayMinutes: 0, dailyGoalMinutes: 60,
        totalTrees: 0, unlockedTiles: 0, quickPresetMinutes: 25, isFocusActive: false,
        isFocusPaused: false, activeSessionEndsAt: nil)

    static func loadFromSharedStorage() -> Self {
        guard let raw = RimbaWidgetStore.defaults?.string(forKey: RimbaWidgetStore.telemetryKey),
              let data = raw.data(using: .utf8),
              let value = try? JSONDecoder().decode(Self.self, from: data) else { return .empty }
        return value
    }

    func focusEnd(now: Date = Date()) -> Date? {
        guard isFocusActive, !isFocusPaused, let value = activeSessionEndsAt else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: value) ?? ISO8601DateFormatter().date(from: value), date > now else { return nil }
        return date
    }
}

struct RimbaWidgetAction: Codable {
    let url: String
    let createdAt: Date
}

enum RimbaWidgetStore {
    static let group = "group.com.syntheticae.rimba"
    static let telemetryKey = "rimba_widget_telemetry_v1"
    static let actionKey = "rimba_pending_widget_action_v1"
    static var defaults: UserDefaults? {
        guard FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) != nil else { return nil }
        return UserDefaults(suiteName: group)
    }

    static func queueFocus(in defaults: UserDefaults, minutes: Int, now: Date = Date()) throws {
        let safeMinutes = [15, 25, 45, 60].contains(minutes) ? minutes : 25
        let action = RimbaWidgetAction(url: "rimba://focus?minutes=\(safeMinutes)", createdAt: now)
        defaults.set(try JSONEncoder().encode(action), forKey: actionKey)
        defaults.synchronize()
    }

    static func consumeAction(in defaults: UserDefaults, now: Date = Date()) -> String? {
        guard let data = defaults.data(forKey: actionKey) else { return nil }
        defaults.removeObject(forKey: actionKey)
        defaults.synchronize()
        guard let action = try? JSONDecoder().decode(RimbaWidgetAction.self, from: data),
              (0...300).contains(now.timeIntervalSince(action.createdAt)),
              let url = URLComponents(string: action.url), url.scheme == "rimba", url.host == "focus" else { return nil }
        return action.url
    }

    static func clear(in defaults: UserDefaults) {
        for key in [telemetryKey, actionKey, "rimba_pending_control_url"] { defaults.removeObject(forKey: key) }
        defaults.synchronize()
    }
}
