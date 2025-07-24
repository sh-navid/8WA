/*[[src/commands/commandAddDirectoryContentsToChat.js]]*/
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const {
    readFile,
    getRelativePath
} = require('../helpers/fileHelper');

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
            const {
                content
            } = await readFile(fileUri);
            const relPath = getRelativePath(fileUri);
            await provider._addToChat(content, relPath);
        } catch (err) {
            console.error(`Error reading file ${filePath}: ${err.message}`);
        }
    }
}

module.exports = {
    addDirectoryContentsToChat
};
