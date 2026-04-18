import Cocoa
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
  private var window: NSWindow?
  private var webView: WKWebView?
  private var serverProcess: Process?
  private let port = ProcessInfo.processInfo.environment["AI_SPACE_APP_PORT"] ?? "5174"

  func applicationDidFinishLaunching(_ notification: Notification) {
    NSApp.setActivationPolicy(.regular)
    createWindow()
    startServer()
    loadWhenReady(attempt: 0)
    NSApp.activate(ignoringOtherApps: true)
  }

  func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
    true
  }

  func applicationWillTerminate(_ notification: Notification) {
    serverProcess?.terminate()
  }

  private func createWindow() {
    let configuration = WKWebViewConfiguration()
    let webView = WKWebView(frame: .zero, configuration: configuration)
    webView.navigationDelegate = self

    let window = NSWindow(
      contentRect: NSRect(x: 0, y: 0, width: 1180, height: 820),
      styleMask: [.titled, .closable, .miniaturizable, .resizable],
      backing: .buffered,
      defer: false
    )

    window.title = "AI OS"
    window.center()
    window.contentView = webView
    window.makeKeyAndOrderFront(nil)

    self.window = window
    self.webView = webView
  }

  private func startServer() {
    guard let resourcePath = Bundle.main.resourcePath else {
      showError("Unable to locate app resources.")
      return
    }

    let productRoot = URL(fileURLWithPath: resourcePath).appendingPathComponent("product")
    let script = productRoot
      .appendingPathComponent("apps")
      .appendingPathComponent("space-desktop")
      .appendingPathComponent("scripts")
      .appendingPathComponent("dev-server.mjs")

    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/env")
    process.arguments = ["node", script.path]
    process.currentDirectoryURL = productRoot

    var environment = ProcessInfo.processInfo.environment
    environment["PORT"] = port
    environment["AI_SPACE_SKIP_BUILD"] = "1"
    environment["PATH"] = [
      environment["PATH"],
      "/opt/homebrew/bin",
      "/usr/local/bin",
      "\(NSHomeDirectory())/.local/bin",
      "\(NSHomeDirectory())/.local/share/mise/shims",
      "/usr/bin",
      "/bin",
    ]
    .compactMap { $0 }
    .joined(separator: ":")
    process.environment = environment

    do {
      try process.run()
      serverProcess = process
    } catch {
      showError("Unable to start bundled local server: \(error.localizedDescription)")
    }
  }

  private func loadWhenReady(attempt: Int) {
    let url = URL(string: "http://127.0.0.1:\(port)")!

    URLSession.shared.dataTask(with: url) { [weak self] _, response, _ in
      let isReady = (response as? HTTPURLResponse)?.statusCode == 200

      DispatchQueue.main.async {
        if isReady {
          self?.webView?.load(URLRequest(url: url))
        } else if attempt < 80 {
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
            self?.loadWhenReady(attempt: attempt + 1)
          }
        } else {
          self?.showError("The local AI Space server did not become ready.")
        }
      }
    }.resume()
  }

  private func showError(_ message: String) {
    let escaped = message
      .replacingOccurrences(of: "&", with: "&amp;")
      .replacingOccurrences(of: "<", with: "&lt;")
      .replacingOccurrences(of: ">", with: "&gt;")

    webView?.loadHTMLString(
      """
      <!doctype html>
      <html>
        <body style="font-family: -apple-system; padding: 32px;">
          <h1>AI OS failed to start</h1>
          <p>\(escaped)</p>
        </body>
      </html>
      """,
      baseURL: nil
    )
  }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
