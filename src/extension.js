/* */
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const os = require('os'); // Required for temporary file path if no workspace
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
            case "buildProjectStructure":
                await this._buildProjectStructure(webviewView);
                break;
            case "diffCodeBlock":
                await this._diffCodeBlock(message.code);
                break;
        }
    }

    async _openCodeFile(code) {
        await openCodeFile(code);
    }

    async _cloneAndModifyActiveFile(code, modifyFunction) {
        if (!vscode.window.activeTextEditor) {
            vscode.window.showErrorMessage("No active text editor found.");
            return;
        }

        const activeEditor = vscode.window.activeTextEditor;
        const document = activeEditor.document;
        const originalFilePath = document.uri.fsPath;
        const fileExtension = path.extname(originalFilePath);
        const fileName = path.basename(originalFilePath, fileExtension);
        const cloneFilePath = path.join(
            path.dirname(originalFilePath),
            `${fileName}.clone${fileExtension}`
        );

        try {
            // Create a clone of the current file
            await fs.promises.copyFile(originalFilePath, cloneFilePath);

            // Apply the modification function (append or replace)
            const modifiedCode = removeCommentStructure(code);
            await modifyFunction(modifiedCode);

        } catch (error) {
            vscode.window.showErrorMessage(
                `Error cloning/modifying file: ${error.message}`
            );
            console.error("Error cloning file:", error);
        }
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
        if (!vscode.workspace.workspaceFolders) {
            webviewView.webview.postMessage({
                command: "receiveProjectStructure",
                structure: "No workspace folder open.",
            });
            return;
        }

        const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const ignoredPaths = [".git", "node_modules", "obj", "bin", ".gradle", "gradle", "build"];

        // Returns a promise with the formatted structure.
        async function buildDirectoryStructure(
            folderPath,
            ignoredPaths,
            prefix = "",
            isRoot = true
        ) {
            let structure = "";
            let entries;
            try {
                entries = await fs.promises.readdir(folderPath, {
                    withFileTypes: true,
                });
            } catch (error) {
                return `Error reading directory: ${error}`;
            }
            // Sort: directories first, then files, each alphabetically
            entries.sort((a, b) => {
                if (a.isDirectory() === b.isDirectory()) {
                    return a.name.localeCompare(b.name);
                }
                return a.isDirectory() ? -1 : 1;
            });

            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                const filePath = path.join(folderPath, entry.name);

                // Ignore specified paths
                const normRelativePath = path
                    .relative(workspaceFolder, filePath)
                    .split(path.sep)
                    .join("/")
                    .toLowerCase();
                const shouldIgnore = ignoredPaths.some((ignored) => {
                    const normIgnored = ignored
                        .replace(/\\/g, "/")
                        .replace(/\/+$/, "")
                        .toLowerCase();
                    return (
                        normRelativePath === normIgnored ||
                        normRelativePath.startsWith(normIgnored + "/")
                    );
                });

                if (shouldIgnore) {
                    continue;
                }

                // ├─ for all except last, └─ for last
                // For nested, use |   or space
                const isLast = i === entries.length - 1;
                const pointer = isRoot
                    ? isLast
                        ? "└─ "
                        : "├─ "
                    : isLast
                        ? "└─ "
                        : "├─ ";

                structure += prefix + pointer + entry.name + "\n";

                if (entry.isDirectory()) {
                    const nextPrefix = prefix + (isLast ? "    " : "|   ");
                    structure += await buildDirectoryStructure(
                        filePath,
                        ignoredPaths,
                        nextPrefix,
                        false
                    );
                }
            }
            return structure;
        }

        try {
            let projectStructure = `Project Structure:\n${await buildDirectoryStructure(
                workspaceFolder,
                ignoredPaths
            )}`;
            webviewView.webview.postMessage({
                command: "receiveProjectStructure",
                structure: projectStructure,
            });
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to build project structure: ${error.message}`
            );
        }
    }

    async _diffCodeBlock(code) {
        code = removeCommentStructure(code);
        if (!vscode.window.activeTextEditor) {
            vscode.window.showErrorMessage("No active text editor found.");
            return;
        }

        const activeEditor = vscode.window.activeTextEditor;
        const document = activeEditor.document;
        const originalFilePath = document.uri.fsPath;
        const fileExtension = path.extname(originalFilePath);
        const fileName = path.basename(originalFilePath, fileExtension);
        const cloneFilePath = path.join(
            path.dirname(originalFilePath),
            `${fileName}.clone${fileExtension}`
        );


        if (!fs.existsSync(cloneFilePath)) {
            vscode.window.showErrorMessage('Clone file not found. Please append or replace file first.');
            return;
        }

        try {
            // Open the diff view
            const originalFileUri = vscode.Uri.file(originalFilePath);
            const cloneFileUri = vscode.Uri.file(cloneFilePath);

            try {
                await vscode.commands.executeCommand(
                    'vscode.diff',
                    cloneFileUri,
                    originalFileUri,
                    'Diff NaBotX Code'
                );
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to show diff view: ${error.message}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to show diff view: ${error.message}`);
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

const join = (provider, dir, fileName) =>
    path.join(provider._extensionUri.fsPath, dir, fileName);

const load = (provider, dir, fileName, json = false) => {
    const _path = join(provider, dir, fileName);
    try {
        return json
            ? JSON.parse(fs.readFileSync(_path, "utf8"))
            : fs.readFileSync(_path, "utf8");
    } catch (error) {
        console.error(`Error loading file ${_path}: ${error.message}`);
        return json ? {} : "";
    }
};

const uri = (webview, provider, dir, fileName) =>
    webview.asWebviewUri(
        vscode.Uri.joinPath(provider._extensionUri, dir, fileName)
    );

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
                    const workspaceFolder =
                        vscode.workspace.workspaceFolders[0].uri.fsPath;
                    const ignoredPaths = [".git", "node_modules", "obj", "bin"];
                    await addDirectoryContentsToChat(
                        nabotxSidePanelProvider,
                        resourceUri.fsPath,
                        ignoredPaths
                    );
                } else {
                    const doc = await vscode.workspace.openTextDocument(resourceUri);
                    const fileContent = doc.getText();
                    const relPath = getRelativePath(resourceUri);
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
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return vscode.window.showInformationMessage("No active editor.");
                }
                // let selectedText = editor.selection
                //   ? editor.document.getText(editor.selection)
                //   : "";
                // if (!selectedText) {
                //   selectedText = editor.document.getText();
                //   if (!selectedText) {
                //     return vscode.window.showInformationMessage(
                //       "The active file is empty."
                //     );
                //   }
                // }
                nabotxSidePanelProvider._diffCodeBlock('');
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

    // Check if n8x.json exists in the workspace root, and create it if it doesn't
    if (vscode.workspace.workspaceFolders) {
        const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const n8xJsonPath = path.join(workspaceFolder, "n8x.json");

        try {
            await fs.promises.access(n8xJsonPath, fs.constants.F_OK);
            console.log("n8x.json already exists.");
            // If n8x.json exists, check if it contains "tasks", if not, add it with an empty array
            const n8xJsonContent = JSON.parse(await fs.promises.readFile(n8xJsonPath, 'utf8'));
            if (!n8xJsonContent.hasOwnProperty("tasks")) {
                n8xJsonContent.tasks = [];
                await fs.promises.writeFile(n8xJsonPath, JSON.stringify(n8xJsonContent, null, 2));
                console.log('Added "tasks" to n8x.json.');
            }
        } catch (e) {
            // File doesn't exist, create it
            const defaultN8xConfig = {
                tasks: []
            };
            try {
                await fs.promises.writeFile(
                    n8xJsonPath,
                    JSON.stringify(defaultN8xConfig, null, 2)
                );
                console.log("n8x.json created.");
            } catch (err) {
                vscode.window.showErrorMessage(
                    `Failed to create n8x.json: ${err.message}`
                );
            }
        }
    } else {
        console.warn("No workspace folder open.");
    }
}

function deactivate() { }

function checkConfiguration() {
    const configuration = vscode.workspace.getConfiguration("nabotx");
    const pathVal = configuration.get("path") || "";
    const token = configuration.get("token") || "";
    const model = configuration.get("model") || "";

    if (!pathVal || !token || !model) {
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

module.exports = { activate, deactivate };