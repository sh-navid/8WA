function removeCommentStructure(code) {
  // Patterns to remove lines fully consisting of comments
  const fullLineComments = [
    /^\s*\/\/\s*\[\[.*?\]\]\s*$/gm,                 // // [[...]]
    /^\s*#\s*\[\[.*?\]\]\s*$/gm,                    // # [[...]]
    /^\s*--\s*\[\[.*?\]\]\s*$/gm,                   // -- [[...]]
    /^\s*"""\[\[.*?\]\]"""\s*$/gm,                  // """[[...]]]"""
    /^\s*'''\[\[.*?\]\]'''\s*$/gm,                  // '''[[...]]]'''
    /^\s*\/\*\s*\[\[.*?\]\]\s*\*\/\s*$/gm,          // /* [[...]] */
    /^\s*<!--\s*\[\[[\s\S]*?\]\]\s*-->\s*$/gm,      // <!-- [[...]] -->
  ];

  // Patterns to remove inline comments but preserve preceding code
  const inlineCommentPatterns = [
    /(.*?)\/\/\s*\[\[.*?\]\]\s*;?$/gm,              // code // [[...]]
    /(.*?)\/\*\*\s*\[\[.*?\]\]\s*\*+\/\s*;?$/gm,    // code /** [[...]] **/
    /(.*?)\/\*\s*\[\[.*?\]\]\s*\*+\/\s*;?$/gm,      // code /* [[...]] */
    /(.*?)<!--\s*\[\[[\s\S]*?\]\]\s*-->\s*;?$/gm,   // code <!-- [[...]] -->
  ];

  // Remove full line comment-only lines
  for (const pattern of fullLineComments) {
    code = code.replace(pattern, '').trim();
  }

  // Remove inline comments preserving code before comment
  for (const pattern of inlineCommentPatterns) {
    code = code.replace(pattern, (_, codeBefore) => codeBefore.trim());
  }

  return code;
}

module.exports = { removeCommentStructure };