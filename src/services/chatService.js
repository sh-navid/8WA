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
      return vscode.window.showInformationMessage(
        "No workspace folder open."
      );
    }
    const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const relPath = editor.document.uri.fsPath.replace(
      workspaceFolder + "/",
      ""
    );
    this.provider._addToChat(selectedText, relPath);
  }
}

module.exports = ChatService;
