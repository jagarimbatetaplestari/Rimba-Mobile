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
        // Expire the countdown at the real end, even when the app is in the background.
        var entries = [RimbaWidgetEntry(date: now, telemetry: state)]
        if let end = state.focusEnd(now: now) { entries.append(RimbaWidgetEntry(date: end, telemetry: state)) }
        completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(900))))
    }
}

struct RimbaWidgetEntryView: View {
    let entry: RimbaWidgetEntry
    @Environment(\.widgetFamily) private var family
    private var state: RimbaWidgetTelemetry { entry.telemetry }
    private var en: Bool { state.language == "en" }
    private var jade: Color { Color(red: 0.08, green: 0.42, blue: 0.30) }
    private var focusURL: URL { URL(string: "rimba://focus?minutes=\(state.quickPresetMinutes)")! }
    private var ratio: Double { min(1, max(0, Double(state.todayMinutes) / Double(max(1, state.dailyGoalMinutes)))) }

    var body: some View {
        Group {
            if #available(iOS 17.0, *) {
                content.containerBackground(for: .widget) { Color(red: 0.88, green: 0.95, blue: 0.90) }
            } else {
                content.padding(12).background(Color(red: 0.88, green: 0.95, blue: 0.90))
            }
        }
        .widgetURL(focusURL)
    }

    @ViewBuilder private var content: some View {
        switch family {
        case .accessoryCircular:
            Gauge(value: ratio) { Image(systemName: "leaf.fill") } currentValueLabel: {
                Text("\(state.todayMinutes)").monospacedDigit()
            }.gaugeStyle(.accessoryCircular)
        case .accessoryInline:
            if let end = state.focusEnd(now: entry.date) {
                Label { Text(timerInterval: entry.date...end, countsDown: true) } icon: { Image(systemName: "timer") }
            } else {
                Text("Rimba · \(state.todayMinutes) \(en ? "min" : "mnt") · \(state.streakDays) \(en ? "days" : "hari")")
            }
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 3) {
                Label("Rimba", systemImage: "leaf.fill").font(.headline)
                focusOrSummary.font(.caption).monospacedDigit()
                ProgressView(value: ratio)
            }
        default:
            home
        }
    }

    @ViewBuilder private var focusOrSummary: some View {
        if let end = state.focusEnd(now: entry.date) {
            Text(timerInterval: entry.date...end, countsDown: true)
        } else if state.isFocusPaused {
            Text(en ? "Focus paused · Open Rimba" : "Fokus dijeda · Buka Rimba")
        } else if state.isFocusActive {
            Text(en ? "Check your session in Rimba" : "Lihat sesi di Rimba")
        } else {
            Text("\(state.todayMinutes) / \(state.dailyGoalMinutes) \(en ? "min today" : "mnt hari ini")")
        }
    }

    private var home: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Label("Rimba", systemImage: "leaf.fill").font(.headline)
                    Spacer(minLength: 4)
                    Text("\(state.streakDays)🔥").font(.caption.bold())
                }
                Spacer(minLength: 0)
                focusOrSummary.font(.system(size: family == .systemMedium ? 25 : 20, weight: .bold, design: .rounded))
                    .minimumScaleFactor(0.6).lineLimit(1)
                ProgressView(value: ratio).tint(jade)
                Text("\(state.totalTrees) \(en ? "trees" : "pohon") · Lv.\(state.level)")
                    .font(.caption).foregroundStyle(jade)
                if family == .systemSmall { startLink }
            }
            if family == .systemMedium {
                VStack(spacing: 10) {
                    startLink
                    Link(destination: URL(string: "rimba://soundscape")!) {
                        Label(en ? "Nature audio" : "Audio alam", systemImage: "headphones")
                            .font(.caption.bold()).padding(8)
                    }
                }.frame(width: 110)
            }
        }
        .foregroundStyle(Color(red: 0.04, green: 0.22, blue: 0.15))
    }

    private var startLink: some View {
        Link(destination: focusURL) {
            Label(state.isFocusActive ? (en ? "Open focus" : "Buka fokus") : "\(en ? "Focus" : "Fokus") \(state.quickPresetMinutes)m",
                  systemImage: state.isFocusActive ? "timer" : "play.fill")
                .font(.caption.bold()).frame(maxWidth: .infinity).padding(.vertical, 9)
                .foregroundStyle(.white).background(jade, in: RoundedRectangle(cornerRadius: 12))
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
