const { appendToActiveFile } = require("./commandAppendToActiveFile");
const { replaceActiveFile } = require("./commandReplaceActiveFile");
const { sendToTerminal } = require("./commandSendToTerminal");
const { copyCodeBlock } = require("./commandCopyCodeBlock");
const { openCodeFile } = require("./commandOpenCodeFile");
const {
  addDirectoryContentsToChat,
} = require("./commandAddDirectoryContentsToChat");

module.exports = {
  addDirectoryContentsToChat,
  appendToActiveFile,
  replaceActiveFile,
  sendToTerminal,
  copyCodeBlock,
  openCodeFile,
};
