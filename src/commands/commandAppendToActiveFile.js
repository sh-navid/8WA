const vscode = require("vscode");

async function appendToActiveFile(code) {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const doc = editor.document;
    const pos = doc.lineAt(doc.lineCount - 1).range.end;
    await editor.edit((eb) => eb.insert(pos, "\n" + code));
  } else {
    vscode.window.showErrorMessage("No active file to append code to.");
  }
}

module.exports = {
  appendToActiveFile,
};
