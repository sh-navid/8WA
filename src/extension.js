const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

class NaBotXSidePanelProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri;
    // **Fix 1**: Store the webview view instance when it's resolved
    this._view = null;
  }

  async resolveWebviewView(webviewView) {
    this._view = webviewView; // **Fix 1**: Store the webview view instance
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
      case "addToChat":
        await this._addToChat(message.selectedText);
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

  async _addToChat(selectedText) {
    // Implement the logic to add the selected text to the chat in the webview
    // You'll need to send a message to the webview to update the chat display

    // Example:
    // **Fix 2**: Use the stored webview view to post the message
    if (this._view) {
      this._view.webview.postMessage({
        command: "addTextToChat",
        text: selectedText,
      });
    } else {
      console.warn("Webview is not yet resolved. Message not sent.");
    }
  }

  _getHtmlForWebview(webview) {
    let html = load(this, "views", "panel.html");

    const tabView = load(this, "views", "tab.html");

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

let nabotxSidePanelProvider;

function activate(context) {
  nabotxSidePanelProvider = new NaBotXSidePanelProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.openSettings", function () {
      // vscode.window.showInformationMessage("NaBotX: Open Settings executed"); //old
      vscode.commands.executeCommand('workbench.action.openSettings', 'nabotx')
    })
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "nabotxSidePanelView",
      nabotxSidePanelProvider
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.openPanel", () => {
      vscode.commands.executeCommand(
        "workbench.view.extension.nabotxSidePanel"
      );
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.addToChat", async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const selection = editor.selection;
        const selectedText = editor.document.getText(selection);

        if (selectedText) {
          // Send the selected text to the _addToChat method in the provider
          nabotxSidePanelProvider._addToChat(selectedText);
        } else {
          vscode.window.showInformationMessage("No text selected.");
        }
      } else {
        vscode.window.showInformationMessage("No active editor.");
      }
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