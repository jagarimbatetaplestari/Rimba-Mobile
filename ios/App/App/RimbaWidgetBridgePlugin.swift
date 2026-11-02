import Foundation
import Capacitor
import WidgetKit

@objc(RimbaWidgetBridgePlugin)
public class RimbaWidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public override func load() {
        NotificationCenter.default.addObserver(self, selector: #selector(actionQueued), name: Notification.Name("rimbaWidgetActionQueued"), object: nil)
    }

    @objc private func actionQueued() {
        notifyListeners("widgetActionQueued", data: [:], retainUntilConsumed: true)
    }

    deinit { NotificationCenter.default.removeObserver(self) }

    public let identifier = "RimbaWidgetBridgePlugin"
    public let jsName = "RimbaWidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "syncWidgetState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getWidgetStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "consumePendingAction", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearWidgetState", returnType: CAPPluginReturnPromise)
    ]

    private func reload() {
        WidgetCenter.shared.reloadAllTimelines()
        if #available(iOS 18.0, *) { ControlCenter.shared.reloadAllControls() }
    }

    @objc func syncWidgetState(_ call: CAPPluginCall) {
        guard let defaults = RimbaWidgetStore.defaults else {
            call.reject("Widget App Group is unavailable in this build")
            return
        }
        guard let payload = call.getString("payload"), let data = payload.data(using: .utf8),
              (try? JSONDecoder().decode(RimbaWidgetTelemetry.self, from: data)) != nil else {
            call.reject("Invalid widget state")
            return
        }
        defaults.set(payload, forKey: RimbaWidgetStore.telemetryKey)
        defaults.synchronize()
        reload()
        call.resolve(["synced": true])
    }

    @objc func getWidgetStatus(_ call: CAPPluginCall) {
        let available = RimbaWidgetStore.defaults != nil
        let controls: Bool
        if #available(iOS 18.0, *) { controls = true } else { controls = false }
        WidgetCenter.shared.getCurrentConfigurations { result in
            let count = (try? result.get().filter { $0.kind == "RimbaSanctuaryWidget" }.count)
            var response: [String: Any] = ["available": available, "controlsSupported": controls]
            if let count { response["installedWidgets"] = count }
            call.resolve(response)
        }
    }

    @objc func consumePendingAction(_ call: CAPPluginCall) {
        let url = RimbaWidgetStore.defaults.flatMap { RimbaWidgetStore.consumeAction(in: $0) }
        if let url { call.resolve(["url": url]) } else { call.resolve([:]) }
    }

    @objc func clearWidgetState(_ call: CAPPluginCall) {
        guard let defaults = RimbaWidgetStore.defaults else { call.reject("Widget App Group is unavailable"); return }
        RimbaWidgetStore.clear(in: defaults)
        reload()
        call.resolve(["cleared": true])
    }
}
