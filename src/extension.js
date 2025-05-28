// Language: javascript
// File: extension.js
// Type: Code
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

class NaBotXSidePanelProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri;
  }

  async resolveWebviewView(webviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    webviewView.webview.onDidReceiveMessage(this._handleMessage.bind(this, webviewView));
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
  }

  async _handleMessage(webviewView, message) {
    switch (message.command) {
      case "pickFiles":
        await this._pickFiles(webviewView);
        break;
      case "appendToActiveFile":
        await this._appendToActiveFile(message.code);
        break;
      case "replaceActiveFile":
        await this._replaceActiveFile(message.code);
        break;
    }
  }

  async _pickFiles(webviewView) {
    const uris = await vscode.window.showOpenDialog({
      canSelectMany: true,
      openLabel: "Attach",
      canSelectFiles: true,
    });
    if (uris?.length) {
      const files = await Promise.all(
        uris.map(this._readFile)
      );
      webviewView.webview.postMessage({
        command: "attachFiles",
        files: files.filter(Boolean),
      });
    }
  }

  async _readFile(uri) {
    try {
      const content = await vscode.workspace.fs.readFile(uri);
      return {
        name: path.basename(uri.fsPath),
        content: Buffer.from(content).toString("utf8"),
      };
    } catch (err) {
      console.error("Error reading file:", err);
      return null;
    }
  }

  async _appendToActiveFile(code) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const document = editor.document,
        pos = document.lineAt(document.lineCount - 1).range.end;
      await editor.edit(editBuilder => editBuilder.insert(pos, "\n" + code));
    } else {
      vscode.window.showErrorMessage("No active file to append code to.");
    }
  }

  async _replaceActiveFile(code) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const document = editor.document,
        fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(document.getText().length)
        );
      await editor.edit(editBuilder => editBuilder.replace(fullRange, code));
    } else {
      vscode.window.showErrorMessage("No active file to replace content.");
    }
  }

  _getHtmlForWebview(webview) {
    const htmlPath = path.join(this._extensionUri.fsPath, "res", "panel.html"),
      aiConfigPath = path.join(this._extensionUri.fsPath, "configs", "ai.config.json"),
      generalConfigPath = path.join(this._extensionUri.fsPath, "configs", "general.config.json"),
      languageDetectorPath = path.join(this._extensionUri.fsPath, "src", "language-detector.js");
    let html = read(htmlPath),
      config = read(aiConfigPath, true),
      rulesConfig = read(generalConfigPath, true);
    const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "res", "logo.svg")),
      styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "res", "panel.css"));
    return html
      .replace(/\$\{logoUri\}/g, logoUri)
      .replace(/\$\{styleUri\}/g, styleUri.toString())
      .replace(/\$\{path\}/g, config.path)
      .replace(/\$\{token\}/g, config.token)
      .replace(/\$\{model\}/g, config.model)
      .replace(/\$\{rules\}/g, rulesConfig.rules)
      .replace(/\$\{languageDetectorPath\}/g, languageDetectorPath);
  }
}

const read = (path, json = false) =>
  json ? JSON.parse(fs.readFileSync(path, "utf8")) : fs.readFileSync(path, "utf8");

function activate(context) {
  const provider = new NaBotXSidePanelProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("nabotxSidePanelView", provider)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.openPanel", () =>
      vscode.commands.executeCommand("workbench.view.extension.nabotxSidePanel")
    )
  );
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = "$(rocket) NaBotX";
  statusBarItem.tooltip = "Open NaBotX";
  statusBarItem.command = "nabotx.openPanel";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

function deactivate() {}

module.exports = { activate, deactivate };