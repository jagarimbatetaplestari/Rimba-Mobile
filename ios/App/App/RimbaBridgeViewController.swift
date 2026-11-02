import Capacitor

class RimbaBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(RimbaWidgetBridgePlugin())
    }
}
