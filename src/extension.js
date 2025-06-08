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
    webviewView.webview.onDidReceiveMessage(
      this._handleMessage.bind(this, webviewView)
    );
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
      case "copyCodeBlock":
        await this._copyCodeBlock(message.code); // Implement this function; this is a VScode extension
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
      const files = await Promise.all(uris.map(this._readFile));
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
      await editor.edit((editBuilder) => editBuilder.insert(pos, "\n" + code));
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
      await editor.edit((editBuilder) => editBuilder.replace(fullRange, code));
    } else {
      vscode.window.showErrorMessage("No active file to replace content.");
    }
  }

  async _copyCodeBlock(code) {
    await vscode.env.clipboard.writeText(code);
  }

  _getHtmlForWebview(webview) {
    let html = load(this, "views", "panel.html");

    const tabView = load(this, "views", "tab.html");
    const confirmModalView = load(this, "views", "confirmModal.html");

    // Load config from file
    const aiConfig = load(this, "configs", "ai.config.json", true);

    // Get configuration settings from VS Code, fallback to ai.config.json if not set
    const configuration = vscode.workspace.getConfiguration("nabotx");
    const path = configuration.get("path") || aiConfig.path || "";
    const token = configuration.get("token") || aiConfig.token || "";
    const model = configuration.get("model") || aiConfig.model || "";

    const general = load(this, "configs", "general.config.json", true);

    let scripts = general.scripts
      .map(
        (x) =>
          `<script src="${
            x.startsWith("~/") ? uri(webview, this, "src", x.slice(2)) : x
          }"></script>`
      )
      .join("");
    let styles = general.styles
      .map(
        (x) =>
          `<link href="${
            x.startsWith("~/") ? uri(webview, this, "styles", x.slice(2)) : x
          }" rel="stylesheet"/>`
      )
      .join("");

    html = html
      .replaceAll(/\$\{tabView\}/g, tabView)
      .replaceAll(/\$\{confirmModalView\}/g, confirmModalView)

      .replaceAll(/\$\{path\}/g, path) // Use the value from VS Code settings or ai.config.json
      .replaceAll(/\$\{token\}/g, token) // Use the value from VS Code settings or ai.config.json
      .replaceAll(/\$\{model\}/g, model) // Use the value from VS Code settings or ai.config.json

      .replaceAll(/\$\{rules\}/g, general.rules)
      .replaceAll(/\$\{scripts\}/g, scripts)
      .replaceAll(/\$\{styles\}/g, styles);

    for (const x of general.assets)
      html = html.replaceAll(
        new RegExp(`\\$\\{${x.slice(2)}\\}`, "g"),
        uri(webview, this, "assets", x.slice(2))
      );

    return html;
  }
}

const join = (provider, dir, fileName) => {
  return path.join(provider._extensionUri.fsPath, dir, fileName);
};

const load = (provider, dir, fileName, json = false) => {
  let _path = join(provider, dir, fileName);
  return json
    ? JSON.parse(fs.readFileSync(_path, "utf8"))
    : fs.readFileSync(_path, "utf8");
};

const uri = (webview, provider, dir, fileName) => {
  return webview.asWebviewUri(
    vscode.Uri.joinPath(provider._extensionUri, dir, fileName)
  );
};

function activate(context) {
  const provider = new NaBotXSidePanelProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("nabotxSidePanelView", provider)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.openPanel", () => {
      vscode.commands.executeCommand(
        "workbench.view.extension.nabotxSidePanel"
      );
    })
  );
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.text = "$(rocket) NaBotX";
  statusBarItem.tooltip = "NaBotX";
  statusBarItem.command = "nabotx.openPanel";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

function deactivate() {}

module.exports = { activate, deactivate };
