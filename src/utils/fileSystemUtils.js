const vscode = require("vscode");
const path = require("path");
const fs = require("fs");

const join = (provider, dir, fileName) =>
  path.join(provider._extensionUri.fsPath, dir, fileName);

const load = (provider, dir, fileName, json = false) => {
  const _path = join(provider, dir, fileName);
  try {
    return json
      ? JSON.parse(fs.readFileSync(_path, "utf8"))
      : fs.readFileSync(_path, "utf8");
  } catch (error) {
    console.error(`Error loading file ${_path}: ${error.message}`);
    return json ? {} : "";
  }
};

const uri = (webview, provider, dir, fileName) =>
  webview.asWebviewUri(
    vscode.Uri.joinPath(provider._extensionUri, dir, fileName)
  );

function checkConfiguration() {
  const configuration = vscode.workspace.getConfiguration("nabotx");
  const pathVal = configuration.get("path") || "";
  const token = configuration.get("token") || "";
  const model = configuration.get("model") || "";

  if (!pathVal || !token || !model) {
    vscode.window
      .showWarningMessage(
        "NaBotX: Please configure the extension settings (path, token, model) for the extension to work properly.",
        "Open Settings"
      )
      .then((selection) => {
        if (selection === "Open Settings") {
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "nabotx"
          );
        }
      });
  }
}

async function handleN8xJson() {
  if (vscode.workspace.workspaceFolders) {
    const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const n8xJsonPath = path.join(workspaceFolder, "n8x.json");

    try {
      await fs.promises.access(n8xJsonPath, fs.constants.F_OK);
      console.log("n8x.json already exists.");
      const n8xJsonContent = JSON.parse(await fs.promises.readFile(n8xJsonPath, 'utf8'));
      if (!n8xJsonContent.hasOwnProperty("tasks")) {
        n8xJsonContent.tasks = [];
        await fs.promises.writeFile(n8xJsonPath, JSON.stringify(n8xJsonContent, null, 2));
        console.log('Added "tasks" to n8x.json.');
      }
    } catch (e) {
      const defaultN8xConfig = {
        tasks: []
      };
      try {
        await fs.promises.writeFile(
          n8xJsonPath,
          JSON.stringify(defaultN8xConfig, null, 2)
        );
        console.log("n8x.json created.");
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to create n8x.json: ${err.message}`
        );
      }
    }
  } else {
    console.warn("No workspace folder open.");
  }
}

async function handleGitignore() {
  if (vscode.workspace.workspaceFolders) {
    const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const gitignorePath = path.join(workspaceFolder, ".gitignore");
    const n8xIgnoreEntry = "*.n8x.*";

    try {
      await fs.promises.access(gitignorePath, fs.constants.F_OK);
      const gitignoreContent = (await fs.promises.readFile(gitignorePath, 'utf8')).trim();
      if (!gitignoreContent.split('\n').map(line => line.trim()).includes(n8xIgnoreEntry)) {
        await fs.promises.appendFile(gitignorePath, `\n${n8xIgnoreEntry}\n`);
        console.log("Added *.n8x.* to .gitignore");
      } else {
        console.log("*.n8x.* already in .gitignore");
      }
    } catch (e) {
      try {
        await fs.promises.writeFile(gitignorePath, `${n8xIgnoreEntry}\n`);
        console.log(".gitignore created with *.n8x.*");
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to create .gitignore: ${err.message}`);
      }
    }
  } else {
    console.warn("No workspace folder open.");
  }
}

module.exports = {
  join,
  load,
  uri,
  checkConfiguration,
  handleN8xJson,
  handleGitignore
};