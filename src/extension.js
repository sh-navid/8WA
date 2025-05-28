//language-javascript
const vscode = require("vscode"),
  fs = require("fs"),
  path = require("path");
class NaBotXSidePanelProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri;
  }
  resolveWebviewView(webviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case "pickFiles":
          const uris = await vscode.window.showOpenDialog({
            canSelectMany: true,
            openLabel: "Attach",
            canSelectFiles: true,
          });
          if (uris?.length) {
            const files = await Promise.all(
              uris.map(async (uri) => {
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
              })
            );
            webviewView.webview.postMessage({
              command: "attachFiles",
              files: files.filter((f) => f),
            });
          }
          break;
        case "appendToActiveFile":
          const editorA = vscode.window.activeTextEditor;
          if (editorA) {
            const document = editorA.document,
              pos = document.lineAt(document.lineCount - 1).range.end;
            editorA.edit((editBuilder) =>
              editBuilder.insert(pos, "\n" + message.code)
            );
          } else {
            vscode.window.showErrorMessage("No active file to append code to.");
          }
          break;
        case "replaceActiveFile":
          const editorB = vscode.window.activeTextEditor;
          if (editorB) {
            const document = editorB.document,
              fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
              );
            editorB.edit((editBuilder) =>
              editBuilder.replace(fullRange, message.code)
            );
          } else {
            vscode.window.showErrorMessage(
              "No active file to replace content."
            );
          }
          break;
      }
    });
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
  }
  _getHtmlForWebview(webview) {
    const htmlPath = path.join(this._extensionUri.fsPath, "res", "panel.html"),
      aiConfigPath = path.join(
        this._extensionUri.fsPath,
        "configs",
        "ai.config.json"
      ),
      generalConfigPath = path.join(
        this._extensionUri.fsPath,
        "configs",
        "general.config.json"
      ),
      languageDetectorPath = path.join(
        this._extensionUri.fsPath,
        "src",
        "language-detector.js"
      );
    let html = read(htmlPath),
      config = read(aiConfigPath, true),
      rulesConfig = read(generalConfigPath, true);
    const logoUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, "res", "logo.svg")
      ),
      styleUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, "res", "panel.css")
      );
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
  json
    ? JSON.parse(fs.readFileSync(path, "utf8"))
    : fs.readFileSync(path, "utf8");

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
