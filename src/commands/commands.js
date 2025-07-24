const { appendToActiveFile } = require("./commandAppendToActiveFile");
const { replaceActiveFile } = require("./commandReplaceActiveFile");
const { copyCodeBlock } = require("./commandCopyCodeBlock");
const { openCodeFile } = require("./commandOpenCodeFile");
const {
  addDirectoryContentsToChat,
} = require("./commandAddDirectoryContentsToChat");

module.exports = {
  addDirectoryContentsToChat,
  appendToActiveFile,
  replaceActiveFile,
  copyCodeBlock,
  openCodeFile,
};
