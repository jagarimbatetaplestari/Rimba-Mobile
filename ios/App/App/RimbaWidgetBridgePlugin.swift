import Foundation
import Capacitor
import WidgetKit

@objc(RimbaWidgetBridgePlugin)
public class RimbaWidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RimbaWidgetBridgePlugin"
    public let jsName = "RimbaWidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "syncWidgetState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reloadWidgets", returnType: CAPPluginReturnPromise)
    ]

    private let appGroupSuiteName = "group.com.syntheticae.rimba"
    private let telemetryKey = "rimba_widget_telemetry_v1"

    @objc func syncWidgetState(_ call: CAPPluginCall) {
        let payload = call.getString("payload") ?? "{}"

        if let groupDefaults = UserDefaults(suiteName: appGroupSuiteName) {
            groupDefaults.set(payload, forKey: telemetryKey)
            groupDefaults.synchronize()
        }

        UserDefaults.standard.set(payload, forKey: telemetryKey)

        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        if #available(iOS 18.0, *) {
            ControlCenter.shared.reloadAllControls()
        }

        call.resolve(["synced": true])
    }

    @objc func reloadWidgets(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        if #available(iOS 18.0, *) {
            ControlCenter.shared.reloadAllControls()
        }
        call.resolve(["reloaded": true])
    }
}
