const { removeCommentStructure } = require("../helpers/codeHelper");
const { uri, load } = require("../helpers/fileSystemHelper");
const { callGitDiscard } = require("./gitService");
const FileService = require("./fileService");
const vscode = require("vscode");
const {
  openCodeFile,
  copyCodeBlock,
  sendToTerminal,
} = require("../commands/commands");
const {
  undoCodeBlock,
  diffCodeBlock,
  buildProjectStructure,
} = require("../helpers/extensionHelper");

class PanelProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri;
    this._backupFilePath = null;
    this._view = null;
    this._fileService = new FileService();
  }

  async resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    webviewView.webview.onDidReceiveMessage(
      this._handleMessage.bind(this, webviewView)
    );
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
  }

  async _handleMessage(webviewView, message) {
    switch (message.command) {
      case "openCodeFile":
        await openCodeFile(message.code);
        break;
      case "replaceActiveFile":
        await openCodeFile(message.code);
        await this._fileService.replaceActiveFile(message.code);
        break;
      case "replaceCodeFileSilently":
        await this._fileService.replaceCodeFileSilently(message.code);
        break;
      case "copyCodeBlock":
        await copyCodeBlock(removeCommentStructure(message.code));
        break;
      case "buildProjectStructure":
        await buildProjectStructure(webviewView);
        break;
      case "diffCodeBlock":
        await diffCodeBlock(message.code);
        break;
      case "undoCodeBlock":
        await undoCodeBlock();
        break;
      case "callGitDiscard":
        await callGitDiscard();
        break;
      case "sendToTerminal":
        await sendToTerminal(message.code);
        break;
    }
  }

  _getHtmlForWebview(webview) {
    let html = load(this, "views", "panel.html");
    const defaultConfig = {
      path: "",
      token: "",
      model: "",
      previewUrl: "http://localhost:3000",
    };
    const configuration = vscode.workspace.getConfiguration("nabotx");
    const pathValue = configuration.get("path") || defaultConfig.path;
    const tokenValue = configuration.get("token") || defaultConfig.token;
    const modelValue = configuration.get("model") || defaultConfig.model;
    const previewUrlValue =
      configuration.get("previewUrl") || defaultConfig.previewUrl;
    const config = load(this, "configs", "config.json", true);

    const scripts = config.scripts
      .map(
        (x) =>
          `<script src="${
            x.startsWith("~/") ? uri(webview, this, "src", x.slice(2)) : x
          }"></script>`
      )
      .join("");
    const styles = config.styles
      .map(
        (x) =>
          `<link href="${
            x.startsWith("~/") ? uri(webview, this, "styles", x.slice(2)) : x
          }" rel="stylesheet"/>`
      )
      .join("");

    html = html
      .replaceAll(/\$\{rules\}/g, config.rules.assistant)
      .replaceAll(/\$\{previewUrl\}/g, previewUrlValue)
      .replaceAll(/\$\{token\}/g, tokenValue)
      .replaceAll(/\$\{model\}/g, modelValue)
      .replaceAll(/\$\{scripts\}/g, scripts)
      .replaceAll(/\$\{path\}/g, pathValue)
      .replaceAll(/\$\{styles\}/g, styles);

    for (const asset of config.assets) {
      html = html.replaceAll(
        new RegExp(`\\$\\{${asset.slice(2)}\\}`, "g"),
        uri(webview, this, "assets", asset.slice(2))
      );
    }

    return html;
  }
}

module.exports = PanelProvider;
