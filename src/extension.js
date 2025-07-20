/* */
const vscode = require("vscode");

const fs = require("fs");
const { commentPath } = require("./utils/pathUtils");
const { getRelativePath } = require("./utils/fileUtils");
const { removeCommentStructure } = require("./utils/codeUtils");
const {
    openCodeFile,
    appendToActiveFile,
    replaceActiveFile,
    copyCodeBlock,
    addDirectoryContentsToChat,
} = require("./commands/nabotxCommands");
const {
    cloneAndModifyActiveFile,
    buildProjectStructure,
    isExcludedFromChat,
    diffCodeBlock,
    undoCodeBlock
} = require("./utils/extensionUtils");
const { load, uri, checkConfiguration, handleN8xJson, handleGitignore } = require("./utils/fileSystemUtils");

class NaBotXSidePanelProvider {
    constructor(extensionUri) {
        this._extensionUri = extensionUri;
        this._view = null;
        this._backupFilePath = null; // Store the backup file path
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
            case "buildProjectStructure":
                await this._buildProjectStructure(webviewView);
                break;
            case "diffCodeBlock":
                await this._diffCodeBlock(message.code);
                break;
            case "undoCodeBlock":
                await this._undoCodeBlock();
                break;
            case "callGitDiscard":
                await this._callGitDiscard();
                break;
        }
    }

    async _openCodeFile(code) {
        await openCodeFile(code);
    }

    async _cloneAndModifyActiveFile(code, modifyFunction) {
      await cloneAndModifyActiveFile(code, modifyFunction, this);
    }

    async _appendToActiveFile(code) {
        await this._cloneAndModifyActiveFile(code, async (modifiedCode) => {
            await appendToActiveFile(modifiedCode);
        });
    }

    async _replaceActiveFile(code) {
        await this._cloneAndModifyActiveFile(code, async (modifiedCode) => {
            await replaceActiveFile(modifiedCode);
        });
    }

    async _copyCodeBlock(code) {
        code = removeCommentStructure(code);
        await copyCodeBlock(code);
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

        // Check if the file/folder should be excluded based on n8x.json
        if (await isExcludedFromChat(relativePath)) {
            console.log(`File/folder ${relativePath} is excluded from chat.`);
            vscode.window.showInformationMessage(`File/folder ${relativePath} is excluded from chat due to n8x.json configuration.`);
            return; // Don't add to chat if excluded
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

    async _buildProjectStructure(webviewView) {
        await buildProjectStructure(webviewView);
    }

    async _diffCodeBlock(code) {
      await diffCodeBlock(code, this);
    }

    async _undoCodeBlock() {
      await undoCodeBlock(this);
    }

    async _callGitDiscard() {
        try {
            await vscode.commands.executeCommand('git.discardAllChanges');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to discard changes: ${error.message}`);
        }
    }

    _getHtmlForWebview(webview) {
        let html = load(this, "views", "panel.html");
        const tabView = load(this, "views", "tab.html");
        const defaultConfig = { path: "", token: "", model: "" };
        const configuration = vscode.workspace.getConfiguration("nabotx");
        const pathValue = configuration.get("path") || defaultConfig.path;
        const tokenValue = configuration.get("token") || defaultConfig.token;
        const modelValue = configuration.get("model") || defaultConfig.model;
        const general = load(this, "configs", "general.config.json", true);

        const scripts = general.scripts
            .map(
                (x) =>
                    `<script src="${
                    x.startsWith("~/") ? uri(webview, this, "src", x.slice(2)) : x
                    }"></script>`
            )
            .join("");
        const styles = general.styles
            .map(
                (x) =>
                    `<link href="${
                    x.startsWith("~/") ? uri(webview, this, "styles", x.slice(2)) : x
                    }" rel="stylesheet"/>`
            )
            .join("");

        html = html
            .replaceAll(/\$\{tabView\}/g, tabView)
            .replaceAll(/\$\{path\}/g, pathValue)
            .replaceAll(/\$\{token\}/g, tokenValue)
            .replaceAll(/\$\{model\}/g, modelValue)
            .replaceAll(/\$\{rules\}/g, general.rules.assistant)
            .replaceAll(/\$\{scripts\}/g, scripts)
            .replaceAll(/\$\{styles\}/g, styles);

        for (const asset of general.assets) {
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

                    // First, check if the directory is excluded
                    const relPath = getRelativePath(resourceUri);
                    if (await isExcludedFromChat(relPath)) {
                        console.log(`File/folder ${relPath} is excluded from chat.`);
                        vscode.window.showInformationMessage(`File/folder ${relPath} is excluded from chat due to n8x.json configuration.`);
                        return; // Don't add to chat if excluded
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

                    // Check if the file/folder should be excluded based on n8x.json
                    if (await isExcludedFromChat(relPath)) {
                        console.log(`File/folder ${relPath} is excluded from chat.`);
                        vscode.window.showInformationMessage(`File/folder ${relPath} is excluded from chat due to n8x.json configuration.`);
                        return; // Don't add to chat if excluded
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

            // Check if the file/folder should be excluded based on n8x.json
            if (await isExcludedFromChat(relPath)) {
                console.log(`File/folder ${relPath} is excluded from chat.`);
                vscode.window.showInformationMessage(`File/folder ${relPath} is excluded from chat due to n8x.json configuration.`);
                return; // Don't add to chat if excluded
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
            "nabotx.diffCodeBlock",
            async () => {
                nabotxSidePanelProvider._diffCodeBlock('');
            }
        )
    );

    context.subscriptions.push(
        vscode.commands.registerCommand(
            "nabotx.undoCodeBlock",
            async () => {
                nabotxSidePanelProvider._undoCodeBlock();
            }
        )
    );
    
     context.subscriptions.push(
      vscode.commands.registerCommand(
          "nabotx.callGitDiscard",
          async () => {
              nabotxSidePanelProvider._callGitDiscard();
          }
      )
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

    checkConfiguration();
    vscode.workspace.onDidChangeConfiguration((event) => {
        if (
            event.affectsConfiguration("nabotx.path") ||
            event.affectsConfiguration("nabotx.token") ||
            event.affectsConfiguration("nabotx.model")
        ) {
            checkConfiguration();
        }
    });

    await handleN8xJson();
    await handleGitignore();
}

function deactivate() { }

module.exports = { activate, deactivate };