const PanelProvider = require("./services/panelProvider");
const ChatService = require("./services/chatService");
const cnf = require("./../configs/config.json");
const vscode = require("vscode");
const {
  handleN8xJson,
  handleGitignore,
  checkConfiguration,
} = require("./helpers/fileSystemHelper");

let provider;

async function activate(context) {
  provider = new PanelProvider(context.extensionUri);
  const chatService = new ChatService(provider);

  ["nabotxSidePanelView", "nabotxActivityBarView"].forEach((viewId) => {
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(viewId, provider)
    );
  });

  Object.entries({
    "nabotx.openSettings": () =>
      vscode.commands.executeCommand("workbench.action.openSettings", "nabotx"),
    "nabotx.addFileToChat": async (uri) => await chatService.addFileToChat(uri),
    "nabotx.addToChat": () => chatService.addToChat(),
  }).forEach(([key, value]) => {
    context.subscriptions.push(vscode.commands.registerCommand(key, value));
  });

  checkConfiguration();
  vscode.workspace.onDidChangeConfiguration((event) => {
    if (cnf.settingsConfigKeys.some((key) => event.affectsConfiguration(key)))
      checkConfiguration();
  });

  await handleN8xJson();
  await handleGitignore();
}

function deactivate() {}

module.exports = { activate, deactivate };