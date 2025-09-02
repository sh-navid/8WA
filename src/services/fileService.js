const { removeCommentStructure } = require("../helpers/codeHelper");
const { replaceActiveFile } = require("../commands/commands");
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

class FileService {
  async cloneAndModifyActiveFile(code, modifyFunction) {
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

  async replaceActiveFile(code) {
    await this.cloneAndModifyActiveFile(code, async (modifiedCode) => {
      await replaceActiveFile(modifiedCode);
    });
  }

  async replaceCodeFileSilently(code) {
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
}

module.exports = FileService;