import Capacitor
import Foundation
#if canImport(FoundationModels)
import FoundationModels
#endif

/** Foundation Models bridge. Prompts and completions are never written to logs or synced. */
@objc(OnDeviceAIPlugin)
public class OnDeviceAIPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "OnDeviceAIPlugin"
    public let jsName = "OnDeviceAI"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "availability", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "download", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generate", returnType: CAPPluginReturnPromise),
    ]

    @objc public func availability(_ call: CAPPluginCall) {
        call.resolve(["state": modelState])
    }

    @objc public func download(_ call: CAPPluginCall) {
        // Apple Intelligence manages its own model download. The app only rechecks after the
        // user has been told that a system download may be required.
        call.resolve(["state": modelState])
    }

    @objc public func generate(_ call: CAPPluginCall) {
        guard let prompt = call.getString("prompt"), !prompt.isEmpty, prompt.count <= 12000 else {
            call.reject("Prompt must be between 1 and 12000 characters", "invalid_prompt")
            return
        }
        guard modelState == "ready" else { call.reject("On-device model is not ready", "unavailable"); return }
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            Task {
                do {
                    let session = LanguageModelSession()
                    let response = try await session.respond(to: prompt)
                    call.resolve(["text": response.content])
                } catch {
                    call.reject("On-device inference was interrupted", "inference_interrupted")
                }
            }
        } else { call.reject("Foundation Models requires iOS 26", "unsupported") }
        #else
        call.reject("Foundation Models is not included in this SDK", "unsupported")
        #endif
    }

    private var modelState: String {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            switch SystemLanguageModel.default.availability {
            case .available: return "ready"
            case .unavailable(.deviceNotEligible): return "unsupported"
            case .unavailable(.modelNotReady): return "download-needed"
            case .unavailable: return "unsupported"
            }
        }
        #endif
        return "unsupported"
    }
}
