const {removeCommentStructure} = require("../helpers/codeHelper")
const {uri, load} = require("../helpers/fileSystemHelper")
const config = require("./../../configs/config.json")
const {callGitDiscard} = require("./gitService")
const FileService = require("./fileService")
const vscode = require("vscode")
const {openCodeFile, copyCodeBlock, sendToTerminal} = require("../commands/commands")
const {
  undoCodeBlock,
  diffCodeBlock,
  buildProjectStructure,
} = require("../helpers/extensionHelper")

class PanelProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri
    this._backupFilePath = null
    this._view = null
    this._fileService = new FileService()
  }

  async resolveWebviewView(webviewView) {
    this._view = webviewView
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    }
    webviewView.webview.onDidReceiveMessage(this._handleMessage.bind(this, webviewView))
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)
  }

  async _handleMessage(webviewView, message) {
    switch (message.command) {
      case "openCodeFile":
        await openCodeFile(message.code)
        break
      case "replaceActiveFile":
        await openCodeFile(message.code)
        await this._fileService.replaceActiveFile(message.code)
        break
      case "replaceCodeFileSilently":
        await this._fileService.replaceCodeFileSilently(message.code)
        break
      case "copyCodeBlock":
        await copyCodeBlock(removeCommentStructure(message.code))
        break
      case "buildProjectStructure":
        await buildProjectStructure(webviewView)
        break
      case "diffCodeBlock":
        await diffCodeBlock(message.code)
        break
      case "undoCodeBlock":
        await undoCodeBlock()
        break
      case "callGitDiscard":
        await callGitDiscard()
        break
      case "sendToTerminal":
        await sendToTerminal(message.code)
        break
    }
  }

  _uri(webview, address, directory) {
    return address.startsWith("http") ? address : uri(webview, this, directory, address)
  }

  _getHtmlForWebview(webview) {
    let html = load(this, "views", "panel.html")
    const vsConfig = vscode.workspace.getConfiguration("nabotx")

    const _config = {
      styles: config.styles
        .map((x) => `<link href="${this._uri(webview, x, "styles")}" rel="stylesheet"/>`)
        .join(""),
      scripts: config.scripts
        .map((x) => `<script src="${this._uri(webview, x, "src")}"></script>`)
        .join(""),
      previewUrl: vsConfig.get("previewUrl") || "http://localhost:3000",
      token: vsConfig.get("token") || "",
      model: vsConfig.get("model") || "",
      path: vsConfig.get("path") || "",
      rules: config.rules.assistant
    }

    Object.keys(_config).forEach((key) => {
      const placeholder = new RegExp(`\\$\\{${key}\\}`, "g")
      html = html.replaceAll(placeholder, _config[key])
    })

    for (const asset of config.assets) {
      html = html.replaceAll(
        new RegExp(`\\$\\{${asset}\\}`, "g"),
        uri(webview, this, "assets", asset)
      )
    }

    return html
  }
}

module.exports = PanelProvider
