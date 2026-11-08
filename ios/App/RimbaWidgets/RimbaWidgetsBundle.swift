import WidgetKit
import SwiftUI
import AppIntents

struct RimbaWidgetEntry: TimelineEntry {
    let date: Date
    let telemetry: RimbaWidgetTelemetry
}

struct RimbaTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> RimbaWidgetEntry {
        RimbaWidgetEntry(date: Date(), telemetry: .empty)
    }
    func getSnapshot(in context: Context, completion: @escaping (RimbaWidgetEntry) -> Void) {
        completion(RimbaWidgetEntry(date: Date(), telemetry: .loadFromSharedStorage()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<RimbaWidgetEntry>) -> Void) {
        let now = Date(), state = RimbaWidgetTelemetry.loadFromSharedStorage()
        var entries = [RimbaWidgetEntry(date: now, telemetry: state)]
        if let end = state.focusEnd(now: now) { entries.append(RimbaWidgetEntry(date: end, telemetry: state)) }
        completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(900))))
    }
}

struct RimbaWidgetEntryView: View {
    let entry: RimbaWidgetEntry
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var colorScheme

    private var state: RimbaWidgetTelemetry { entry.telemetry }
    private var en: Bool { state.language == "en" }
    private var isDark: Bool { colorScheme == .dark }

    private var primaryText: Color {
        isDark ? Color.white : Color(red: 0.04, green: 0.22, blue: 0.15)
    }
    private var secondaryText: Color {
        isDark ? Color(red: 0.65, green: 0.85, blue: 0.75) : Color(red: 0.12, green: 0.38, blue: 0.28)
    }
    private var emeraldTint: Color {
        isDark ? Color(red: 0.35, green: 0.88, blue: 0.65) : Color(red: 0.08, green: 0.52, blue: 0.36)
    }
    private var amberTint: Color {
        isDark ? Color(red: 0.98, green: 0.76, blue: 0.32) : Color(red: 0.82, green: 0.52, blue: 0.08)
    }

    private var bgGradient: LinearGradient {
        if isDark {
            return LinearGradient(
                colors: [Color(red: 0.05, green: 0.16, blue: 0.11), Color(red: 0.02, green: 0.09, blue: 0.06)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        } else {
            return LinearGradient(
                colors: [Color(red: 0.92, green: 0.97, blue: 0.94), Color(red: 0.83, green: 0.94, blue: 0.88)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    private var focusURL: URL { URL(string: "rimba://focus?minutes=\(state.quickPresetMinutes)")! }
    private var openURL: URL { URL(string: "rimba://open")! }
    private var ratio: Double { min(1, max(0, Double(state.todayMinutes) / Double(max(1, state.dailyGoalMinutes)))) }

    var body: some View {
        Group {
            if #available(iOS 17.0, *) {
                content
                    .containerBackground(for: .widget) {
                        bgGradient
                    }
            } else {
                content
                    .padding(14)
                    .background(bgGradient)
            }
        }
        .widgetURL(state.isFocusActive ? openURL : focusURL)
    }

    @ViewBuilder private var content: some View {
        switch family {
        case .accessoryCircular:
            Gauge(value: ratio) {
                Image(systemName: state.isFocusActive ? "timer" : "leaf.fill")
            } currentValueLabel: {
                Text("\(state.todayMinutes)").monospacedDigit()
            }.gaugeStyle(.accessoryCircular)

        case .accessoryInline:
            if let end = state.focusEnd(now: entry.date) {
                Label {
                    Text(timerInterval: entry.date...end, countsDown: true)
                } icon: {
                    Image(systemName: "timer")
                }
            } else if state.isFocusPaused {
                Label {
                    Text("\(en ? "Paused" : "Jeda") · \(state.pausedTimeString())")
                } icon: {
                    Image(systemName: "pause.fill")
                }
            } else {
                Label {
                    Text("Rimba · \(state.todayMinutes)m · \(state.streakDays)d")
                } icon: {
                    Image(systemName: "leaf.fill")
                }
            }

        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 4) {
                    Image(systemName: "leaf.fill")
                    Text("Rimba").font(.headline)
                    Spacer()
                    if state.streakDays > 0 {
                        HStack(spacing: 2) {
                            Image(systemName: "flame.fill").foregroundStyle(.orange)
                            Text("\(state.streakDays)")
                        }.font(.caption2.bold())
                    }
                }
                focusOrSummary
                    .font(.caption.bold())
                ProgressView(value: ratio)
            }

        default:
            home
        }
    }

    @ViewBuilder private var focusOrSummary: some View {
        if let end = state.focusEnd(now: entry.date) {
            HStack(spacing: 4) {
                Image(systemName: "timer")
                    .font(.system(size: family == .systemMedium ? 15 : 12))
                    .foregroundStyle(emeraldTint)
                Text(timerInterval: entry.date...end, countsDown: true)
                    .monospacedDigit()
            }
        } else if state.isFocusPaused {
            HStack(spacing: 4) {
                Image(systemName: "pause.fill")
                    .font(.system(size: family == .systemMedium ? 15 : 12))
                    .foregroundStyle(amberTint)
                Text(state.pausedTimeString())
                    .monospacedDigit()
                Text(en ? "Paused" : "Jeda")
                    .font(.caption2)
                    .foregroundStyle(secondaryText)
            }
        } else if state.isFocusActive {
            HStack(spacing: 4) {
                Image(systemName: "timer")
                    .font(.system(size: family == .systemMedium ? 15 : 12))
                    .foregroundStyle(emeraldTint)
                Text(en ? "Session active" : "Sesi berjalan")
            }
        } else {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("\(state.todayMinutes)")
                    .font(.system(size: family == .systemMedium ? 26 : 22, weight: .bold, design: .rounded))
                    .monospacedDigit()
                Text("/ \(state.dailyGoalMinutes) \(en ? "min" : "mnt")")
                    .font(.caption)
                    .foregroundStyle(secondaryText)
            }
        }
    }

    private var home: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                // Top Header Row
                HStack {
                    HStack(spacing: 4) {
                        Image(systemName: "leaf.fill")
                            .foregroundStyle(emeraldTint)
                        Text("Rimba")
                            .font(.headline)
                            .foregroundStyle(primaryText)
                    }
                    Spacer(minLength: 4)
                    if state.streakDays > 0 {
                        HStack(spacing: 2.5) {
                            Image(systemName: "flame.fill")
                                .font(.caption2)
                                .foregroundStyle(Color.orange)
                            Text("\(state.streakDays)")
                                .font(.caption.bold())
                                .foregroundStyle(primaryText)
                        }
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(
                            isDark ? Color.orange.opacity(0.18) : Color.orange.opacity(0.12),
                            in: Capsule()
                        )
                    }
                }

                Spacer(minLength: 0)

                // Middle Hero Value
                focusOrSummary
                    .font(.system(size: family == .systemMedium ? 24 : 19, weight: .bold, design: .rounded))
                    .foregroundStyle(primaryText)
                    .minimumScaleFactor(0.7)
                    .lineLimit(1)

                // Progress Bar
                ProgressView(value: ratio)
                    .tint(emeraldTint)

                // Subtitle: Trees & Level
                HStack(spacing: 4) {
                    Image(systemName: "tree.fill")
                        .font(.caption2)
                    Text("\(state.totalTrees) \(en ? "trees" : "pohon")")
                    Text("·")
                    Text("Lv.\(state.level)").bold()
                }
                .font(.caption2)
                .foregroundStyle(secondaryText)

                if family == .systemSmall {
                    startLink
                }
            }

            // Medium Widget Side Column: Action Shortcuts
            if family == .systemMedium {
                VStack(spacing: 8) {
                    startLink
                    Link(destination: URL(string: "rimba://soundscape")!) {
                        HStack(spacing: 4) {
                            Image(systemName: "headphones")
                                .font(.caption)
                            Text(en ? "Audio" : "Audio")
                                .font(.caption.bold())
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 7)
                        .foregroundStyle(primaryText)
                        .background(
                            isDark ? Color.white.opacity(0.10) : Color.white.opacity(0.60),
                            in: RoundedRectangle(cornerRadius: 11)
                        )
                    }
                    Link(destination: URL(string: "rimba://journal")!) {
                        HStack(spacing: 4) {
                            Image(systemName: "book.closed.fill")
                                .font(.caption)
                            Text(en ? "Journal" : "Jurnal")
                                .font(.caption.bold())
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 7)
                        .foregroundStyle(primaryText)
                        .background(
                            isDark ? Color.white.opacity(0.10) : Color.white.opacity(0.60),
                            in: RoundedRectangle(cornerRadius: 11)
                        )
                    }
                }
                .frame(width: 104)
            }
        }
    }

    private var startLink: some View {
        Link(destination: state.isFocusActive ? openURL : focusURL) {
            HStack(spacing: 5) {
                Image(systemName: state.isFocusActive ? (state.isFocusPaused ? "play.fill" : "timer") : "play.fill")
                    .font(.caption.bold())
                Text(state.isFocusActive ? (en ? "Open Rimba" : "Buka Suaka") : "\(en ? "Focus" : "Fokus") \(state.quickPresetMinutes)m")
                    .font(.caption.bold())
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .foregroundStyle(isDark ? Color(red: 0.04, green: 0.22, blue: 0.15) : .white)
            .background(emeraldTint, in: RoundedRectangle(cornerRadius: 12))
            .shadow(color: emeraldTint.opacity(0.25), radius: 3, y: 1.5)
        }
    }
}

struct RimbaSanctuaryWidget: Widget {
    let kind = "RimbaSanctuaryWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RimbaTimelineProvider()) { RimbaWidgetEntryView(entry: $0) }
            .configurationDisplayName("Rimba Sanctuary")
            .description("Daily focus, sanctuary progress, and a shortcut to your focus session.")
            .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

@available(iOS 18.0, *)
struct RimbaControlCenterWidget: ControlWidget {
    static let kind = "com.syntheticae.rimba.ControlFocus"
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: Self.kind) {
            ControlWidgetButton(action: LaunchRimbaFocusIntent()) {
                Label("Rimba Focus", systemImage: "leaf.fill")
            }
        }
        .displayName("Rimba Focus")
        .description("Open Rimba and start focus using your preferred duration.")
    }
}

@main
struct RimbaWidgetsBundle: WidgetBundle {
    var body: some Widget {
        RimbaSanctuaryWidget()
        if #available(iOS 18.0, *) { RimbaControlCenterWidget() }
    }
}
