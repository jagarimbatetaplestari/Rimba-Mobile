import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Telemetry Model Shared via App Group (group.com.syntheticae.rimba)

struct RimbaWidgetTelemetry: Codable {
    var updatedAt: String = ""
    var language: String = "id"
    var rangerName: String = "Penjaga Rimba"
    var level: Int = 1
    var levelTitle: String = "Pemula Suaka"
    var levelBadge: String = "🌱"
    var xp: Int = 50
    var soul: Int = 60
    var streakDays: Int = 1
    var streakTitle: String = "Pemula Rimba"
    var streakIcon: String = "🌾"
    var todayMinutes: Int = 0
    var dailyGoalMinutes: Int = 60
    var todayTrees: Int = 0
    var totalTrees: Int = 1
    var unlockedTiles: Int = 9
    var zoneName: String = "Zone 1"
    var activeBiome: String = "meadow"
    var quickPresetMinutes: Int = 25
    var isFocusActive: Bool = false
    var activeSessionTag: String? = nil
    var activeSessionSpecies: String? = nil
    var activeSessionEndsAt: String? = nil
    var activeSessionDurationMinutes: Int = 25

    static func loadFromSharedStorage() -> RimbaWidgetTelemetry {
        let key = "rimba_widget_telemetry_v1"
        let groupDefaults = UserDefaults(suiteName: "group.com.syntheticae.rimba")
        let jsonString = groupDefaults?.string(forKey: key) ?? UserDefaults.standard.string(forKey: key)
        if let raw = jsonString,
           let data = raw.data(using: .utf8),
           let decoded = try? JSONDecoder().decode(RimbaWidgetTelemetry.self, from: data) {
            return decoded
        }
        return RimbaWidgetTelemetry()
    }
}

struct RimbaWidgetEntry: TimelineEntry {
    let date: Date
    let telemetry: RimbaWidgetTelemetry
}

struct RimbaTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> RimbaWidgetEntry {
        RimbaWidgetEntry(date: Date(), telemetry: RimbaWidgetTelemetry())
    }

    func getSnapshot(in context: Context, completion: @escaping (RimbaWidgetEntry) -> Void) {
        completion(RimbaWidgetEntry(date: Date(), telemetry: RimbaWidgetTelemetry.loadFromSharedStorage()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RimbaWidgetEntry>) -> Void) {
        let entry = RimbaWidgetEntry(date: Date(), telemetry: RimbaWidgetTelemetry.loadFromSharedStorage())
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date().addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

// MARK: - Home Screen & Lock Screen Views

struct RimbaWidgetEntryView: View {
    var entry: RimbaTimelineProvider.Entry
    @Environment(\.widgetFamily) var family

    private var isEn: Bool { entry.telemetry.language == "en" }
    private var progressRatio: Double {
        let goal = Double(max(1, entry.telemetry.dailyGoalMinutes))
        return min(1.0, Double(entry.telemetry.todayMinutes) / goal)
    }

    var body: some View {
        switch family {
        case .systemSmall:
            smallHomeView
        case .systemMedium:
            mediumHomeView
        case .accessoryCircular:
            lockScreenCircularView
        case .accessoryRectangular:
            lockScreenRectangularView
        case .accessoryInline:
            lockScreenInlineView
        default:
            smallHomeView
        }
    }

    // 1. Home Screen Small Widget
    private var smallHomeView: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("🌲 Rimba")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundColor(Color(red: 0.05, green: 0.21, blue: 0.16))
                Spacer()
                Text("🔥 \(entry.telemetry.streakDays)d")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.orange.opacity(0.18))
                    .cornerRadius(8)
            }

            Spacer(minLength: 0)

            Text("\(entry.telemetry.todayMinutes)m")
                .font(.system(size: 26, weight: .heavy, design: .rounded))
                .foregroundColor(Color(red: 0.05, green: 0.21, blue: 0.16))

            Text(isEn ? "Focused Today · \(entry.telemetry.totalTrees) Trees" : "Fokus Hari Ini · \(entry.telemetry.totalTrees) Pohon")
                .font(.system(size: 10, weight: .medium, design: .rounded))
                .foregroundColor(Color(red: 0.30, green: 0.46, blue: 0.40))
                .lineLimit(1)

            Link(destination: URL(string: "rimba://focus?minutes=\(entry.telemetry.quickPresetMinutes)")!) {
                HStack(spacing: 4) {
                    Image(systemName: entry.telemetry.isFocusActive ? "timer" : "play.fill")
                        .font(.system(size: 10, weight: .bold))
                    Text(entry.telemetry.isFocusActive
                         ? (isEn ? "In Session" : "Sesi Aktif")
                         : (isEn ? "Focus \(entry.telemetry.quickPresetMinutes)m" : "Fokus \(entry.telemetry.quickPresetMinutes)m"))
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .background(Color(red: 0.09, green: 0.46, blue: 0.34))
                .foregroundColor(.white)
                .cornerRadius(12)
            }
        }
        .padding(12)
        .background(
            LinearGradient(
                colors: [Color(red: 0.90, green: 0.95, blue: 0.92), Color(red: 0.84, green: 0.92, blue: 0.88)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }

    // 2. Home Screen Medium Widget
    private var mediumHomeView: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Text("\(entry.telemetry.levelBadge) Lv.\(entry.telemetry.level)")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color(red: 0.09, green: 0.46, blue: 0.34).opacity(0.14))
                        .cornerRadius(8)
                    Text("🔥 \(entry.telemetry.streakDays) \(isEn ? "Day Streak" : "Hari Beruntun")")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundColor(Color(red: 0.05, green: 0.21, blue: 0.16))
                }

                Text("\(entry.telemetry.todayMinutes) / \(entry.telemetry.dailyGoalMinutes) \(isEn ? "min" : "mnt")")
                    .font(.system(size: 24, weight: .heavy, design: .rounded))
                    .foregroundColor(Color(red: 0.05, green: 0.21, blue: 0.16))

                ProgressView(value: progressRatio)
                    .tint(Color(red: 0.09, green: 0.46, blue: 0.34))

                Text("🌳 \(entry.telemetry.totalTrees) \(isEn ? "Trees" : "Pohon") · 🗺️ \(entry.telemetry.unlockedTiles)/100 \(isEn ? "Tiles" : "Petak")")
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundColor(Color(red: 0.30, green: 0.46, blue: 0.40))
            }

            VStack(spacing: 8) {
                Link(destination: URL(string: "rimba://focus?minutes=\(entry.telemetry.quickPresetMinutes)")!) {
                    VStack(spacing: 4) {
                        Image(systemName: "play.circle.fill")
                            .font(.system(size: 22))
                        Text(isEn ? "Focus \(entry.telemetry.quickPresetMinutes)m" : "Fokus \(entry.telemetry.quickPresetMinutes)m")
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                    }
                    .frame(width: 96, height: 64)
                    .background(Color(red: 0.09, green: 0.46, blue: 0.34))
                    .foregroundColor(.white)
                    .cornerRadius(16)
                }

                Link(destination: URL(string: "rimba://soundscape")!) {
                    HStack(spacing: 4) {
                        Image(systemName: "headphones")
                            .font(.system(size: 10, weight: .bold))
                        Text(isEn ? "Sanctum Audio" : "Audio Alam")
                            .font(.system(size: 10, weight: .semibold, design: .rounded))
                    }
                    .frame(width: 96, height: 28)
                    .background(Color.white.opacity(0.85))
                    .foregroundColor(Color(red: 0.05, green: 0.21, blue: 0.16))
                    .cornerRadius(10)
                }
            }
        }
        .padding(14)
        .background(
            LinearGradient(
                colors: [Color(red: 0.90, green: 0.95, blue: 0.92), Color(red: 0.84, green: 0.92, blue: 0.88)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }

    // 3. Lock Screen Circular Widget
    private var lockScreenCircularView: some View {
        Gauge(value: progressRatio) {
            Text("🌲")
        } currentValueLabel: {
            Text("\(entry.telemetry.streakDays)🔥")
                .font(.system(size: 11, weight: .bold, design: .rounded))
        }
        .gaugeStyle(.accessoryCircular)
        .widgetURL(URL(string: "rimba://focus?minutes=\(entry.telemetry.quickPresetMinutes)"))
    }

    // 4. Lock Screen Rectangular Widget
    private var lockScreenRectangularView: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text("🌲 Rimba · 🔥 \(entry.telemetry.streakDays)d")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                Spacer()
            }
            Text(isEn
                 ? "Today: \(entry.telemetry.todayMinutes)m · \(entry.telemetry.totalTrees) Trees"
                 : "Hari ini: \(entry.telemetry.todayMinutes)m · \(entry.telemetry.totalTrees) Pohon")
                .font(.system(size: 11, weight: .medium, design: .rounded))
            ProgressView(value: progressRatio)
        }
        .widgetURL(URL(string: "rimba://focus?minutes=\(entry.telemetry.quickPresetMinutes)"))
    }

    // 5. Lock Screen Inline Widget
    private var lockScreenInlineView: some View {
        Text("🌲 \(entry.telemetry.streakDays)d 🔥 · \(entry.telemetry.todayMinutes)m (\(entry.telemetry.totalTrees) 🌳)")
            .widgetURL(URL(string: "rimba://focus?minutes=\(entry.telemetry.quickPresetMinutes)"))
    }
}

struct RimbaSanctuaryWidget: Widget {
    let kind: String = "RimbaSanctuaryWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RimbaTimelineProvider()) { entry in
            RimbaWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Rimba Sanctuary")
        .description("Track your daily focus streak, sanctuary trees, and start a focus session in 1 tap.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline
        ])
    }
}

// MARK: - iOS 18 Control Center Quick Focus Widget

@available(iOS 18.0, *)
struct LaunchRimbaFocusIntent: AppIntent {
    static var title: LocalizedStringResource = "Start Focus in Rimba"
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        let telemetry = RimbaWidgetTelemetry.loadFromSharedStorage()
        let groupDefaults = UserDefaults(suiteName: "group.com.syntheticae.rimba")
        groupDefaults?.set("rimba://focus?minutes=\(telemetry.quickPresetMinutes)", forKey: "rimba_pending_control_url")
        return .result()
    }
}

@available(iOS 18.0, *)
struct RimbaControlCenterWidget: ControlWidget {
    static let kind: String = "com.syntheticae.rimba.ControlFocus"

    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: Self.kind) {
            ControlWidgetButton(action: LaunchRimbaFocusIntent()) {
                Label("Rimba Focus", systemImage: "leaf.fill")
            }
        }
        .displayName("Start Rimba Focus")
        .description("Launch an instant mindful focus session in your Rimba Sanctuary.")
    }
}

@main
struct RimbaWidgetsBundle: WidgetBundle {
    var body: some Widget {
        RimbaSanctuaryWidget()
        if #available(iOS 18.0, *) {
            RimbaControlCenterWidget()
        }
    }
}
