const vscode = require("vscode");

async function callGitDiscard() {
    try {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage("No workspace folder open.");
            return;
        }

        const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const terminal = vscode.window.createTerminal({
            name: 'Git Discard',
            cwd: workspaceFolder,
        });
        terminal.show();
        terminal.sendText('git restore .');

    } catch (error) {
        vscode.window.showErrorMessage(`Failed to discard changes: ${error.message}`);
    }
}

module.exports = { callGitDiscard };
