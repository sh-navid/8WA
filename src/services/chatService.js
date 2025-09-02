const { commentPath } = require("./../helpers/pathHelper");
const vscode = require("vscode");

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
}

module.exports = ChatService;
