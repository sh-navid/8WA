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
      case "openCodeFile":
        await this._openCodeFile(message.code);
        break;
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

  async _openCodeFile(code) {
    try {
      const filePathMatch = code.match(/^.*?\[\[(.*?)\]\]/);
      if (!filePathMatch || filePathMatch.length < 2) {
        vscode.window.showErrorMessage(
          "File path not found in the code block."
        );
        return;
      }

      const filePath = filePathMatch[1].trim();
      if (!filePath) {
        vscode.window.showErrorMessage("File path is empty.");
        return;
      }

      let fileUri;
      if (vscode.workspace.workspaceFolders) {
        const workspaceFolder = vscode.workspace.workspaceFolders[0].uri;
        fileUri = vscode.Uri.joinPath(workspaceFolder, filePath);
      } else {
        fileUri = vscode.Uri.file(filePath);
      }

      try {
        const document = await vscode.workspace.openTextDocument(fileUri);
        await vscode.window.showTextDocument(document);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error opening file: ${error.message || error}`
        );
      }
    } catch (err) {
      vscode.window.showErrorMessage(
        `Error extracting file path: ${err.message}`
      );
    }
  }

  _removeCommentStructure(code) {
    // Regex to match various comment styles followed by [[path]]
    const regex =
      /(\s*(?:\/\*[\s\S]*?\*\/|\/\/.*|#.*|--.*|'''(.*?)'''|"(.*?)"|\'(.*?)\')*)?\s*\[\[(.*?)\]\]/;

    return code.replace(regex, "").trim();
  }

  async _appendToActiveFile(code) {
    code = this._removeCommentStructure(code);

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
    code = this._removeCommentStructure(code);

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
    code = this._removeCommentStructure(code);

    await vscode.env.clipboard.writeText(code);
  }

  async _addToChat(selectedText, relativePath = "") {
    if (!this._view) {
      console.warn("Webview is not yet resolved. Message not sent.");
      return;
    }

    if (!selectedText && !relativePath) {
      vscode.window.showInformationMessage("No file content or path provided.");
      return;
    }

    try {
      this._view.webview.postMessage({
        command: "addTextToChat",
        path: relativePath,
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

    const tabView = load(this, "views", "tab.html");

    // Default config values
    const defaultConfig = {
      path: "",
      token: "",
      model: "",
    };

    // Get configuration settings from VS Code
    const configuration = vscode.workspace.getConfiguration("nabotx");
    const pathValue = configuration.get("path") || defaultConfig.path;
    const tokenValue = configuration.get("token") || defaultConfig.token;
    const modelValue = configuration.get("model") || defaultConfig.model;

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

      .replaceAll(/\$\{path\}/g, pathValue) // Use the value from VS Code settings or default
      .replaceAll(/\$\{token\}/g, tokenValue) // Use the value from VS Code settings or default
      .replaceAll(/\$\{model\}/g, modelValue) // Use the value from VS Code settings or default

      .replaceAll(/\$\{rules\}/g, general.rules.assistant)
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

const commentPath = (path, data) => {
  const extension = path.split(".").pop();
  const commentStyles = {
    js: `/* {path} */`,
    jsx: `/* {path} */`,
    ts: `/* {path} */`, // for TypeScript files
    py: `# {path}`,
    java: `// {path}`,
    c: `// {path}`,
    cpp: `// {path}`,
    css: `/* {path} */`,
    html: `<!-- {path} -->`,
    php: `// {path}`,
    rb: `# {path}`,
    go: `// {path}`,
    kt: `// {path}`,
    sql: `-- {path}`,
    sh: `# {path}`,
    r: `# {path}`,
    vb: `' {path}`,
    cs: `// {path}`, // C# language
    ml: `(* {path} *)`,
    yaml: `# {path}`,
    json: `/* {path} */`, // JSON doesn't support comments, but this is a placeholder
  };

  const commentStyle = commentStyles[extension] || "/* {path} */";
  return commentStyle.replace(/{path}/g, data);
};

const join = (provider, dir, fileName) => {
  return path.join(provider._extensionUri.fsPath, dir, fileName);
};

const load = (provider, dir, fileName, json = false) => {
  let _path = join(provider, dir, fileName);
  try {
    return json
      ? JSON.parse(fs.readFileSync(_path, "utf8"))
      : fs.readFileSync(_path, "utf8");
  } catch (error) {
    console.error(`Error loading file ${_path}: ${error.message}`);
    if (json) {
      return {}; // Return an empty object for JSON files
    } else {
      return ""; // Return an empty string for other files
    }
  }
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
        if (resourceUri) {
          let isDirectory = false;

          try {
            const stats = fs.statSync(resourceUri.fsPath);
            isDirectory = stats.isDirectory();
          } catch (err) {
            vscode.window.showErrorMessage(
              `Error accessing resource: ${err.message}`
            );
            return;
          }

          if (isDirectory) {
            // Handle directory case
            await addDirectoryContentsToChat(
              nabotxSidePanelProvider,
              resourceUri.fsPath
            );
          } else {
            // Handle file case as before
            const document = await vscode.workspace.openTextDocument(
              resourceUri
            );
            const fileContent = document.getText();
            let relativePath = getRelativePath(resourceUri);
            nabotxSidePanelProvider._addToChat(fileContent, relativePath);
          }
        } else {
          vscode.window.showInformationMessage("No file or folder selected.");
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("nabotx.addToChat", async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        let selectedText = editor.selection
          ? editor.document.getText(editor.selection)
          : "";

        if (!selectedText) {
          selectedText = editor.document.getText();
          if (!selectedText) {
            vscode.window.showInformationMessage("The active file is empty.");
            return;
          }
        }

        let relativePath = "";
        if (vscode.workspace.workspaceFolders) {
          const workspaceFolder =
            vscode.workspace.workspaceFolders[0].uri.fsPath;
          const filePath = editor.document.uri.fsPath;
          relativePath = filePath.replace(workspaceFolder + "/", "");
        } else {
          vscode.window.showInformationMessage("No workspace folder open.");
          return;
        }

        nabotxSidePanelProvider._addToChat(selectedText, relativePath);
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

  // Check for configuration values on activation
  checkConfiguration();

  // Listen for configuration changes
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (
      event.affectsConfiguration("nabotx.path") ||
      event.affectsConfiguration("nabotx.token") ||
      event.affectsConfiguration("nabotx.model")
    ) {
      checkConfiguration();
    }
  });
}

function deactivate() {}

function checkConfiguration() {
  const configuration = vscode.workspace.getConfiguration("nabotx");
  const path = configuration.get("path") || "";
  const token = configuration.get("token") || "";
  const model = configuration.get("model") || "";

  if (!path || !token || !model) {
    vscode.window
      .showWarningMessage(
        "NaBotX: Please configure the extension settings (path, token, model) for the extension to work properly.",
        "Open Settings"
      )
      .then((selection) => {
        if (selection === "Open Settings") {
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "nabotx"
          );
        }
      });
  }
}

async function addDirectoryContentsToChat(provider, folderPath) {
  const folderFiles = fs.readdirSync(folderPath);
  for (const file of folderFiles) {
    const filePath = path.join(folderPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      // Recursively add contents if it is a directory
      await addDirectoryContentsToChat(provider, filePath);
    } else {
      // If it is a file, read and add to chat
      try {
        const document = await vscode.workspace.openTextDocument(filePath);
        const fileContent = document.getText();
        let relativePath = getRelativePath(vscode.Uri.file(filePath));
        provider._addToChat(fileContent, relativePath);
      } catch (err) {
        console.error(`Error reading file ${filePath}: ${err.message}`);
      }
    }
  }
}

function getRelativePath(resourceUri) {
  let relativePath = "";
  if (vscode.workspace.workspaceFolders) {
    const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const filePath = resourceUri.fsPath;
    relativePath = filePath.replace(workspaceFolder + "/", "");
  }
  return relativePath;
}

module.exports = { activate, deactivate };
