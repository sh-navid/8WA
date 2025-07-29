const vscode = require("vscode");

async function sendToTerminal(code) {
  try {
         if (!vscode.workspace.workspaceFolders) {
             vscode.window.showErrorMessage("No workspace folder open.");
             return;
         }
 
         const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
         const terminal = vscode.window.createTerminal({
             name: 'Run Command',
             cwd: workspaceFolder,
         });
         terminal.show();
         terminal.sendText(code);
 
     } catch (error) {
         vscode.window.showErrorMessage(`Failed to copy command in terminal: ${error.message}`);
     }
}

module.exports = {
  sendToTerminal,
};
