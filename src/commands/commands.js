const { appendToActiveFile } = require("./commandAppendToActiveFile");
const { replaceActiveFile } = require("./commandReplaceActiveFile");
const { sendToTerminal } = require("./commandSendToTerminal");
const { copyCodeBlock } = require("./commandCopyCodeBlock");
const { openCodeFile } = require("./commandOpenCodeFile");

module.exports = {
  appendToActiveFile,
  replaceActiveFile,
  sendToTerminal,
  copyCodeBlock,
  openCodeFile,
};
