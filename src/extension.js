const ChatService = require("./services/chatService");
const cnf = require("./../configs/config.json");
const vscode = require("vscode");

const fs = require("fs");
const path = require("path");

const { getRelativePath } = require("./helpers/fileHelper");
const { removeCommentStructure } = require("./helpers/codeHelper");
const {
  openCodeFile,
  copyCodeBlock,
  sendToTerminal,
  replaceActiveFile,
} = require("./commands/commands");
const {
  undoCodeBlock,
  diffCodeBlock,
  buildProjectStructure,
} = require("./helpers/extensionHelper");
const {
  uri,
  load,
  handleN8xJson,
  handleGitignore,
  checkConfiguration,
} = require("./helpers/fileSystemHelper");
const { callGitDiscard } = require("./services/gitService");

class PanelProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri;
    this._backupFilePath = null;
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
      case "openCodeFile":
        await openCodeFile(message.code);
        break;
      case "replaceActiveFile":
        await openCodeFile(message.code);
        await this._replaceActiveFile(message.code);
        break;
      case "replaceCodeFileSilently":
        await this._replaceCodeFileSilently(message.code);
        break;
      case "copyCodeBlock":
        await copyCodeBlock(removeCommentStructure(code));
        break;
      case "addToChat":
        // await this._addToChat(message.selectedText); // Removed here
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

  async _cloneAndModifyActiveFile(code, modifyFunction) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor.");
      return;
    }

    const filePath = editor.document.uri.fsPath;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
      editor.document.uri
    );

    if (!workspaceFolder) {
      vscode.window.showErrorMessage("File is not part of a workspace.");
      return;
    }

    const relativePath = path.relative(workspaceFolder.uri.fsPath, filePath);
    const backupDir = path.join(workspaceFolder.uri.fsPath, ".n8x");
    const backupPath = path.join(backupDir, relativePath);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFileDir = path.dirname(backupPath);
    if (!fs.existsSync(backupFileDir)) {
      fs.mkdirSync(backupFileDir, { recursive: true });
    }

    if (!fs.existsSync(backupPath)) {
      try {
        fs.writeFileSync(backupPath, editor.document.getText());
        console.log(`Backup file created: ${backupPath}`);
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to create backup: ${err.message}`
        );
        return;
      }
    }

    await modifyFunction(code);
  }

  async _replaceActiveFile(code) {
    await this._cloneAndModifyActiveFile(code, async (modifiedCode) => {
      await replaceActiveFile(modifiedCode);
    });
  }

  async _replaceCodeFileSilently(code) {
    const filePathMatch = code.match(/^.*?\[\[(.*?)\]\]/);
    if (!filePathMatch || !filePathMatch[1]) {
      return vscode.window.showErrorMessage(
        "File path not found in the code block."
      );
    }
    let filePath = filePathMatch[1].trim();

    // Check if the file path is absolute or relative
    if (!path.isAbsolute(filePath)) {
      // If the file path is relative make it absolute relative to workspace.
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return vscode.window.showErrorMessage(
          "No workspace folder open to resolve relative path."
        );
      }
      filePath = path.join(workspaceFolders[0].uri.fsPath, filePath);
    }

    try {
      const modifiedCode = removeCommentStructure(code);
      fs.writeFileSync(filePath, modifiedCode);
      console.log(`File replaced silently: ${filePath}`);
    } catch (err) {
      vscode.window.showErrorMessage(
        `Failed to replace file content silently: ${err.message}`
      );
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

let provider;

async function activate(context) {
  provider = new PanelProvider(context.extensionUri);
  const chatService = new ChatService(provider);

  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.openSettings", () => {
      vscode.commands.executeCommand("workbench.action.openSettings", "nabotx");
    })
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("nabotxSidePanelView", provider)
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("nabotxActivityBarView", provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.openPanel", () => {
      vscode.commands.executeCommand(
        "workbench.view.extension.nabotxSidePanel"
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "nabotx.addFileToChat",
      async (resourceUri) => {
        if (!resourceUri) {
          return vscode.window.showInformationMessage(
            "No file or folder selected."
          );
        }
        let stats;
        try {
          stats = fs.statSync(resourceUri.fsPath);
        } catch (err) {
          return vscode.window.showErrorMessage(
            `Error accessing resource: ${err.message}`
          );
        }
        if (stats.isDirectory()) {
          const ignoredPaths = [".git", "node_modules", "obj", "bin"];
          await chatService.addDirToChat(
            resourceUri.fsPath,
            ignoredPaths
          );
        } else {
          const doc = await vscode.workspace.openTextDocument(resourceUri);
          const fileContent = doc.getText();
          const relPath = getRelativePath(resourceUri);
          await chatService.addTextToChat(fileContent, relPath); // Changed here
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.addToChat", () =>
      chatService.addToChat()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.buildProjectStructure", async () =>
      provider._view
        ? await provider._buildProjectStructure(provider._view)
        : null
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.diffCodeBlock", async () =>
      provider._diffCodeBlock("")
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.undoCodeBlock", async () =>
      provider._undoCodeBlock()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.callGitDiscard", async () =>
      provider._callGitDiscard()
    )
  );

  checkConfiguration();
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (cnf.settingsConfigKeys.some((key) => event.affectsConfiguration(key)))
      checkConfiguration();
  });

  await handleN8xJson();
  await handleGitignore();
}

function deactivate() {}

module.exports = { activate, deactivate };