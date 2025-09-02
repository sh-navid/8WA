const { readFile, getRelativePath } = require("./../helpers/fileHelper");
const { commentPath } = require("./../helpers/pathHelper");
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

class ChatService {
  constructor(provider) {
    this.provider = provider;
  }

  async addToChat() {
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
      return vscode.window.showInformationMessage("No workspace folder open.");
    }
    const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const relPath = editor.document.uri.fsPath.replace(
      workspaceFolder + "/",
      ""
    );
    await this.addTextToChat(selectedText, relPath);
  }

  async addTextToChat(selectedText, relativePath = "") {
    if (!this.provider._view) {
      console.warn("Webview is not yet resolved. Message not sent.");
      return;
    }
    if (!selectedText && !relativePath) {
      return vscode.window.showInformationMessage(
        "No file content or path provided."
      );
    }

    try {
      this.provider._view.webview.postMessage({
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

  async addDirToChat(folderPath, ignoredPaths) {
    const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;

    function isPathIgnored(filePath, ignoredPaths) {
      const normRelativePath = path
        .relative(workspaceFolder, filePath)
        .split(path.sep)
        .join("/")
        .toLowerCase();
      return ignoredPaths.some((ignored) => {
        const normIgnored = ignored
          .replace(/\\/g, "/")
          .replace(/\/+$/, "")
          .toLowerCase();
        return (
          normRelativePath === normIgnored ||
          normRelativePath.startsWith(normIgnored + "/")
        );
      });
    }

    async function* walk(dir, ignoredPaths) {
      try {
        const entries = await fs.promises.readdir(dir, {
          withFileTypes: true,
        });
        for (const entry of entries) {
          const filePath = path.join(dir, entry.name);
          if (isPathIgnored(filePath, ignoredPaths)) {
            continue;
          }
          if (entry.isDirectory()) {
            yield* walk(filePath, ignoredPaths);
          } else {
            yield filePath;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    const n8xIgnorePattern = /\.n8x\..*$/i;

    for await (const filePath of walk(folderPath, ignoredPaths)) {
      if (n8xIgnorePattern.test(filePath)) {
        continue; // Skip *.n8x.* files
      }
      try {
        const fileUri = vscode.Uri.file(filePath);
        const { content } = await readFile(fileUri);
        const relPath = getRelativePath(fileUri);
        await this.addTextToChat(content, relPath);
      } catch (err) {
        console.error(`Error reading file ${filePath}: ${err.message}`);
      }
    }
  }
}

module.exports = ChatService;
