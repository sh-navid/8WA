const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { commentPath } = require('./utils/pathUtils');
const {
  readFile,
  getFileUriFromWorkspace,
  ensureFileExists,
  openFile,
  getRelativePath,
  readDirectoryRecursively
} = require('./utils/fileUtils');
const { removeCommentStructure } = require('./utils/codeUtils');

class NaBotXSidePanelProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri;
    this._view = null;
  }

  async resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };
    webviewView.webview.onDidReceiveMessage(this._handleMessage.bind(this, webviewView));
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
  }

  async _handleMessage(webviewView, message) {
    switch (message.command) {
      case 'openCodeFile':
        await this._openCodeFile(message.code);
        break;
      case 'appendToActiveFile':
        await this._appendToActiveFile(message.code);
        break;
      case 'replaceActiveFile':
        await this._replaceActiveFile(message.code);
        break;
      case 'copyCodeBlock':
        await this._copyCodeBlock(message.code);
        break;
      case 'addToChat':
        await this._addToChat(message.selectedText);
        break;
    }
  }

  async _openCodeFile(code) {
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

  async _appendToActiveFile(code) {
    code = removeCommentStructure(code);
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const doc = editor.document;
      const pos = doc.lineAt(doc.lineCount - 1).range.end;
      await editor.edit(eb => eb.insert(pos, '\n' + code));
    } else {
      vscode.window.showErrorMessage('No active file to append code to.');
    }
  }

  async _replaceActiveFile(code) {
    code = removeCommentStructure(code);
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

  async _copyCodeBlock(code) {
    code = removeCommentStructure(code);
    await vscode.env.clipboard.writeText(code);
  }

  async _addToChat(selectedText, relativePath = '') {
    if (!this._view) {
      console.warn('Webview is not yet resolved. Message not sent.');
      return;
    }
    if (!selectedText && !relativePath) {
      return vscode.window.showInformationMessage('No file content or path provided.');
    }
    try {
      this._view.webview.postMessage({
        command: 'addTextToChat',
        path: relativePath,
        text: commentPath(relativePath, '[[' + relativePath + ']]') + '\n' + selectedText
      });
    } catch (err) {
      vscode.window.showErrorMessage(`Error adding text to chat: ${err.message}`);
      console.error('Error adding text to chat:', err);
    }
  }

  _getHtmlForWebview(webview) {
    let html = load(this, 'views', 'panel.html');
    const tabView = load(this, 'views', 'tab.html');
    const defaultConfig = { path: '', token: '', model: '' };
    const configuration = vscode.workspace.getConfiguration('nabotx');
    const pathValue = configuration.get('path') || defaultConfig.path;
    const tokenValue = configuration.get('token') || defaultConfig.token;
    const modelValue = configuration.get('model') || defaultConfig.model;
    const general = load(this, 'configs', 'general.config.json', true);

    const scripts = general.scripts
      .map(x => `<script src="${x.startsWith('~/') ? uri(webview, this, 'src', x.slice(2)) : x}"></script>`)
      .join('');
    const styles = general.styles
      .map(x => `<link href="${x.startsWith('~/') ? uri(webview, this, 'styles', x.slice(2)) : x}" rel="stylesheet"/>`)
      .join('');

    html = html
      .replaceAll(/\$\{tabView\}/g, tabView)
      .replaceAll(/\$\{path\}/g, pathValue)
      .replaceAll(/\$\{token\}/g, tokenValue)
      .replaceAll(/\$\{model\}/g, modelValue)
      .replaceAll(/\$\{rules\}/g, general.rules.assistant)
      .replaceAll(/\$\{scripts\}/g, scripts)
      .replaceAll(/\$\{styles\}/g, styles);

    for (const asset of general.assets) {
      html = html.replaceAll(
        new RegExp(`\\$\\{${asset.slice(2)}\\}`, 'g'),
        uri(webview, this, 'assets', asset.slice(2))
      );
    }

    return html;
  }
}

const join = (provider, dir, fileName) =>
  path.join(provider._extensionUri.fsPath, dir, fileName);

const load = (provider, dir, fileName, json = false) => {
  const _path = join(provider, dir, fileName);
  try {
    return json
      ? JSON.parse(fs.readFileSync(_path, 'utf8'))
      : fs.readFileSync(_path, 'utf8');
  } catch (error) {
    console.error(`Error loading file ${_path}: ${error.message}`);
    return json ? {} : '';
  }
};

const uri = (webview, provider, dir, fileName) =>
  webview.asWebviewUri(vscode.Uri.joinPath(provider._extensionUri, dir, fileName));

let nabotxSidePanelProvider;

function activate(context) {
  nabotxSidePanelProvider = new NaBotXSidePanelProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.commands.registerCommand('nabotx.openSettings', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'nabotx');
    })
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('nabotxSidePanelView', nabotxSidePanelProvider)
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('nabotxActivityBarView', nabotxSidePanelProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nabotx.openPanel', () => {
      vscode.commands.executeCommand('workbench.view.extension.nabotxSidePanel');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nabotx.addToChatExplorer', async resourceUri => {
      if (!resourceUri) {
        return vscode.window.showInformationMessage('No file or folder selected.');
      }
      let stats;
      try {
        stats = fs.statSync(resourceUri.fsPath);
      } catch (err) {
        return vscode.window.showErrorMessage(`Error accessing resource: ${err.message}`);
      }
      if (stats.isDirectory()) {
        await addDirectoryContentsToChat(nabotxSidePanelProvider, resourceUri.fsPath);
      } else {
        const doc = await vscode.workspace.openTextDocument(resourceUri);
        const fileContent = doc.getText();
        const relPath = getRelativePath(resourceUri);
        nabotxSidePanelProvider._addToChat(fileContent, relPath);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('nabotx.addToChat', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return vscode.window.showInformationMessage('No active editor.');
      }
      let selectedText = editor.selection
        ? editor.document.getText(editor.selection)
        : '';
      if (!selectedText) {
        selectedText = editor.document.getText();
        if (!selectedText) {
          return vscode.window.showInformationMessage('The active file is empty.');
        }
      }
      if (!vscode.workspace.workspaceFolders) {
        return vscode.window.showInformationMessage('No workspace folder open.');
      }
      const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
      const relPath = editor.document.uri.fsPath.replace(workspaceFolder + '/', '');
      nabotxSidePanelProvider._addToChat(selectedText, relPath);
    })
  );

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(rocket) NaBotX';
  statusBarItem.tooltip = 'NaBotX';
  statusBarItem.command = 'nabotx.openPanel';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  checkConfiguration();
  vscode.workspace.onDidChangeConfiguration(event => {
    if (
      event.affectsConfiguration('nabotx.path') ||
      event.affectsConfiguration('nabotx.token') ||
      event.affectsConfiguration('nabotx.model')
    ) {
      checkConfiguration();
    }
  });
}

function deactivate() {}

function checkConfiguration() {
  const configuration = vscode.workspace.getConfiguration('nabotx');
  const pathVal = configuration.get('path') || '';
  const token = configuration.get('token') || '';
  const model = configuration.get('model') || '';

  if (!pathVal || !token || !model) {
    vscode.window
      .showWarningMessage(
        'NaBotX: Please configure the extension settings (path, token, model) for the extension to work properly.',
        'Open Settings'
      )
      .then(selection => {
        if (selection === 'Open Settings') {
          vscode.commands.executeCommand('workbench.action.openSettings', 'nabotx');
        }
      });
  }
}

async function addDirectoryContentsToChat(provider, folderPath) {
  const files = readDirectoryRecursively(folderPath);
  for (const filePath of files) {
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

module.exports = { activate, deactivate };