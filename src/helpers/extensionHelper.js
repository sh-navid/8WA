const { removeCommentStructure } = require("./codeHelper");
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

async function buildProjectStructure(webviewView) {
  if (!vscode.workspace.workspaceFolders) {
    webviewView.webview.postMessage({
      command: "receiveProjectStructure",
      structure: "No workspace folder open.",
    });
    return;
  }

  const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const n8xJsonPath = path.join(workspaceFolder, "n8x.json");
  let excludeFromChat = [];

  try {
    await fs.promises.access(n8xJsonPath, fs.constants.F_OK);
    const n8xJsonContent = JSON.parse(
      await fs.promises.readFile(n8xJsonPath, "utf8")
    );
    if (
      n8xJsonContent.excludeFromChat &&
      Array.isArray(n8xJsonContent.excludeFromChat)
    ) {
      excludeFromChat = n8xJsonContent.excludeFromChat;
    }
  } catch (e) {}

  const ignoredPaths = [
    ".git",
    "node_modules",
    "obj",
    "bin",
    ".gradle",
    "gradle",
    "build",
  ];

  async function buildDirectoryStructure(
    folderPath,
    ignoredPaths,
    excludeFromChat,
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
    entries.sort((a, b) => {
      if (a.isDirectory() === b.isDirectory()) {
        return a.name.localeCompare(b.name);
      }
      return a.isDirectory() ? -1 : 1;
    });

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const filePath = path.join(folderPath, entry.name);

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

      const shouldExcludeFromChat = excludeFromChat.some((excludedPath) => {
        const normalizedExcludedPath = excludedPath
          .replace(/\\/g, "/")
          .replace(/^\//, "")
          .toLowerCase();
        if (_isRegex(normalizedExcludedPath)) {
          const regex = new RegExp(normalizedExcludedPath);
          return regex.test(normRelativePath);
        } else {
          return (
            normRelativePath === normalizedExcludedPath ||
            normRelativePath.startsWith(normalizedExcludedPath + "/")
          );
        }
      });

      if (shouldIgnore || shouldExcludeFromChat) {
        continue;
      }

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
          excludeFromChat,
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
      ignoredPaths,
      excludeFromChat
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

function _isRegex(str) {
  try {
    new RegExp(str);
    return true;
  } catch (e) {
    return false;
  }
}

async function cloneAndModifyActiveFile(code, modifyFunction, provider) {
  if (!vscode.window.activeTextEditor) {
    vscode.window.showErrorMessage("No active text editor found.");
    return;
  }

  const activeEditor = vscode.window.activeTextEditor;
  const document = activeEditor.document;
  const originalFilePath = document.uri.fsPath;
  const fileExtension = path.extname(originalFilePath);
  const fileName = path.basename(originalFilePath, fileExtension);
  provider._backupFilePath = path.join(
    path.dirname(originalFilePath),
    `${fileName}.n8x${fileExtension}`
  );

  try {
    await fs.promises.copyFile(originalFilePath, provider._backupFilePath);

    const modifiedCode = removeCommentStructure(code);
    await modifyFunction(modifiedCode);

    await document.save();
  } catch (error) {
    vscode.window.showErrorMessage(
      `Error cloning/modifying file: ${error.message}`
    );
    console.error("Error cloning file:", error);
  }
}

async function diffCodeBlock(code, provider) {
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
    `${fileName}.n8x${fileExtension}`
  );

  if (!fs.existsSync(cloneFilePath)) {
    vscode.window.showErrorMessage(
      "Clone file not found. Please append or replace file first."
    );
    return;
  }

  try {
    // Open the diff view
    const originalFileUri = vscode.Uri.file(originalFilePath);
    const cloneFileUri = vscode.Uri.file(cloneFilePath);

    try {
      await vscode.commands.executeCommand(
        "vscode.diff",
        cloneFileUri,
        originalFileUri,
        "Diff NaBotX Code"
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to show diff view: ${error.message}`
      );
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to show diff view: ${error.message}`
    );
  }
}

async function undoCodeBlock(provider) {
  if (!vscode.window.activeTextEditor) {
    vscode.window.showErrorMessage("No active text editor found.");
    return;
  }

  if (!provider._backupFilePath) {
    vscode.window.showErrorMessage(
      "No .n8x backup file found for this file. Ensure you have appended or replaced code first."
    );
    return;
  }

  const activeEditor = vscode.window.activeTextEditor;
  const document = activeEditor.document;
  const originalFilePath = document.uri.fsPath;

  try {
    const backupContent = await fs.promises.readFile(
      provider._backupFilePath,
      "utf8"
    );

    await fs.promises.writeFile(originalFilePath, backupContent);

    await vscode.commands.executeCommand(
      "vscode.open",
      vscode.Uri.file(originalFilePath)
    );

    vscode.window.showInformationMessage(
      "File successfully restored from .n8x backup."
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to restore file from backup: ${error.message}`
    );
  }
}

module.exports = {
  cloneAndModifyActiveFile,
  buildProjectStructure,
  diffCodeBlock,
  undoCodeBlock,
};
