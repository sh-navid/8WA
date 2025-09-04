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

  _getHtmlForWebview(webview) {
    let html = load(this, "views", "panel.html")
    const vsConfig = vscode.workspace.getConfiguration("nabotx")
    const _config = {
      previewUrl: vsConfig.get("previewUrl") || "http://localhost:3000",
      token: vsConfig.get("token") || "",
      model: vsConfig.get("model") || "",
      path: vsConfig.get("path") || "",
    }

    const scripts = config.scripts
      .map(
        (x) =>
          `<script src="${
            x.startsWith("~/") ? uri(webview, this, "src", x.slice(2)) : x
          }"></script>`
      )
      .join("")
    const styles = config.styles
      .map(
        (x) =>
          `<link href="${
            x.startsWith("~/") ? uri(webview, this, "styles", x.slice(2)) : x
          }" rel="stylesheet"/>`
      )
      .join("")

    html = html
      .replaceAll(/\$\{rules\}/g, config.rules.assistant)
      .replaceAll(/\$\{previewUrl\}/g, _config.previewUrl)
      .replaceAll(/\$\{token\}/g, _config.token)
      .replaceAll(/\$\{model\}/g, _config.model)
      .replaceAll(/\$\{path\}/g, _config.path)
      .replaceAll(/\$\{scripts\}/g, scripts)
      .replaceAll(/\$\{styles\}/g, styles)

    for (const asset of config.assets) {
      html = html.replaceAll(
        new RegExp(`\\$\\{${asset.slice(2)}\\}`, "g"),
        uri(webview, this, "assets", asset.slice(2))
      )
    }

    return html
  }
}

module.exports = PanelProvider
