const cnf = require("./../configs/config.json");
const vscode = require("vscode");

const fs = require("fs");
const path = require("path");
const { commentPath } = require("./helpers/pathHelper");
const { getRelativePath } = require("./helpers/fileHelper");
const { removeCommentStructure } = require("./helpers/codeHelper");
const {
  openCodeFile,
  copyCodeBlock,
  sendToTerminal,
  replaceActiveFile,
  addDirectoryContentsToChat,
} = require("./commands/commands");
const {
  undoCodeBlock,
  diffCodeBlock,
  isExcludedFromChat,
  buildProjectStructure,
  buildPreferencesStructure,
} = require("./helpers/extensionHelper");
const {
  uri,
  load,
  handleN8xJson,
  handleGitignore,
  checkConfiguration,
} = require("./helpers/fileSystemHelper");
const { callGitDiscard } = require("./services/gitService");

class NaBotXSidePanelProvider {
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
        await this._addToChat(message.selectedText);
        break;
      case "buildProjectStructure":
        await buildProjectStructure(webviewView);
        break;
      case "buildPreferencesStructure":
        await buildPreferencesStructure(webviewView);
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

  async _addToChat(selectedText, relativePath = "") {
    if (!this._view) {
      console.warn("Webview is not yet resolved. Message not sent.");
      return;
    }
    if (!selectedText && !relativePath) {
      return vscode.window.showInformationMessage(
        "No file content or path provided."
      );
    }

    if (await isExcludedFromChat(relativePath)) {
      console.log(`File/folder ${relativePath} is excluded from chat.`);
      return;
    }

    try {
      this._view.webview.postMessage({
        command: "addTextToChat",
        path: relativePath,
        raw: selectedText,
        text:
          commentPath(relativePath, "[[" + relativePath + "]]") +
          "\n" +
          selectedText,
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

let nabotxSidePanelProvider;

async function activate(context) {
  nabotxSidePanelProvider = new NaBotXSidePanelProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.openSettings", () => {
      vscode.commands.executeCommand("workbench.action.openSettings", "nabotx");
    })
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "nabotxSidePanelView",
      nabotxSidePanelProvider
    )
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "nabotxActivityBarView",
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
    vscode.commands.registerCommand(
      "nabotx.addToChatExplorer",
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

          const relPath = getRelativePath(resourceUri);
          if (await isExcludedFromChat(relPath)) {
            console.log(`File/folder ${relPath} is excluded from chat.`);
            return;
          }

          await addDirectoryContentsToChat(
            nabotxSidePanelProvider,
            resourceUri.fsPath,
            ignoredPaths
          );
        } else {
          const doc = await vscode.workspace.openTextDocument(resourceUri);
          const fileContent = doc.getText();
          const relPath = getRelativePath(resourceUri);

          if (await isExcludedFromChat(relPath)) {
            console.log(`File/folder ${relPath} is excluded from chat.`);
            return;
          }

          nabotxSidePanelProvider._addToChat(fileContent, relPath);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.addToChat", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return vscode.window.showInformationMessage("No active editor.");
      }
      let selectedText = editor.selection
        ? editor.document.getText(editor.selection)
        : "";
      if (!selectedText) {
        selectedText = editor.document.getText();
        if (!selectedText) {
          return vscode.window.showInformationMessage(
            "The active file is empty."
          );
        }
      }
      if (!vscode.workspace.workspaceFolders) {
        return vscode.window.showInformationMessage(
          "No workspace folder open."
        );
      }
      const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
      const relPath = editor.document.uri.fsPath.replace(
        workspaceFolder + "/",
        ""
      );

      if (await isExcludedFromChat(relPath)) {
        console.log(`File/folder ${relPath} is excluded from chat.`);
        return;
      }

      nabotxSidePanelProvider._addToChat(selectedText, relPath);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "nabotx.buildProjectStructure",
      async () => {
        if (nabotxSidePanelProvider._view) {
          await nabotxSidePanelProvider._buildProjectStructure(
            nabotxSidePanelProvider._view
          );
        } else {
          vscode.window.showErrorMessage("NaBotX panel is not active.");
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "nabotx.buildPreferencesStructure",
      async () => {
        if (nabotxSidePanelProvider._view) {
          await nabotxSidePanelProvider._buildPreferencesStructure(
            nabotxSidePanelProvider._view
          );
        } else {
          vscode.window.showErrorMessage("NaBotX panel is not active.");
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.diffCodeBlock", async () => {
      nabotxSidePanelProvider._diffCodeBlock("");
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.undoCodeBlock", async () => {
      nabotxSidePanelProvider._undoCodeBlock();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.callGitDiscard", async () => {
      nabotxSidePanelProvider._callGitDiscard();
    })
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