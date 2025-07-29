const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const os = require('os');

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

      const ensurePropertyExists = async (obj, property, defaultValue) => {
        if (!obj.hasOwnProperty(property)) {
          obj[property] = defaultValue;
          return true;
        }
        return false;
      };

      let modified = false;

      if (await ensurePropertyExists(n8xJsonContent, "tasks", [])) {
        modified = true;
        console.log('Added "tasks" to n8x.json.');
      }

      if (await ensurePropertyExists(n8xJsonContent, "story", [])) {
        modified = true;
        console.log('Added "story" to n8x.json.');
      }

      if (await ensurePropertyExists(n8xJsonContent, "prefrences", {})) {
        modified = true;
        console.log('Added "prefrences" to n8x.json.');
      }

      if (await ensurePropertyExists(n8xJsonContent, "excludeFromChat", [])) {
        modified = true;
        console.log('Added "excludeFromChat" to n8x.json.');
      }

      if (!n8xJsonContent.prefrences.hasOwnProperty("os")) {
        n8xJsonContent.prefrences["os"] = os.platform();
        modified = true;
        console.log('Added "os" to n8x.json preferences.');
      }

      if (!n8xJsonContent.prefrences.hasOwnProperty("stack")) {
        n8xJsonContent.prefrences["stack"] = "";
        modified = true;
        console.log('Added "stack" to n8x.json preferences.');
      }

      if (modified) {
        await fs.promises.writeFile(n8xJsonPath, JSON.stringify(n8xJsonContent, null, 2));
      }

    } catch (e) {
      const defaultN8xConfig = {
        tasks: [],
        prefrences: {
          os: os.platform(),
          stack: ""
        },
        excludeFromChat: []
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
    const n8xIgnoreEntry = ["*.n8x.*",".n8x"];

    try {
      await fs.promises.access(gitignorePath, fs.constants.F_OK);
      const gitignoreContent = (await fs.promises.readFile(gitignorePath, 'utf8')).trim();
      const gitignoreLines = gitignoreContent.split('\n').map(line => line.trim());

      let allEntriesExist = true;
      for (const entry of n8xIgnoreEntry) {
        if (!gitignoreLines.includes(entry)) {
          allEntriesExist = false;
          break;
        }
      }

      if (!allEntriesExist) {
        await fs.promises.appendFile(gitignorePath, `\n${n8xIgnoreEntry.join('\n')}\n`);
        console.log("Added *.n8x.* to .gitignore");
      } else {
        console.log("*.n8x.* already in .gitignore");
      }
    } catch (e) {
      try {
        await fs.promises.writeFile(gitignorePath, `${n8xIgnoreEntry.join('\n')}\n`);
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
