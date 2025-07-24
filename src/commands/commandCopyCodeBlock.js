/*[[src/commands/commandCopyCodeBlock.js]]*/
const vscode = require('vscode');

async function copyCodeBlock(code) {
    await vscode.env.clipboard.writeText(code);
}

module.exports = {
    copyCodeBlock
};
