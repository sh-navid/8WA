const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

class NaBotXSidePanelProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri;
    this._view = null;
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
      case "appendToActiveFile":
        await this._appendToActiveFile(message.code);
        break;
      case "replaceActiveFile":
        await this._replaceActiveFile(message.code);
        break;
      case "copyCodeBlock":
        await this._copyCodeBlock(message.code);
        break;
      case "addToChat":
        await this._addToChat(message.selectedText);
        break;
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
    if (!this._view) {
      console.warn("Webview is not yet resolved. Message not sent.");
      return;
    }

    const editor = vscode.window.activeTextEditor;
    if (!editor && !selectedText) {
      vscode.window.showInformationMessage("No active editor or selected file.");
      return;
    }
    let relativePath = "";
    let fileContent = "";
    if (editor) {
      // Get the file path relative to the workspace
      if (vscode.workspace.workspaceFolders) {
        const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const filePath = editor.document.uri.fsPath;
        relativePath = filePath.replace(workspaceFolder + '/', '');
        fileContent = selectedText || editor.document.getText();
      } else {
        vscode.window.showInformationMessage("No workspace folder open.");
        return;
      }
    } else {
      fileContent = selectedText;
    }

    try {
      this._view.webview.postMessage({
        command: "addTextToChat",
        text: "FilePath: " + relativePath + "\nSelectedFileContent:" + fileContent,
      });
    } catch (err) {
      vscode.window.showErrorMessage(
        `Error adding text to chat: ${err.message}`
      );
      console.error("Error adding text to chat:", err);
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
      vscode.commands.executeCommand('workbench.action.openSettings', 'nabotx');
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

  // Modified Command: For when a file is clicked in the Explorer
  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.addToChatExplorer", async (resourceUri) => {
      if (resourceUri) {
        try {
          const document = await vscode.workspace.openTextDocument(resourceUri);
          const fileContent = document.getText();

          // Send the selected text to the _addToChat method in the provider
          nabotxSidePanelProvider._addToChat(fileContent);
        } catch (err) {
          vscode.window.showErrorMessage(
            `Error adding file to chat: ${err.message}`
          );
          console.error("Error adding file to chat:", err);
        }
      } else {
        vscode.window.showInformationMessage("No file selected.");
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.addToChat", async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        let selectedText = editor.selection ? editor.document.getText(editor.selection) : '';

        // If no text is selected, get the entire document content
        if (!selectedText) {
          selectedText = editor.document.getText();
          if (!selectedText) {
            vscode.window.showInformationMessage("The active file is empty.");
            return;
          }
        }

        // Send the selected text to the _addToChat method in the provider
        nabotxSidePanelProvider._addToChat(selectedText);
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