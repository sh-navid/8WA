const vscode = require("vscode");

async function replaceActiveFile(code) {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const doc = editor.document;
    const fullRange = new vscode.Range(
      doc.positionAt(0),
      doc.positionAt(doc.getText().length)
    );
    await editor.edit((eb) => eb.replace(fullRange, code));
    // Save the document after replacing the content
    await doc.save();
  } else {
    vscode.window.showErrorMessage("No active file to replace content.");
  }
}

module.exports = {
  replaceActiveFile,
};
