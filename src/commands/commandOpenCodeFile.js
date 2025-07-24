const vscode = require("vscode");
const {
  getFileUriFromWorkspace,
  ensureFileExists,
  openFile,
} = require("../helpers/fileHelper");

async function openCodeFile(code) {
  const filePathMatch = code.match(/^.*?\[\[(.*?)\]\]/);
  if (!filePathMatch || !filePathMatch[1]) {
    return vscode.window.showErrorMessage(
      "File path not found in the code block."
    );
  }
  const filePath = filePathMatch[1].trim();
  const fileUri = getFileUriFromWorkspace(filePath);
  try {
    await ensureFileExists(fileUri);
    await openFile(fileUri);
  } catch (error) {
    vscode.window.showErrorMessage(
      `Error opening or creating file: ${error.message || error}`
    );
  }
}

module.exports = {
  openCodeFile,
};
