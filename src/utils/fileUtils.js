/**/
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

/**
 * Read a file from a VSCode URI.
 * @param {vscode.Uri} uri
 * @returns {Promise<{name: string, content: string}>}
 */
async function readFile(uri) {
  const content = await vscode.workspace.fs.readFile(uri);
  return {
    name: path.basename(uri.fsPath),
    content: Buffer.from(content).toString("utf8"),
  };
}

/**
 * Turn a workspace‐relative path into a VSCode URI (or absolute file URI).
 * @param {string} filePath
 * @returns {vscode.Uri}
 */
function getFileUriFromWorkspace(filePath) {
  if (vscode.workspace.workspaceFolders) {
    const workspaceFolder = vscode.workspace.workspaceFolders[0].uri;
    return vscode.Uri.joinPath(workspaceFolder, filePath);
  }
  return vscode.Uri.file(filePath);
}

/**
 * Ensure the file exists on disk (creating folders and an empty file if needed).
 * @param {vscode.Uri} fileUri
 */
async function ensureFileExists(fileUri) {
  try {
    await vscode.workspace.fs.stat(fileUri);
  } catch {
    const dirPath = path.dirname(fileUri.fsPath);
    fs.mkdirSync(dirPath, { recursive: true });
    await vscode.workspace.fs.writeFile(fileUri, new Uint8Array());
  }
}

/**
 * Open a text document and show it in the editor.
 * @param {vscode.Uri} fileUri
 */
async function openFile(fileUri) {
  const document = await vscode.workspace.openTextDocument(fileUri);
  await vscode.window.showTextDocument(document);
}

/**
 * Given a resource URI, return its path relative to the workspace root.
 * @param {vscode.Uri} resourceUri
 * @returns {string}
 */
function getRelativePath(resourceUri) {
  if (!vscode.workspace.workspaceFolders) {
    return "";
  }
  const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
  return resourceUri.fsPath.replace(`${workspaceFolder}/`, "");
}

/**
 * Recursively list all file system paths under a folder.
 * @param {string} folderPath
 * @returns {string[]} Array of absolute file paths
 */
function readDirectoryRecursively(folderPath) {
  let results = [];
  const list = fs.readdirSync(folderPath);
  for (const file of list) {
    const filePath = path.join(folderPath, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(readDirectoryRecursively(filePath));
    } else {
      results.push(filePath);
    }
  }
  return results;
}

module.exports = {
  readFile,
  getFileUriFromWorkspace,
  ensureFileExists,
  openFile,
  getRelativePath,
  readDirectoryRecursively,
};