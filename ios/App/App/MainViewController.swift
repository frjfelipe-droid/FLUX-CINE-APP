import UIKit
import Capacitor

/// Tela principal: o app web do FLUX CINE + o plugin nativo de edição.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(FluxEditorPlugin())
        SelfTest.runIfRequested()
    }
}
