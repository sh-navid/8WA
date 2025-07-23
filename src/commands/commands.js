const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const {
  readFile,
  getFileUriFromWorkspace,
  ensureFileExists,
  openFile,
  getRelativePath
} = require('../helpers/fileHelper');

async function openCodeFile(code) {
  const filePathMatch = code.match(/^.*?\[\[(.*?)\]\]/);
  if (!filePathMatch || !filePathMatch[1]) {
    return vscode.window.showErrorMessage('File path not found in the code block.');
  }
  const filePath = filePathMatch[1].trim();
  const fileUri = getFileUriFromWorkspace(filePath);
  try {
    await ensureFileExists(fileUri);
    await openFile(fileUri);
  } catch (error) {
    vscode.window.showErrorMessage(`Error opening or creating file: ${error.message || error}`);
  }
}

async function appendToActiveFile(code) {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const doc = editor.document;
    const pos = doc.lineAt(doc.lineCount - 1).range.end;
    await editor.edit(eb => eb.insert(pos, '\n' + code));
  } else {
    vscode.window.showErrorMessage('No active file to append code to.');
  }
}

async function replaceActiveFile(code) {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const doc = editor.document;
    const fullRange = new vscode.Range(
      doc.positionAt(0),
      doc.positionAt(doc.getText().length)
    );
    await editor.edit(eb => eb.replace(fullRange, code));
  } else {
    vscode.window.showErrorMessage('No active file to replace content.');
  }
}

async function copyCodeBlock(code) {
  await vscode.env.clipboard.writeText(code);
}

async function addDirectoryContentsToChat(provider, folderPath, ignoredPaths) {
  const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;

  function isPathIgnored(filePath, ignoredPaths) {
    const normRelativePath = path.relative(workspaceFolder, filePath).split(path.sep).join('/').toLowerCase();
    return ignoredPaths.some(ignored => {
      const normIgnored = ignored.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
      return (
        normRelativePath === normIgnored ||
        normRelativePath.startsWith(normIgnored + '/')
      );
    });
  }

  async function* walk(dir, ignoredPaths) {
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
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
      await provider._addToChat(content, relPath);
    } catch (err) {
      console.error(`Error reading file ${filePath}: ${err.message}`);
    }
  }
}

module.exports = {
  openCodeFile,
  appendToActiveFile,
  replaceActiveFile,
  copyCodeBlock,
  addDirectoryContentsToChat
};